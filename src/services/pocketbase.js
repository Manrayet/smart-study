// ============================================================
// pocketbase.js — Servizio PocketBase
// Gestisce autenticazione, chat, quiz result e preferenze tema.
// URL base configurabile tramite .env
// ============================================================

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || "http://127.0.0.1:8090";

// ─── Helper: headers con auth ─────────────────────────────────
function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: token } : {}),
  };
}

// ─── Helper: risposta sicura ──────────────────────────────────
async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { message: text }; }
}

// ============================================================
// AUTH
// ============================================================

/** Registra un nuovo utente */
export async function registerUser(email, password, name) {
  const res = await fetch(`${PB_URL}/api/collections/users/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      passwordConfirm: password,
      name,
      theme: "dark", // default tema scuro
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore registrazione");
  return data;
}

/** Login utente — restituisce { token, record } */
export async function loginUser(email, password) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Credenziali non valide");
  return data; // { token, record }
}

/** Aggiorna il tema dell'utente (light | dark) */
export async function updateUserTheme(userId, theme, token) {
  const res = await fetch(`${PB_URL}/api/collections/users/records/${userId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ theme }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore aggiornamento tema");
  return data;
}

// ============================================================
// CHATS
// ============================================================

/** Crea una nuova chat collegata all'utente */
export async function createChat(userId, title, inputText, studyData, token) {
  const res = await fetch(`${PB_URL}/api/collections/chats/records`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      user: userId,
      title,
      input_text: inputText,
      summary: studyData.summary,
      key_concepts: JSON.stringify(studyData.keyConcepts),
      quiz: JSON.stringify(studyData.quiz),
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore creazione chat");
  return data;
}

/** Recupera tutte le chat dell'utente, ordinate per data (più recente prima) */
export async function getUserChats(userId, token) {
  const params = new URLSearchParams({
    filter: `user="${userId}"`,
    sort: "-created",
    perPage: "50",
  });
  const res = await fetch(`${PB_URL}/api/collections/chats/records?${params}`, {
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore recupero chat");
  return data.items || [];
}

/** Elimina una chat (e i quiz result associati vengono rimossi da cascade) */
export async function deleteChat(chatId, token) {
  const res = await fetch(`${PB_URL}/api/collections/chats/records/${chatId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data.message || "Errore eliminazione chat");
  }
}

/** Rinomina il titolo di una chat */
export async function updateChatTitle(chatId, title, token) {
  const res = await fetch(`${PB_URL}/api/collections/chats/records/${chatId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore aggiornamento chat");
  return data;
}

// ============================================================
// QUIZ RESULTS
// ============================================================

/** Salva il risultato di un quiz completato */
export async function saveQuizResult(chatId, userId, score, total, answers, token) {
  const percentage = Math.round((score / total) * 100);
  const res = await fetch(`${PB_URL}/api/collections/quiz_results/records`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      chat: chatId,
      user: userId,
      score,
      total,
      percentage,
      answers: JSON.stringify(answers), // array { question, correct, selectedIndex }
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore salvataggio risultato quiz");
  return data;
}

/** Recupera tutti i risultati quiz di una chat, dal più recente */
export async function getChatQuizResults(chatId, token) {
  const params = new URLSearchParams({
    filter: `chat="${chatId}"`,
    sort: "-created",
    perPage: "100",
  });
  const res = await fetch(`${PB_URL}/api/collections/quiz_results/records?${params}`, {
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore recupero risultati quiz");
  return data.items || [];
}

/** Recupera tutti i risultati quiz dell'utente (per progresso globale) */
export async function getUserQuizResults(userId, token) {
  const params = new URLSearchParams({
    filter: `user="${userId}"`,
    sort: "-created",
    expand: "chat",
    perPage: "200",
  });
  const res = await fetch(`${PB_URL}/api/collections/quiz_results/records?${params}`, {
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || "Errore recupero progressi");
  return data.items || [];
}
