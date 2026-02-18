// ============================================================
// gemini.js — Servizio di integrazione con Google Gemini AI
// Configura il modello, il prompt di sistema e la funzione
// principale per analizzare il testo in input.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

// Recupera la chiave API dall'environment (file .env)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    "ERRORE: La variabile VITE_GEMINI_API_KEY non è definita nel file .env"
  );
}

// Inizializza il client Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

// ─── Istruzione di sistema per il modello ────────────────────
const SYSTEM_INSTRUCTION = `Sei un assistente accademico di alto livello specializzato in sintesi cognitiva e didattica universitaria.
Analizza il testo fornito e restituisci ESCLUSIVAMENTE un oggetto JSON valido (senza markdown, senza backtick, senza testo aggiuntivo) con questa struttura esatta:

{
  "summary": "Una sintesi strutturata e dettagliata in paragrafi che copra tutti i punti cruciali del testo. Usa un linguaggio accademico chiaro.",
  "keyConcepts": [
    {
      "term": "Nome del concetto",
      "definition": "Definizione approfondita e completa adatta al livello universitario, senza limiti di parole.",
      "example": "Un esempio concreto che illustra il concetto."
    }
  ],
  "quiz": [
    {
      "question": "Testo della domanda basata sulla Tassonomia di Bloom",
      "bloomLevel": "Livello Bloom (Conoscenza/Comprensione/Applicazione/Analisi/Valutazione/Sintesi)",
      "options": ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      "correctAnswer": 0,
      "explanation": "Spiegazione pedagogica dettagliata del perché questa risposta è corretta e le altre no."
    }
  ]
}

Genera esattamente 10 domande nel quiz e almeno 5 concetti chiave. Le domande devono coprire diversi livelli della Tassonomia di Bloom.`;

// ─── Configurazione del modello ──────────────────────────────
const model = genAI.getGenerativeModel({

  model:   "gemini-3-flash-preview",
  systemInstruction: SYSTEM_INSTRUCTION,
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.7,
    // Aumenta il limite di token per analisi approfondite
    maxOutputTokens: 8192,
  },
});

/**
 * Analizza il testo fornito e restituisce la struttura JSON
 * con summary, keyConcepts e quiz.
 *
 * @param {string} text - Il testo da analizzare
 * @returns {Promise<{summary: string, keyConcepts: Array, quiz: Array}>}
 */
export async function analyzeText(text) {
  if (!text || text.trim().length < 50) {
    throw new Error(
      "Il testo fornito è troppo breve. Inserisci almeno 50 caratteri."
    );
  }

  const prompt = `Analizza il seguente testo e genera la struttura di apprendimento richiesta:\n\n---\n${text}\n---`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    // Parsing del JSON restituito dal modello
    const parsed = JSON.parse(rawText);

    // Validazione base della struttura
    if (!parsed.summary || !parsed.keyConcepts || !parsed.quiz) {
      throw new Error(
        "La risposta del modello non contiene tutti i campi richiesti."
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Errore nel parsing della risposta AI. Riprova con un testo diverso."
      );
    }
    throw error;
  }
}
