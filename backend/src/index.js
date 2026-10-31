import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "./loadEnv.js";
import express from "express";
import cors from "cors";
import multer from "multer";
import {
  askQuestion,
  deleteDocument,
  ingestFile,
  listDocuments,
  stats,
} from "./rag/pipeline.js";
import { evaluateRetrieval, optimizeRetrieval } from "./rag/eval.js";
import {
  appendTurn,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
} from "./rag/conversations.js";

const app = express();
const port = process.env.PORT || 4000;
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist"
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

app.use(
  cors({
    origin: ["http://localhost:5174", "http://127.0.0.1:5174"],
  })
);
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const s = await stats();
  res.json({ ok: true, name: "DevMind", ...s });
});

app.get("/api/documents", async (_req, res) => {
  res.json(await listDocuments());
});

app.post("/api/documents", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const doc = await ingestFile(req.file);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

app.delete("/api/documents/:id", async (req, res) => {
  await deleteDocument(req.params.id);
  res.json({ ok: true });
});

app.get("/api/conversations", async (_req, res) => {
  res.json(await listConversations());
});

app.post("/api/conversations", async (_req, res) => {
  res.status(201).json(await createConversation());
});

app.get("/api/conversations/:id", async (req, res) => {
  const conversation = await getConversation(req.params.id);
  if (!conversation) return res.status(404).json({ error: "Chat not found" });
  res.json(conversation);
});

app.patch("/api/conversations/:id", async (req, res) => {
  const conversation = await updateConversation(req.params.id, req.body || {});
  if (!conversation) return res.status(404).json({ error: "Chat not found" });
  res.json(conversation);
});

app.delete("/api/conversations/:id", async (req, res) => {
  await deleteConversation(req.params.id);
  res.json({ ok: true });
});

app.post("/api/conversations/:id/messages", async (req, res) => {
  try {
    const { question, mode = "rag" } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const existing = await getConversation(req.params.id);
    if (!existing) return res.status(404).json({ error: "Chat not found" });

    const history = existing.messages.map((m) => ({ role: m.role, text: m.text }));
    const result = await askQuestion(question.trim(), mode, history, {
      docId: req.body.docId || "",
    });
    const conversation = await appendTurn(req.params.id, {
      question: question.trim(),
      answer: result.answer,
      sources: result.sources,
      mode: result.mode,
      latencyMs: result.latencyMs,
    });

    res.json({ ...result, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Ask failed" });
  }
});

app.post("/api/eval", async (_req, res) => {
  try {
    const report = await evaluateRetrieval();
    if (!report.questions) {
      return res.status(400).json({ error: "Upload a document before checking retrieval." });
    }
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Eval failed" });
  }
});

app.post("/api/optimize", async (_req, res) => {
  try {
    const result = await optimizeRetrieval();
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Optimize failed" });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question, mode = "rag" } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
    }
    const result = await askQuestion(question.trim(), mode);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Ask failed" });
  }
});

if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  const key = process.env.GEMINI_API_KEY?.trim() ?? "";
  const keyHint = key.startsWith("AQ.")
    ? "AQ auth key (AI Studio)"
    : key.startsWith("AIza")
      ? "AIza standard key"
      : key
        ? "custom key format"
        : "missing";
  console.log(`DevMind running on http://localhost:${port}`);
  console.log(`Gemini key: ${key ? keyHint : "NOT SET — add GEMINI_API_KEY to .env"}`);
});
