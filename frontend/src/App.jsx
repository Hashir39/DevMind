import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import CitationsPanel from "./components/CitationsPanel";
import DocMindAvatar from "./components/DocMindAvatar";
import DocMindMark from "./components/DocMindMark";
import Sidebar from "./components/Sidebar";
import {
  createConversation,
  deleteConversation,
  getConversation,
  updateConversation,
  getHealth,
  listConversations,
  evaluateRetrieval,
  listDocuments,
  optimizeRetrieval,
  removeDocument,
  sendMessage,
  uploadDocument,
} from "./api";

const WELCOME = {
  role: "assistant",
  text: "Welcome to **DevMind**. Start a chat, upload PDFs in **Library**, then ask follow-up questions in the same thread. Past chats stay in the sidebar.",
};

function toUiMessages(conversation) {
  if (!conversation?.messages?.length) return [WELCOME];
  return conversation.messages.map((m) => ({
    role: m.role,
    text: m.text,
    meta:
      m.role === "assistant"
        ? { latencyMs: m.latencyMs, mode: m.mode, sources: m.sources || [] }
        : undefined,
  }));
}

export default function App() {
  const [view, setView] = useState("chat");
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({ documentCount: 0, chunkCount: 0 });
  const [messages, setMessages] = useState([WELCOME]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("rag");
  const [docId, setDocId] = useState("");
  const [evalReport, setEvalReport] = useState(null);
  const [tuneReport, setTuneReport] = useState(null);
  const [evalBusy, setEvalBusy] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [health, documents, conversations] = await Promise.all([
        getHealth(),
        listDocuments(),
        listConversations(),
      ]);
      setStats({
        documentCount: health.documentCount ?? 0,
        chunkCount: health.chunkCount ?? 0,
      });
      setDocs(documents);
      setChats(Array.isArray(conversations) ? conversations : []);
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

  const openChat = async (id) => {
    const conversation = await getConversation(id);
    setActiveChatId(id);
    setMessages(toUiMessages(conversation));
    setView("chat");
    setNavOpen(false);
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([WELCOME]);
    setView("chat");
  };

  const removeChat = async (id) => {
    await deleteConversation(id);
    if (activeChatId === id) startNewChat();
    refresh();
  };

  const renameChat = async (id, title) => {
    await updateConversation(id, { title });
    refresh();
  };

  const pinChat = async (id, pinned) => {
    await updateConversation(id, { pinned });
    refresh();
  };

  const onAsk = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m.filter((msg) => msg !== WELCOME), { role: "user", text: q }]);
    setLoading(true);
    try {
      let chatId = activeChatId;
      if (!chatId) {
        const created = await createConversation();
        chatId = created.id;
        setActiveChatId(chatId);
      }
      const res = await sendMessage(chatId, q, mode, docId);
      setMessages(toUiMessages(res.conversation));
      refresh();
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

  const activeTitle = chats.find((c) => c.id === activeChatId)?.title || "New chat";
  const mobileLabel =
    view === "library" ? "Library" : view === "compare" ? "Compare" : activeTitle;

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#09090b]">

      <Sidebar
        view={view}
        setView={setView}
        stats={stats}
        chats={chats}
        activeChatId={activeChatId}
        apiOnline={apiOnline}
        mobileOpen={navOpen}
        onClose={() => setNavOpen(false)}
        onNewChat={startNewChat}
        onOpenChat={openChat}
        onDeleteChat={removeChat}
        onRenameChat={renameChat}
        onPinChat={pinChat}
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#0c0c0e] px-3 py-2.5 md:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-xl border border-white/10 p-2 text-white"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <DocMindMark className="h-8 w-8" />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-none text-white">DevMind</p>
            <p className="mt-1 truncate text-[11px] text-[#a1a1aa]">{mobileLabel}</p>
          </div>
        </div>

      {/* Main + citations */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {view === "chat" && (
            <>
              <header className="flex shrink-0 flex-col gap-3 border-b border-white/8 bg-[#09090b]/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h1 className="font-display truncate text-lg font-semibold text-white sm:text-xl">
                    {activeTitle}
                  </h1>
                  <p className="text-xs text-[#a1a1aa]">Follow-ups stay in this conversation</p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
                    <select
                      value={docId}
                      onChange={(e) => setDocId(e.target.value)}
                      className="h-9 w-full cursor-pointer appearance-none truncate overflow-hidden rounded-full border border-white/10 bg-[#161618] py-0 pl-3 pr-8 text-xs leading-8 text-[#e4e4e7] scheme-dark focus:border-[#7c5cfc]/60 focus:outline-none"
                      aria-label="Search in"
                    >
                      <option value="">All documents</option>
                      {docs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#a1a1aa]"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                <div className="flex h-9 shrink-0 items-center rounded-full border border-white/10 bg-[#161618] p-1">
                  {[
                    { id: "rag", label: "RAG" },
                    { id: "baseline", label: "Baseline" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition sm:px-4 ${
                        mode === m.id
                          ? "bg-[#7c5cfc] text-white shadow-[0_0_16px_rgba(124,92,252,0.35)]"
                          : "text-[#a1a1aa] hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                </div>
              </header>

              {error && (
                <div className="mx-3 mt-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200 sm:mx-6">
                  {error}
                </div>
              )}

              <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
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
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/8 bg-[#161618] px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#a1a1aa] [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#a1a1aa] [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#a1a1aa]" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="shrink-0 border-t border-white/8 bg-[#09090b] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
                <form
                  onSubmit={onAsk}
                  className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-white/10 bg-[#161618] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] focus-within:border-[#7c5cfc]/60"
                >
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onAsk(e);
                      }
                    }}
                    placeholder={
                      mode === "rag" ? "Ask about your documents…" : "Ask anything…"
                    }
                    className="composer-input max-h-32 min-h-[44px] w-full flex-1 resize-none overflow-hidden bg-transparent px-3 py-2.5 text-sm leading-5 text-[#f4f4f5] placeholder:text-[#71717a] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="shrink-0 rounded-xl bg-[#7c5cfc] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6d4ef0] disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}

          {view === "library" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
              <header className="mb-6">
                <h1 className="font-display text-2xl font-semibold text-white">Library</h1>
                <p className="mt-1 text-sm text-[#a1a1aa]">
                  Upload PDFs — we split them into searchable passages for RAG.
                </p>
              </header>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                className={`mb-8 cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition sm:px-6 sm:py-16 ${
                  drag
                    ? "border-[#7c5cfc] bg-[#7c5cfc]/10"
                    : "border-white/12 bg-[#161618] hover:border-[#7c5cfc]/50"
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
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/6 text-2xl text-white">
                  ↑
                </div>
                <h2 className="text-lg font-medium text-white">Drop files here</h2>
                <p className="mt-2 text-sm text-[#a1a1aa]">PDF, TXT, or Markdown</p>
                <button
                  type="button"
                  className="mt-6 rounded-full border border-white/12 bg-[#1c1c21] px-5 py-2 text-sm text-[#e4e4e7] hover:bg-white/8"
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
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-[#161618] p-4"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-white">{d.name}</h3>
                      <p className="mt-1 text-xs text-[#a1a1aa]">
                        {d.chunkCount} passages · {d.charCount?.toLocaleString()} characters
                        {d.uploadedAt
                          ? ` · ${new Date(d.uploadedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                          : ""}
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
            <div className="overflow-y-auto p-4 sm:p-6">
              <header className="mb-6">
                <h1 className="font-display text-2xl font-semibold text-white">RAG vs Baseline</h1>
                <p className="mt-1 max-w-xl text-sm text-[#a1a1aa]">
                  Ask the same question twice in Chat — once with RAG and once with Baseline.
                </p>
              </header>
              <div className="space-y-3 md:hidden">
                {[
                  ["Context", "LLM only", "Your PDF passages"],
                  ["Citations", "None", "Side panel"],
                  ["Best for", "General topics", "Your documents"],
                  ["Hallucination", "Higher on facts", "Lower when source exists"],
                ].map(([aspect, baseline, rag]) => (
                  <article key={aspect} className="rounded-2xl border border-white/8 bg-[#161618] p-4">
                    <h2 className="text-sm font-medium text-white">{aspect}</h2>
                    <p className="mt-2 text-xs text-[#a1a1aa]">
                      Baseline <span className="text-[#e4e4e7]">{baseline}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#a1a1aa]">
                      RAG <span className="text-[#c4b5fd]">{rag}</span>
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-2xl border border-white/8 bg-[#161618] md:block">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead className="bg-white/4 text-left text-xs uppercase tracking-wider text-[#a1a1aa]">
                    <tr>
                      <th className="px-4 py-3">Aspect</th>
                      <th className="px-4 py-3">Baseline</th>
                      <th className="px-4 py-3">RAG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {[
                      ["Context", "LLM only", "Your PDF passages"],
                      ["Citations", "None", "Side panel"],
                      ["Best for", "General topics", "Your documents"],
                      ["Hallucination", "Higher on facts", "Lower when source exists"],
                    ].map(([a, b, c]) => (
                      <tr key={a}>
                        <td className="px-4 py-3 font-medium text-white">{a}</td>
                        <td className="px-4 py-3 text-[#a1a1aa]">{b}</td>
                        <td className="px-4 py-3 text-[#c4b5fd]">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <section className="mt-6 max-w-2xl rounded-2xl border border-white/8 bg-[#161618] p-5">
                <h2 className="text-sm font-semibold text-white">Retrieval check</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#a1a1aa]">
                  Scores how often the right passage is found. This runs on your computer and does not call Gemini.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(evalBusy)}
                    onClick={async () => {
                      setEvalBusy("check");
                      setError("");
                      try {
                        setEvalReport(await evaluateRetrieval());
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setEvalBusy("");
                      }
                    }}
                    className="rounded-full bg-[#7c5cfc] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d4ef0] disabled:opacity-40"
                  >
                    {evalBusy === "check" ? "Checking…" : "Check retrieval"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(evalBusy)}
                    onClick={async () => {
                      setEvalBusy("tune");
                      setError("");
                      try {
                        setTuneReport(await optimizeRetrieval());
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setEvalBusy("");
                      }
                    }}
                    className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-[#e4e4e7] hover:bg-white/6 disabled:opacity-40"
                  >
                    {evalBusy === "tune" ? "Tuning…" : "Tune locally"}
                  </button>
                </div>
                {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
                {evalReport && (
                  <p className="mt-4 text-sm text-[#e4e4e7]">
                    Recall {Math.round(evalReport.recall * 100)}% · Precision{" "}
                    {Math.round(evalReport.precision * 100)}% · {evalReport.questions} questions · 0 tokens
                  </p>
                )}
                {tuneReport && (
                  <p className="mt-2 text-sm text-[#c4b5fd]">
                    Using top {tuneReport.settings.topK} passages. Recall{" "}
                    {Math.round(tuneReport.recall * 100)}% · Precision{" "}
                    {Math.round(tuneReport.precision * 100)}%.
                  </p>
                )}
              </section>
            </div>
          )}
        </main>

        {view === "chat" && (
          <CitationsPanel sources={activeSources} visible={activeSources.length > 0} />
        )}
      </div>
      </div>
    </div>
  );
}
