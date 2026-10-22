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
