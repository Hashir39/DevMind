import ReactMarkdown from "react-markdown";
import DocMindAvatar from "./DocMindAvatar";

export default function ChatMessage({ msg, isLast }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-violet-600/90 px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-violet-950/30">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-up flex gap-3 ${isLast ? "scroll-mt-4" : ""}`}>
      <DocMindAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">DocMind</span>
          {msg.meta?.latencyMs != null && (
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
              {msg.meta.mode} · {msg.meta.latencyMs}ms
            </span>
          )}
        </div>
        <div
          className={`prose-chat rounded-2xl rounded-tl-md border px-4 py-3 text-sm ${
            msg.error
              ? "border-red-500/30 bg-red-950/20 text-red-200"
              : "border-zinc-800/80 bg-zinc-900/60"
          }`}
        >
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>
        {msg.meta?.sources?.length > 0 && (
          <p className="text-xs text-zinc-500">
            {msg.meta.sources.length} citation(s) shown in the panel →
          </p>
        )}
      </div>
    </div>
  );
}
