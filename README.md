# DocMind

DocMind is a document question-answering app. You upload a PDF, ask a question, and get an answer grounded in that file, with the matching passages shown beside the chat.

It is a full-stack NLP project built around **retrieval-augmented generation (RAG)**. A large language model writes the answer. Search, storage, and scoring run on the machine that hosts the app.

---

## Features

- Upload PDF, TXT, or Markdown in **Library**
- **RAG** answers from retrieved passages, with citations
- **Baseline** asks the same model with no documents, for comparison
- Chat history with follow-up questions, rename, pin, and delete
- Filter search to one document
- Local rerank of retrieved passages
- Prompt trimming so the model call stays small
- **Compare** page with recall and precision, computed locally

---

## How the LLM is used

Gemini is the only large language model. It is called once per question.

1. **Ingest.** Extract text from the file, split it into passages of about 900 characters with 150 characters of overlap, embed each passage, and save the vectors.
2. **Retrieve.** Embed the question (plus the last two user messages for follow-ups). Rank passages with cosine similarity. A local word-overlap step reorders them. The best few passages are kept.
3. **Generate.** Those passages, the system instruction, and recent chat turns are sent to Gemini. The model must answer from that context and cite sources as `[Source 1]`.
4. **Baseline.** The same Gemini call is made with no passages attached.

Chat models, tried in order if one is busy: `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-flash-lite-latest`, `gemini-3.8-flash`.

Embeddings use `gemini-embedding-001`. If that call fails, a local MiniLM model (`Xenova/all-MiniLM-L6-v2`) creates the vectors instead. Passages and questions must use the same embedding model, so re-upload files after an embedding change.

| Step | Where it lives |
|------|----------------|
| Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Embeddings | `backend/src/rag/embeddings.js` |
| Vector store | JSON files and cosine similarity in `backend/src/rag/store.js` |
| Rerank, filter | `backend/src/rag/rerank.js` |
| Context limit | `backend/src/rag/context.js` |
| Generation | `backend/src/rag/gemini.js` |
| Recall / precision | `backend/src/rag/eval.js` (no Gemini call) |

---

## API key

One key only.

| Name | What it is |
|------|------------|
| `GEMINI_API_KEY` | Google AI Studio key, in `backend/.env` |

The server reads it at startup. It is not written in source code and `.env` is gitignored. There is no OpenAI key, no login provider, and no database password.

---

## Offline behavior

The UI and API run on localhost. A normal written answer needs the internet, because Gemini is a hosted model.

These parts do not call Gemini:

- Saving and listing documents and chats (JSON files under `backend/data/`)
- Splitting text, cosine search, rerank, and the document filter
- The retrieval check and local tune on the Compare page

If the key is missing or Gemini cannot be reached, the app still returns short excerpts from the retrieved passages. That is a search fallback, not a model-written answer.

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 19, Vite, Tailwind CSS 4 |
| Backend | Node.js, Express, Multer, pdf-parse |
| LLM | Google Gemini through `@google/genai` |
| NLP | LangChain text splitter, local MiniLM embeddings |

---

## Setup

Node.js 20 or newer. Create a key at [Google AI Studio](https://aistudio.google.com/api-keys).

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=4000
```

Install and run the API:

```bash
cd docmind/backend
npm install
npm start
```

Install and run the UI:

```bash
cd docmind/frontend
npm install
npm run dev
```

Open http://localhost:5174. The API listens on port 4000.

---

## Demo flow

1. **Library** — upload a PDF and wait until it is indexed.
2. **Chat** — leave the mode on RAG and ask a question about that file. Citations appear on the right.
3. Switch to **Baseline** and ask the same question to show the difference.
4. Open an older chat in the sidebar and ask a follow-up.
5. **Compare** — click **Check retrieval**. Recall is how often the right passage was in the top results. Precision is how many of those results were actually relevant. This check uses 0 Gemini tokens.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Document and passage counts |
| GET | `/api/documents` | List indexed files |
| POST | `/api/documents` | Upload (`multipart` field `file`) |
| DELETE | `/api/documents/:id` | Remove a file and its vectors |
| GET | `/api/conversations` | List chats |
| POST | `/api/conversations` | Start a chat |
| GET | `/api/conversations/:id` | Load one chat |
| PATCH | `/api/conversations/:id` | Rename or pin |
| DELETE | `/api/conversations/:id` | Delete a chat |
| POST | `/api/conversations/:id/messages` | Ask in a chat. Body: `{ question, mode, docId }` |
| POST | `/api/eval` | Local recall and precision |
| POST | `/api/optimize` | Pick top-K from those local scores |
| POST | `/api/ask` | One-off question, no saved chat |

`mode` is `rag` or `baseline`.

---

## Project structure

```
docmind/
├── backend/
│   ├── .env
│   ├── data/                 # documents, vectors, chats (generated)
│   └── src/
│       ├── index.js
│       └── rag/
│           ├── pipeline.js
│           ├── gemini.js
│           ├── embeddings.js
│           ├── store.js
│           ├── rerank.js
│           ├── context.js
│           ├── eval.js
│           ├── conversations.js
│           └── retrievalSettings.js
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
```

---

## Frontend production build

```bash
cd docmind/frontend
npm run build
npm run preview
```
