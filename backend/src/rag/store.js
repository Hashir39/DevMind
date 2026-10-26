import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");
const DOCS_FILE = path.join(DATA_DIR, "documents.json");
const VECTORS_FILE = path.join(DATA_DIR, "vectors.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export async function loadStore() {
  await ensureDataDir();
  let documents = [];
  let vectors = [];
  try {
    documents = JSON.parse(await fs.readFile(DOCS_FILE, "utf8"));
    vectors = JSON.parse(await fs.readFile(VECTORS_FILE, "utf8"));
  } catch {
    documents = [];
    vectors = [];
  }
  return { documents, vectors };
}

async function persist(documents, vectors) {
  await ensureDataDir();
  await fs.writeFile(DOCS_FILE, JSON.stringify(documents, null, 2));
  await fs.writeFile(VECTORS_FILE, JSON.stringify(vectors));
}

export async function addDocument(docMeta, chunksWithEmbeddings) {
  const { documents, vectors } = await loadStore();
  documents.unshift(docMeta);
  for (const chunk of chunksWithEmbeddings) {
    vectors.push({
      docId: docMeta.id,
      docName: docMeta.name,
      uploadedAt: docMeta.uploadedAt,
      chunkIndex: chunk.index,
      text: chunk.text,
      charCount: chunk.text.length,
      embedding: chunk.embedding,
    });
  }
  await persist(documents, vectors);
  return docMeta;
}

export async function listDocuments() {
  const { documents } = await loadStore();
  return documents;
}

export async function deleteDocument(docId) {
  const { documents, vectors } = await loadStore();
  const nextDocs = documents.filter((d) => d.id !== docId);
  const nextVectors = vectors.filter((v) => v.docId !== docId);
  await persist(nextDocs, nextVectors);
}

export function filterVectors(vectors, documents, filter = {}) {
  const uploadedAt = new Map(documents.map((doc) => [doc.id, doc.uploadedAt]));
  return vectors
    .map((vector) => ({
      ...vector,
      uploadedAt: vector.uploadedAt || uploadedAt.get(vector.docId) || null,
    }))
    .filter((vector) => {
      if (filter.docId && vector.docId !== filter.docId) return false;
      if (filter.docName && vector.docName !== filter.docName) return false;
      return true;
    });
}

export async function searchSimilar(queryEmbedding, k = 4, filter = {}) {
  const { documents, vectors } = await loadStore();
  const pool = filterVectors(vectors, documents, filter);
  if (!pool.length || !queryEmbedding?.length) return [];

  const scored = pool
    .filter((vector) => vector.embedding?.length === queryEmbedding.length)
    .map((vector) => ({
      ...vector,
      score: cosineSimilarity(queryEmbedding, vector.embedding),
    }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export async function stats() {
  const { documents, vectors } = await loadStore();
  return {
    documentCount: documents.length,
    chunkCount: vectors.length,
  };
}
