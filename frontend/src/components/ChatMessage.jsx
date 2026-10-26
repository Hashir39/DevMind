import ReactMarkdown from "react-markdown";
import DocMindAvatar from "./DocMindAvatar";

export default function ChatMessage({ msg, isLast }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#7c5cfc] px-4 py-3 text-sm leading-relaxed text-white shadow-[0_8px_24px_rgba(124,92,252,0.22)]">
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
          <span className="text-sm font-medium text-white">DocMind</span>
          {msg.meta?.latencyMs != null && (
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#a1a1aa]">
              {msg.meta.mode} · {msg.meta.latencyMs}ms
            </span>
          )}
        </div>
        <div
          className={`prose-chat rounded-2xl rounded-tl-md border px-4 py-3 text-sm ${
            msg.error
              ? "border-red-500/30 bg-red-950/40 text-red-200"
              : "border-white/8 bg-[#161618]"
          }`}
        >
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>
        {msg.meta?.sources?.length > 0 && (
          <p className="text-xs text-[#71717a]">
            {msg.meta.sources.length} citation(s) shown in the panel →
          </p>
        )}
      </div>
    </div>
  );
}
