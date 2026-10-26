const API = "http://localhost:4000/api";

export async function getHealth() {
  const res = await fetch(`${API}/health`);
  return res.json();
}

export async function listDocuments() {
  const res = await fetch(`${API}/documents`);
  return res.json();
}

export async function uploadDocument(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/documents`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

export async function removeDocument(id) {
  await fetch(`${API}/documents/${id}`, { method: "DELETE" });
}

export async function ask(question, mode) {
  const res = await fetch(`${API}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function listConversations() {
  const res = await fetch(`${API}/conversations`);
  return res.json();
}

export async function createConversation() {
  const res = await fetch(`${API}/conversations`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not start chat");
  return data;
}

export async function getConversation(id) {
  const res = await fetch(`${API}/conversations/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load chat");
  return data;
}

export async function deleteConversation(id) {
  await fetch(`${API}/conversations/${id}`, { method: "DELETE" });
}

export async function updateConversation(id, patch) {
  const res = await fetch(`${API}/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not update chat");
  return data;
}

export async function sendMessage(conversationId, question, mode, docId) {
  const res = await fetch(`${API}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode, docId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function evaluateRetrieval() {
  const res = await fetch(`${API}/eval`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not check retrieval");
  return data;
}

export async function optimizeRetrieval() {
  const res = await fetch(`${API}/optimize`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not tune retrieval");
  return data;
}
