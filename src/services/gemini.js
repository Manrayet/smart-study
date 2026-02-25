// ============================================================
// gemini.js — Servizio di integrazione con Google Gemini AI
// Modello: gemini-3-flash-preview
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("ERRORE: La variabile VITE_GEMINI_API_KEY non è definita nel file .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// ─── Modello unico utilizzato ─────────────────────────────────
const MODEL_NAME = "gemini-3-flash-preview";

// ─── Istruzione di sistema ────────────────────────────────────
const SYSTEM_INSTRUCTION = `Sei un assistente accademico di alto livello specializzato in sintesi cognitiva, didattica universitaria einstructional design. Il tuo compito è trasformare un testo accademico in una risorsa di apprendimento strutturata in formato JSON.
 
### OBIETTIVI DIDATTICI
1. Sintesi Proporzionale: Crea un riassunto organico del testo. Il riassunto NON deve superare un terzo (1/3) della lunghezza del testo originale, mantenendo comunque il rigore scientifico e la chiarezza.
2. Mappa Concettuale: Estrai i concetti fondamentali (minimo 5, massimo 10). Ogni definizione deve essere autoconclusiva, precisa e contenere tra le 15 e le 30 parole.
3. Valutazione Formativa: Genera ESATTAMENTE 10 domande a risposta multipla. Le domande devono seguire la Tassonomia di Bloom (dalla comprensione all'analisi) e i distrattori devono essere verosimili, evitando opzioni palesemente errate.
 
### REGOLE TECNICHE E DI FORMATO
- Rispondi ESCLUSIVAMENTE con un oggetto JSON valido.
- NON includere blocchi di codice Markdown (niente ``json), commenti o testo introduttivo/conclusivo.
- Lingua: Italiano professionale e accademico.
 
### STRUTTURA JSON RICHIESTA
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

const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  temperature: 0.7,
  maxOutputTokens: 8192,
};

/**
 * Analizza il testo con gemini-3-flash-preview.
 * @param {string} text
 * @returns {Promise<{summary, keyConcepts, quiz, _modelUsed}>}
 */
export async function analyzeText(text) {
  if (!text || text.trim().length < 50) {
    throw new Error("Il testo fornito è troppo breve. Inserisci almeno 50 caratteri.");
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: GENERATION_CONFIG,
  });

  const prompt = `Analizza il seguente testo e genera la struttura di apprendimento richiesta:\n\n---\n${text}\n---`;

  try {
    console.info(`[Smart Study AI] Utilizzo modello: ${MODEL_NAME}`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.summary || !parsed.keyConcepts || !parsed.quiz) {
      throw new Error("La risposta del modello non contiene tutti i campi richiesti.");
    }

    return { ...parsed, _modelUsed: MODEL_NAME };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Errore nel parsing della risposta AI. Riprova con un testo diverso.");
    }
    throw error;
  }
}
