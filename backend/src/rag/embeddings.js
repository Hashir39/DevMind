import { pipeline } from "@xenova/transformers";
import { geminiEmbed, hasGeminiKey } from "./gemini.js";

let localPipeline;

async function getLocalPipeline() {
  if (!localPipeline) {
    localPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return localPipeline;
}

function meanPool(output) {
  const data = output.data;
  const dims = output.dims[1];
  const pooled = new Array(dims).fill(0);
  const tokens = data.length / dims;
  for (let i = 0; i < data.length; i++) {
    pooled[i % dims] += data[i];
  }
  return pooled.map((v) => v / tokens);
}

async function embedLocal(text) {
  const extractor = await getLocalPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  if (output?.data) return meanPool(output);
  return Array.from(output.data);
}

export async function embedText(text) {
  if (hasGeminiKey()) {
    try {
      return await geminiEmbed(text);
    } catch (err) {
      console.warn("Gemini embeddings unavailable, using local model:", err.message);
    }
  }
  return embedLocal(text);
}
