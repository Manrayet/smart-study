// ============================================================
// supabase.js — Servizio Supabase
// Sostituisce pocketbase.js. Gestisce auth, chat, quiz e
// rate limiting per utente (max generazioni al giorno).
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERRORE: variabili VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY mancanti nel .env");
}

// Client Supabase — singleton riutilizzato da tutte le funzioni
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Limite massimo di generazioni AI per utente al giorno
export const DAILY_GENERATION_LIMIT = 5;

// ============================================================
// AUTH
// ============================================================

/** Registra un nuovo utente con email e password */
export async function registerUser(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, theme: "dark" }, // metadati salvati in auth.users
    },
  });
  if (error) throw new Error(error.message);

  // Crea il record in public.profiles (trigger automatico nel DB, vedi SQL setup)
  return data;
}

/** Login con email e password — restituisce { user, session } */
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data; // { user, session }
}

/** Logout */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Recupera la sessione attiva (usato al mount per ripristinare il login) */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session; // null se non loggato
}

/** Ascolta i cambiamenti di sessione (login/logout automatici) */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription; // chiama .unsubscribe() per rimuovere il listener
}

/** Aggiorna il tema dell'utente nel suo profilo */
export async function updateUserTheme(userId, theme) {
  const { error } = await supabase
    .from("profiles")
    .update({ theme })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Recupera il profilo utente (nome, tema) */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// RATE LIMITING — generazioni AI per utente
// ============================================================

/**
 * Controlla quante generazioni ha fatto l'utente oggi.
 * Restituisce { count, remaining, canGenerate }.
 */
export async function checkGenerationLimit(userId) {
  const today = new Date().toISOString().split("T")[0]; // es. "2025-05-19"

  const { count, error } = await supabase
    .from("chats")
    .select("*", { count: "exact", head: true }) // head: true → non scarica i dati, solo il conteggio
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00`)       // da mezzanotte di oggi
    .lte("created_at", `${today}T23:59:59`);      // a fine giornata

  if (error) throw new Error(error.message);

  const remaining = Math.max(0, DAILY_GENERATION_LIMIT - (count || 0));
  return {
    count: count || 0,
    remaining,
    canGenerate: remaining > 0,
  };
}

// ============================================================
// CHATS
// ============================================================

/** Crea una nuova chat con i dati dell'analisi AI */
export async function createChat(userId, title, studyData) {
  const { data, error } = await supabase
    .from("chats")
    .insert({
      user_id: userId,
      title,
      summary: studyData.summary,
      key_concepts: studyData.keyConcepts, // JSONB — passato come oggetto JS diretto
      quiz: studyData.quiz,                // JSONB — passato come oggetto JS diretto
    })
    .select()   // restituisce il record appena creato
    .single();

  if (error) throw new Error(`Errore creazione chat: ${error.message}`);
  return data;
}

/** Recupera tutte le chat dell'utente, dalla più recente */
export async function getUserChats(userId) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}

/** Elimina una chat (i quiz_results vengono rimossi in cascade dal DB) */
export async function deleteChat(chatId) {
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId);

  if (error) throw new Error(error.message);
}

/** Rinomina il titolo di una chat */
export async function updateChatTitle(chatId, title) {
  const { error } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", chatId);

  if (error) throw new Error(error.message);
}

// ============================================================
// QUIZ RESULTS
// ============================================================

/** Salva il risultato di un quiz completato */
export async function saveQuizResult(chatId, userId, score, total, answers) {
  const percentage = Math.round((score / total) * 100);

  const { data, error } = await supabase
    .from("quiz_results")
    .insert({
      chat_id: chatId,
      user_id: userId,
      score,
      total,
      percentage,
      answers: answers, // JSONB — array di oggetti { question, correct, selectedIndex }
    })
    .select()
    .single();

  if (error) throw new Error(`Errore salvataggio quiz: ${error.message}`);
  return data;
}

/** Recupera tutti i risultati quiz di una chat, dal più recente */
export async function getChatQuizResults(chatId) {
  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}
