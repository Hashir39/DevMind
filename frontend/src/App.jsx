import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import CitationsPanel from "./components/CitationsPanel";
import DocMindAvatar from "./components/DocMindAvatar";
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
  text: "Welcome to **DocMind**. Start a chat, upload PDFs in **Library**, then ask follow-up questions in the same thread. Past chats stay in the sidebar.",
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

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#09090b]">

      <Sidebar
        view={view}
        setView={setView}
        stats={stats}
        chats={chats}
        activeChatId={activeChatId}
        apiOnline={apiOnline}
        onNewChat={startNewChat}
        onOpenChat={openChat}
        onDeleteChat={removeChat}
        onRenameChat={renameChat}
        onPinChat={pinChat}
      />

      {/* Main + citations */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {view === "chat" && (
            <>
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 bg-[#09090b]/80 px-6 py-4 backdrop-blur">
                <div>
                  <h1 className="font-display max-w-[16rem] truncate text-xl font-semibold text-white">
                    {chats.find((c) => c.id === activeChatId)?.title || "New chat"}
                  </h1>
                  <p className="text-xs text-[#a1a1aa]">Follow-ups stay in this conversation</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    className="max-w-[10rem] rounded-full border border-white/10 bg-[#161618] px-3 py-1.5 text-xs text-[#e4e4e7] focus:outline-none"
                    aria-label="Search in"
                  >
                    <option value="">All documents</option>
                    {docs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                <div className="flex rounded-full border border-white/10 bg-[#161618] p-1">
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
                <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
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

              <div className="shrink-0 border-t border-white/8 bg-[#09090b] p-4">
                <form
                  onSubmit={onAsk}
                  className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-white/10 bg-[#161618] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] focus-within:border-[#7c5cfc]/60"
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
                    className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-[#f4f4f5] placeholder:text-[#71717a] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="rounded-xl bg-[#7c5cfc] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6d4ef0] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
                <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-[#71717a]">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}

          {view === "library" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
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
                className={`mb-8 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-16 text-center transition ${
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
            <div className="overflow-y-auto p-6">
              <header className="mb-6">
                <h1 className="font-display text-2xl font-semibold text-white">RAG vs Baseline</h1>
                <p className="mt-1 max-w-xl text-sm text-[#a1a1aa]">
                  Ask the same question twice in Chat — once with RAG and once with Baseline.
                </p>
              </header>
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#161618]">
                <table className="w-full text-sm">
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
  );
}
