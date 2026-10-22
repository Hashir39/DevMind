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

const app = express();
const port = process.env.PORT || 4000;
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
  res.json({ ok: true, name: "DocMind", ...s });
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

app.listen(port, () => {
  const key = process.env.GEMINI_API_KEY?.trim() ?? "";
  const keyHint = key.startsWith("AQ.")
    ? "AQ auth key (AI Studio)"
    : key.startsWith("AIza")
      ? "AIza standard key"
      : key
        ? "custom key format"
        : "missing";
  console.log(`DocMind API running on http://localhost:${port}`);
  console.log(`Gemini key: ${key ? keyHint : "NOT SET — add GEMINI_API_KEY to .env"}`);
});
