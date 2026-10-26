import pdfParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { v4 as uuidv4 } from "uuid";
import { embedText } from "./embeddings.js";
import { geminiGenerate, hasGeminiKey } from "./gemini.js";
import {
  addDocument,
  deleteDocument,
  listDocuments,
  searchSimilar,
  stats,
} from "./store.js";
import { rerank } from "./rerank.js";
import { trimHistory, trimSources } from "./context.js";
import { getRetrievalSettings } from "./retrievalSettings.js";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 900,
  chunkOverlap: 150,
});

export async function ingestFile({ originalname, buffer, mimetype }) {
  let text = "";

  if (mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    text = parsed.text || "";
  } else {
    text = buffer.toString("utf8");
  }

  text = text.replace(/\s+/g, " ").trim();
  if (!text || text.length < 30) {
    throw new Error("Could not extract enough text from this file.");
  }

  const chunks = await splitter.splitText(text);
  const docId = uuidv4();
  const chunksWithEmbeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    chunksWithEmbeddings.push({ index: i, text: chunks[i], embedding });
  }

  const docMeta = {
    id: docId,
    name: originalname,
    uploadedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    charCount: text.length,
  };

  await addDocument(docMeta, chunksWithEmbeddings);
  return docMeta;
}

function buildContext(sources) {
  return sources
    .map(
      (s, i) =>
        `[Source ${i + 1}: ${s.docName}, chunk ${s.chunkIndex + 1}, score ${s.score.toFixed(3)}]\n${s.text}`
    )
    .join("\n\n---\n\n");
}

function firstSentence(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const cut = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  return cut.length > 180 ? `${cut.slice(0, 177)}…` : cut;
}

function fallbackAnswer(question, sources, mode) {
  if (mode === "baseline") {
    return (
      "Gemini could not be reached right now. Your **AQ.** API key is valid — try again in a minute, or restart the backend."
    );
  }

  if (!sources?.length) {
    return "No documents indexed yet. Upload PDFs in **Library** first, then ask again.";
  }

  const docNames = [...new Set(sources.map((s) => s.docName))];
  const wantsBullets = /bullet|summarize|summary|points|list/i.test(question);
  const bulletLines = sources.slice(0, 3).map((s, i) => {
    const bit = firstSentence(s.text);
    return `${i + 1}. ${bit} [Source ${i + 1}]`;
  });

  if (wantsBullets) {
    return (
      `**Summary from ${docNames.join(", ")}**\n\n` +
      `${bulletLines.join("\n")}\n\n` +
      `*Gemini was busy — this is a retrieval-based summary. For richer wording, send again shortly.*`
    );
  }

  const highlights = sources.slice(0, 2).map((s) => {
    const snippet = firstSentence(s.text);
    return `- **${s.docName}** — ${snippet}`;
  });

  return (
    `From **${docNames.join(", ")}**:\n\n` +
    `${highlights.join("\n")}\n\n` +
    `*Expand **Sources** below for full excerpts. If Gemini is overloaded, retry in a minute for a fluent answer.*`
  );
}

function documentFilter(question, documents, docId) {
  if (docId) {
    const selected = documents.find((doc) => doc.id === docId);
    return selected ? { docId: selected.id, docName: selected.name } : { docId };
  }

  const asked = question.toLowerCase();
  const named = documents.find((doc) => {
    const stem = doc.name.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
    return stem.length > 3 && asked.includes(stem);
  });
  return named ? { docId: named.id, docName: named.name } : {};
}

async function generateAnswer(question, context, mode, sources, history) {
  const trimmedHistory = trimHistory(history).history;

  if (!hasGeminiKey()) {
    return fallbackAnswer(question, sources, mode);
  }

  try {
    if (mode === "baseline") {
      return await geminiGenerate({
        system:
          "You are DocMind, a helpful assistant. Answer clearly and concisely. Use earlier messages in this chat when the user asks a follow-up.",
        user: question,
        history: trimmedHistory,
      });
    }

    return await geminiGenerate({
      system: `You are DocMind, a document-grounded research assistant.
Answer using the retrieved context below. If the user asks a follow-up, also use the earlier chat.
If the documents do not contain the answer, say so.
Cite sources inline like [Source 1], [Source 2] when used.

CONTEXT:
${context || "(no documents indexed yet)"}`,
      user: question,
      history: trimmedHistory,
    });
  } catch (err) {
    console.warn("Gemini chat unavailable:", err.message);
    return fallbackAnswer(question, sources, mode);
  }
}

export async function askQuestion(question, mode = "rag", history = [], options = {}) {
  const start = Date.now();
  let sources = [];
  let filter = {};

  if (mode === "rag") {
    const documents = await listDocuments();
    const settings = await getRetrievalSettings();
    filter = documentFilter(question, documents, options.docId);
    const recent = history
      .filter((m) => m.role === "user")
      .slice(-2)
      .map((m) => m.text)
      .join(" ");
    const retrievalQuery = `${recent} ${question}`.trim().slice(0, 1200);
    const queryEmbedding = await embedText(retrievalQuery);
    const candidates = await searchSimilar(queryEmbedding, settings.candidateCount, filter);
    const reranked = rerank(retrievalQuery, candidates, settings.topK, settings.lexicalWeight);
    sources = trimSources(reranked).sources;
  }

  const context = buildContext(sources);
  const answer = await generateAnswer(question, context, mode, sources, history);
  const latencyMs = Date.now() - start;

  return {
    answer,
    mode,
    latencyMs,
    filter: filter.docName || null,
    sources: sources.map((s) => ({
      docName: s.docName,
      chunkIndex: s.chunkIndex,
      score: Number(s.score.toFixed(4)),
      excerpt: s.text.slice(0, 280) + (s.text.length > 280 ? "…" : ""),
    })),
  };
}

export { listDocuments, deleteDocument, stats };
