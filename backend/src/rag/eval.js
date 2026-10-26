import { loadStore } from "./store.js";
import { contentWords, localRelevance } from "./rerank.js";
import { getRetrievalSettings, saveRetrievalSettings } from "./retrievalSettings.js";

function chunkKey(chunk) {
  return `${chunk.docId}:${chunk.chunkIndex}`;
}

function goldQuestions(vectors) {
  return vectors
    .map((chunk) => {
      const words = contentWords(chunk.text);
      if (words.length < 6) return null;
      const start = Math.min(Math.floor(words.length / 3), words.length - 6);
      return {
        query: words.slice(start, start + 6).join(" "),
        gold: chunkKey(chunk),
        docName: chunk.docName,
        chunkIndex: chunk.chunkIndex,
      };
    })
    .filter(Boolean);
}

function rankLocal(query, vectors, lexicalWeight) {
  return vectors
    .map((chunk) => ({
      ...chunk,
      score: localRelevance(query, chunk.text, lexicalWeight),
    }))
    .sort((a, b) => b.score - a.score);
}

function scoreQuestions(questions, vectors, { topK, lexicalWeight }) {
  if (!questions.length) {
    return { questions: 0, recall: 0, precision: 0, rows: [] };
  }

  const rows = questions.map((item) => {
    const ranked = rankLocal(item.query, vectors, lexicalWeight).slice(0, topK);
    const relevant = ranked.filter(
      (chunk) => chunkKey(chunk) === item.gold || localRelevance(item.query, chunk.text, 0) >= 0.5
    );
    return {
      query: item.query,
      docName: item.docName,
      chunkIndex: item.chunkIndex,
      hit: ranked.some((chunk) => chunkKey(chunk) === item.gold),
      precision: relevant.length / topK,
    };
  });

  const recall = rows.filter((row) => row.hit).length / rows.length;
  const precision = rows.reduce((sum, row) => sum + row.precision, 0) / rows.length;

  return {
    questions: rows.length,
    recall: Number(recall.toFixed(3)),
    precision: Number(precision.toFixed(3)),
    rows,
  };
}

export async function evaluateRetrieval(overrides = {}) {
  const settings = { ...(await getRetrievalSettings()), ...overrides };
  const { vectors } = await loadStore();
  const questions = goldQuestions(vectors);
  const report = scoreQuestions(questions, vectors, settings);

  return {
    ...report,
    topK: settings.topK,
    lexicalWeight: settings.lexicalWeight,
    tokenCost: 0,
  };
}

export async function optimizeRetrieval() {
  const { vectors } = await loadStore();
  const questions = goldQuestions(vectors);
  if (!questions.length) {
    return { error: "Upload a document before tuning retrieval." };
  }

  let best = null;
  for (const lexicalWeight of [0.2, 0.35, 0.5]) {
    for (const topK of [3, 4, 6]) {
      const report = scoreQuestions(questions, vectors, { topK, lexicalWeight });
      const f1 =
        report.recall + report.precision === 0
          ? 0
          : (2 * report.recall * report.precision) / (report.recall + report.precision);
      if (!best || f1 > best.f1) {
        best = { f1, topK, lexicalWeight, recall: report.recall, precision: report.precision };
      }
    }
  }

  const settings = await saveRetrievalSettings(best);
  return {
    settings,
    recall: best.recall,
    precision: best.precision,
    tokenCost: 0,
  };
}
