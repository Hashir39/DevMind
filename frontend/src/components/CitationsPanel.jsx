function formatPassage(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").replace(/\s•\s/g, "\n• ").trim();
}

export default function CitationsPanel({ sources, visible }) {
  if (!visible || !sources?.length) {
    return (
      <aside className="hidden w-80 shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-900/30 xl:flex">
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 rounded-2xl bg-zinc-800/50 p-4 text-2xl">📎</div>
          <p className="text-sm font-medium text-zinc-300">Citations</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            After you ask a question, matching passages from your PDFs appear here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-zinc-800/80 bg-zinc-900/40 lg:w-80 lg:border-l lg:border-t-0 xl:flex">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Citations</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {sources.length} passages retrieved from your documents
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {sources.map((s, i) => (
          <article
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-cyan-300/90">
                  [{i + 1}] {s.docName}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Passage {s.chunkIndex + 1}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                {Math.round(s.score * 100)}%
              </span>
            </div>
            <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
              {formatPassage(s.excerpt)}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
