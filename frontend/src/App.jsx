import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import CitationsPanel from "./components/CitationsPanel";
import DocMindAvatar from "./components/DocMindAvatar";
import {
  ask,
  getHealth,
  listDocuments,
  removeDocument,
  uploadDocument,
} from "./api";

const NAV = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "library", label: "Library", icon: "📁" },
  { id: "compare", label: "Compare", icon: "⚖️" },
];

export default function App() {
  const [view, setView] = useState("chat");
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({ documentCount: 0, chunkCount: 0 });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to **DocMind**. Upload PDFs in **Library**, then ask questions here. I'll answer using your documents and show citations on the right.",
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("rag");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(true);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [health, documents] = await Promise.all([
        getHealth(),
        listDocuments(),
      ]);
      setStats({
        documentCount: health.documentCount ?? 0,
        chunkCount: health.chunkCount ?? 0,
      });
      setDocs(documents);
      setError("");
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setError("Backend offline — run `npm start` in docmind/backend (port 4000).");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeSources = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.meta?.sources?.length) {
        return m.meta.sources;
      }
    }
    return [];
  }, [messages]);

  const onAsk = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await ask(q, mode);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.answer,
          meta: { latencyMs: res.latencyMs, mode: res.mode, sources: res.sources },
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of list) {
        await uploadDocument(file);
      }
      await refresh();
      setView("chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(124,108,255,0.12),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.06),transparent_45%)]" />

      {/* Sidebar */}
      <aside className="relative z-10 flex w-[260px] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-lg font-bold text-zinc-950">
            D
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">DocMind</p>
            <p className="text-[11px] text-zinc-500">PDF Q&A · RAG</p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                view === item.id
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-2 gap-2 px-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Docs</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stats.documentCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Passages</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stats.chunkCount}</p>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Your files
          </p>
          {docs.length === 0 ? (
            <p className="px-1 text-xs text-zinc-600">No PDFs indexed yet</p>
          ) : (
            <ul className="space-y-1">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg px-2 py-2 text-xs text-zinc-400 hover:bg-zinc-900"
                  title={d.name}
                >
                  <span className="block truncate font-medium text-zinc-300">{d.name}</span>
                  <span className="text-zinc-600">{d.chunkCount} passages</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-800/80 p-3">
          <div
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
              apiOnline ? "text-emerald-400/90" : "text-red-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${apiOnline ? "bg-emerald-400" : "bg-red-400"}`} />
            {apiOnline ? "API connected" : "API offline"}
          </div>
        </div>
      </aside>

      {/* Main + citations */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {view === "chat" && (
            <>
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 px-6 py-4">
                <div>
                  <h1 className="font-display text-xl font-semibold text-zinc-100">Chat</h1>
                  <p className="text-xs text-zinc-500">Grounded answers from your documents</p>
                </div>
                <div className="flex rounded-full border border-zinc-800 bg-zinc-900/80 p-1">
                  {[
                    { id: "rag", label: "RAG" },
                    { id: "baseline", label: "Baseline" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                        mode === m.id
                          ? "bg-violet-600 text-white shadow"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </header>

              {error && (
                <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-2xl space-y-6">
                  {messages.map((msg, i) => (
                    <ChatMessage
                      key={i}
                      msg={msg}
                      isLast={i === messages.length - 1 && !loading}
                    />
                  ))}
                  {loading && (
                    <div className="flex gap-3 animate-fade-up">
                      <DocMindAvatar className="mt-0.5" />
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/80 p-4 backdrop-blur-md">
                <form
                  onSubmit={onAsk}
                  className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2 shadow-xl shadow-black/20 focus-within:border-violet-500/40"
                >
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onAsk(e);
                      }
                    }}
                    placeholder={
                      mode === "rag"
                        ? "Ask about your documents…"
                        : "Ask anything (no document context)…"
                    }
                    className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
                <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-zinc-600">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}

          {view === "library" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
              <header className="mb-6">
                <h1 className="font-display text-2xl font-semibold">Library</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Upload PDFs — we split them into searchable passages for RAG.
                </p>
              </header>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                className={`mb-8 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-16 text-center transition ${
                  drag
                    ? "border-cyan-400/60 bg-cyan-500/5"
                    : "border-zinc-700 bg-zinc-900/30 hover:border-violet-500/40 hover:bg-zinc-900/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  onFiles(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-2xl">
                  ↑
                </div>
                <h2 className="text-lg font-medium">Drop files here</h2>
                <p className="mt-2 text-sm text-zinc-500">PDF, TXT, or Markdown</p>
                <button
                  type="button"
                  className="mt-6 rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                  disabled={uploading}
                >
                  {uploading ? "Indexing…" : "Browse files"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  multiple
                  hidden
                  onChange={(e) => onFiles(e.target.files)}
                />
              </div>

              <div className="space-y-3">
                {docs.map((d) => (
                  <article
                    key={d.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-zinc-200">{d.name}</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {d.chunkCount} passages · {d.charCount?.toLocaleString()} characters
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeDocument(d.id);
                        refresh();
                      }}
                      className="shrink-0 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}

          {view === "compare" && (
            <div className="overflow-y-auto p-6">
              <header className="mb-6">
                <h1 className="font-display text-2xl font-semibold">RAG vs Baseline</h1>
                <p className="mt-1 max-w-xl text-sm text-zinc-500">
                  Ask the same question twice in Chat — once with RAG and once with Baseline.
                </p>
              </header>
              <div className="overflow-hidden rounded-2xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Aspect</th>
                      <th className="px-4 py-3">Baseline</th>
                      <th className="px-4 py-3">RAG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {[
                      ["Context", "LLM only", "Your PDF passages"],
                      ["Citations", "None", "Side panel"],
                      ["Best for", "General topics", "Your documents"],
                      ["Hallucination", "Higher on facts", "Lower when source exists"],
                    ].map(([a, b, c]) => (
                      <tr key={a} className="bg-zinc-950/40">
                        <td className="px-4 py-3 font-medium text-zinc-300">{a}</td>
                        <td className="px-4 py-3 text-zinc-500">{b}</td>
                        <td className="px-4 py-3 text-violet-300/90">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {view === "chat" && (
          <CitationsPanel sources={activeSources} visible={activeSources.length > 0} />
        )}
      </div>
    </div>
  );
}
