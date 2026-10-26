import { GoogleGenAI } from "@google/genai";

const CHAT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];
const EMBED_MODEL = "gemini-embedding-001";

let client;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function geminiEmbed(text) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_API_KEY is not set");

  const response = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Empty embedding response from Gemini");
  }
  return values;
}

export async function geminiGenerate({ system, user, history = [] }) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_API_KEY is not set");

  const contents = [
    ...history
      .filter((m) => m?.text)
      .slice(-8)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
    { role: "user", parts: [{ text: user }] },
  ];

  let lastError;
  for (const model of CHAT_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: system,
            temperature: 0.2,
            httpOptions: { timeout: 20000 },
          },
        });

        const text = response.text?.trim();
        if (!text) throw new Error("Empty response from Gemini");
        return text;
      } catch (err) {
        lastError = err;
        const busy = /503|UNAVAILABLE|high demand/i.test(err.message || "");
        console.warn(`Gemini model ${model} failed (try ${attempt}):`, err.message);
        if (!busy || attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  throw lastError ?? new Error("All Gemini chat models failed");
}
