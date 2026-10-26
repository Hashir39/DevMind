const CONTEXT_TOKEN_BUDGET = 1800;
const HISTORY_TOKEN_BUDGET = 700;

export function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

export function trimHistory(history = [], budget = HISTORY_TOKEN_BUDGET) {
  const kept = [];
  let used = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].text);
    if (kept.length && used + cost > budget) break;
    kept.unshift(history[i]);
    used += cost;
  }

  const limited = kept.slice(-8);
  return {
    history: limited,
    dropped: Math.max(0, history.length - limited.length),
    tokens: used,
  };
}

export function trimSources(sources = [], budget = CONTEXT_TOKEN_BUDGET) {
  const kept = [];
  let used = 0;

  for (const source of sources) {
    const cost = estimateTokens(source.text);
    if (kept.length && used + cost > budget) break;
    kept.push(source);
    used += cost;
  }

  return {
    sources: kept,
    dropped: sources.length - kept.length,
    tokens: used,
  };
}
