# DocMind

**DocMind** is a document-grounded Q&A system for PDFs and text files. It implements a **Retrieval-Augmented Generation (RAG)** pipeline: ingest documents, split them into passages, embed and index them, retrieve the most relevant context for each question, and generate answers with **citations**.

Built as a full-stack NLP/LLM demo with a modern React UI and an Express API.

---

## Features

- **PDF & text upload** — Library tab; supports `.pdf`, `.txt`, `.md`
- **RAG mode** — Retrieve passages from your corpus, then answer with Gemini using that context
- **Baseline mode** — Same LLM **without** document retrieval (for comparison)
- **Citations panel** — Retrieved passages shown beside the chat (file, passage index, relevance)
- **Persistent index** — Document metadata and vectors stored on disk under `backend/data/`
- **Embedding fallback** — Local MiniLM embeddings if Gemini embeddings are temporarily unavailable

---

## How it works

```
Upload PDF → extract text → chunk (~900 chars, overlap)
    → embed each passage → store vectors
Question → embed query → cosine similarity → top-k passages
    → prompt Gemini with context → answer + citations
```

| Step | Implementation |
|------|----------------|
| Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Embeddings | Google Gemini (`gemini-embedding-001`) or local `@xenova/transformers` |
| Vector store | JSON-backed store with cosine similarity (`backend/src/rag/store.js`) |
| Generation | Google `@google/genai` SDK (`gemini-flash-latest` with model fallbacks) |

### RAG vs Baseline

- **RAG** — Uses only retrieved document passages + citations. Best for questions about **your** files.
- **Baseline** — Direct LLM call with no retrieval. Useful to compare hallucination vs grounded answers in reports and demos.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 19, Vite, Tailwind CSS 4, React Markdown |
| Backend | Node.js, Express, Multer, pdf-parse |
| AI | Google Gemini API (AI Studio keys, including `AQ.` auth keys) |
| NLP utilities | LangChain text splitters, optional local embeddings |

---

## Prerequisites

- **Node.js** 20+ (24 recommended)
- **Google AI Studio API key** — [Create a key](https://aistudio.google.com/api-keys)  
  New keys may start with `AQ.` (auth key) or `AIzaSy…` (legacy). DocMind uses the official **`@google/genai`** SDK, which supports both.

---

## Setup

### 1. Backend environment

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=4000
```

Do not commit `.env` to git.

### 2. Install dependencies

**Backend:**

```bash
cd docmind/backend
npm install
```

**Frontend:**

```bash
cd docmind/frontend
npm install
```

### 3. Run

Terminal 1 — API (port **4000**):

```bash
cd docmind/backend
npm start
```

You should see `Gemini key: AQ auth key (AI Studio)` or similar when the key is loaded.

Terminal 2 — UI (port **5174**):

```bash
cd docmind/frontend
npm run dev
```

Open **http://localhost:5174**

---

## Using the app

1. **Library** — Upload PDFs (e.g. sample files in the parent `NLP` folder).
2. **Chat → RAG** — Ask questions about your documents; read the answer in the center and **Citations** on the right.
3. **Chat → Baseline** — Ask the same question without retrieval to compare behavior.
4. **Compare** — Short reference table for reports and viva.

**Tips**

- After changing `GEMINI_API_KEY` or embedding settings, **restart the backend** and **re-upload** PDFs so passages use one consistent embedding model.
- If Gemini returns “high demand” (503), retry after a minute; the app may show a retrieval-based summary until the model responds.

---

## API (local)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Status, document count, passage count |
| GET | `/api/documents` | List indexed documents |
| POST | `/api/documents` | Upload file (`multipart/form-data`, field `file`) |
| DELETE | `/api/documents/:id` | Remove document and its vectors |
| POST | `/api/ask` | Body: `{ "question": "...", "mode": "rag" \| "baseline" }` |

---

## Project structure

```
docmind/
├── backend/
│   ├── .env                 # GEMINI_API_KEY (not in git)
│   ├── data/                # Indexed documents + vectors (generated)
│   └── src/
│       ├── index.js         # Express server
│       └── rag/
│           ├── pipeline.js  # Ingest, ask, RAG logic
│           ├── gemini.js    # Gemini chat + embed
│           ├── embeddings.js
│           └── store.js     # Vector storage + search
└── frontend/
    └── src/
        ├── App.jsx
        └── components/      # Chat, citations, avatar
```

---

## Production build (frontend)

```bash
cd docmind/frontend
npm run build
npm run preview
```

The backend can serve `frontend/dist` if configured for deployment; default dev setup uses Vite on 5174 and API on 4000.

---

## License

Academic / project use — adjust as needed for your institution.
