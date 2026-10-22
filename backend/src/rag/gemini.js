import { GoogleGenAI } from "@google/genai";

const CHAT_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
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

export async function geminiGenerate({ system, user }) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_API_KEY is not set");

  let lastError;
  for (const model of CHAT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          temperature: 0.2,
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${model} failed:`, err.message);
    }
  }

  throw lastError ?? new Error("All Gemini chat models failed");
}
