import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SETTINGS_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/retrieval.json"
);

const DEFAULTS = {
  candidateCount: 12,
  topK: 4,
  lexicalWeight: 0.35,
};

export async function getRetrievalSettings() {
  try {
    const saved = JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8"));
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveRetrievalSettings(settings) {
  const next = {
    candidateCount: 12,
    topK: settings.topK,
    lexicalWeight: settings.lexicalWeight,
  };
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2));
  return next;
}
