const STOP = new Set(
  "a an the of to and in on for with from by is are was were be this that it as at or you your we our".split(
    " "
  )
);

export function contentWords(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

export function lexicalScore(query, text) {
  const words = contentWords(query);
  if (!words.length) return 0;
  const haystack = new Set(contentWords(text));
  const hits = words.filter((word) => haystack.has(word)).length;
  return hits / words.length;
}

function phraseScore(query, text) {
  const words = contentWords(query).slice(0, 4);
  if (words.length < 2) return 0;
  return text.toLowerCase().includes(words.join(" ")) ? 1 : 0;
}

export function localRelevance(query, text, lexicalWeight = 0.35) {
  const lexical = lexicalScore(query, text);
  const phrase = phraseScore(query, text);
  return (1 - lexicalWeight) * lexical + lexicalWeight * phrase;
}

export function rerank(query, candidates, topK = 4, lexicalWeight = 0.35) {
  const ranked = candidates.map((candidate) => {
    const lexical = lexicalScore(query, candidate.text);
    const cosine = Number.isFinite(candidate.score) ? candidate.score : 0;
    return {
      ...candidate,
      lexical: Number(lexical.toFixed(4)),
      score: (1 - lexicalWeight) * cosine + lexicalWeight * lexical,
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, topK);
}
