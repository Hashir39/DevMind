import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "../../data/conversations.json");

async function loadAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

async function saveAll(conversations) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(conversations, null, 2));
}

export async function listConversations() {
  const all = await loadAll();
  return all
    .map(({ id, title, updatedAt, pinned, pinnedAt, messages }) => ({
      id,
      title,
      updatedAt,
      pinned: Boolean(pinned),
      pinnedAt: pinnedAt || null,
      messageCount: messages.length,
      preview: messages.find((m) => m.role === "user")?.text?.slice(0, 80) || "",
    }))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.pinned && b.pinned) {
        return new Date(b.pinnedAt || b.updatedAt) - new Date(a.pinnedAt || a.updatedAt);
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

export async function getConversation(id) {
  const all = await loadAll();
  return all.find((c) => c.id === id) || null;
}

export async function createConversation() {
  const now = new Date().toISOString();
  const conversation = {
    id: uuidv4(),
    title: "New chat",
    pinned: false,
    pinnedAt: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  const all = await loadAll();
  all.unshift(conversation);
  await saveAll(all);
  return conversation;
}

export async function appendTurn(id, { question, answer, sources, mode, latencyMs }) {
  const all = await loadAll();
  const conversation = all.find((c) => c.id === id);
  if (!conversation) return null;

  const now = new Date().toISOString();
  if (conversation.title === "New chat" && !conversation.messages.some((m) => m.role === "user")) {
    conversation.title = question.slice(0, 48);
  }

  conversation.messages.push({
    role: "user",
    text: question,
    createdAt: now,
  });
  conversation.messages.push({
    role: "assistant",
    text: answer,
    sources: sources || [],
    mode,
    latencyMs,
    createdAt: now,
  });
  conversation.updatedAt = now;
  await saveAll(all);
  return conversation;
}

export async function updateConversation(id, { title, pinned } = {}) {
  const all = await loadAll();
  const conversation = all.find((c) => c.id === id);
  if (!conversation) return null;

  if (typeof title === "string") {
    const next = title.trim().slice(0, 80);
    if (next) conversation.title = next;
  }
  if (typeof pinned === "boolean") {
    conversation.pinned = pinned;
    conversation.pinnedAt = pinned ? new Date().toISOString() : null;
  }

  await saveAll(all);
  return conversation;
}

export async function deleteConversation(id) {
  const all = await loadAll();
  await saveAll(all.filter((c) => c.id !== id));
}
