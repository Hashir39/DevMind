function formatPassage(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").replace(/\s•\s/g, "\n• ").trim();
}

export default function CitationsPanel({ sources, visible }) {
  if (!visible || !sources?.length) {
    return (
      <aside className="hidden w-80 shrink-0 flex-col border-l border-white/8 bg-[#0c0c0e] xl:flex">
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 rounded-2xl bg-white/6 p-4 text-2xl">📎</div>
          <p className="text-sm font-medium text-white">Citations</p>
          <p className="mt-2 text-xs leading-relaxed text-[#a1a1aa]">
            After you ask a question, matching passages from your PDFs appear here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex max-h-[42vh] w-full min-h-0 shrink-0 flex-col overflow-hidden border-t border-white/8 bg-[#0c0c0e] lg:h-full lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="border-b border-white/8 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Citations</h2>
        <p className="mt-0.5 text-xs text-[#a1a1aa]">
          {sources.length} passages retrieved from your documents
        </p>
      </div>
      <div className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {sources.map((s, i) => (
          <article
            key={i}
            className="rounded-xl border border-white/8 bg-[#161618] p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#c4b5fd]">
                  [{i + 1}] {s.docName}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#71717a]">
                  Passage {s.chunkIndex + 1}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-[#e4e4e7]">
                {Math.round(s.score * 100)}%
              </span>
            </div>
            <p className="sidebar-scroll max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[#d4d4d8]">
              {formatPassage(s.excerpt)}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
