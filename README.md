# 🧠 Smart Study AI

Trasforma testi complessi o PDF in dashboard di apprendimento persistenti con **gemini**, storico quiz e tracciamento progressi.

> **Nota sul progetto**: Smart Study AI è un progetto generato tramite AI con lo scopo esplicito di dare priorità al **problem solving da parte del programmatore**. Il codice è volutamente leggibile, commentato e strutturato in modo che lo sviluppatore possa concentrarsi sulla risoluzione di problemi reali — integrazione API, gestione dello stato, persistenza dati — senza partire da zero.

---

## ✨ Funzionalità

 **Auth completa** — Registrazione e login utenti via Supabase Auth (email + password, con verifica email)
- **Chat separate** — Ogni analisi è una chat indipendente, riprendibile in qualsiasi momento
- **Studio Deep** — Riassunto accademico strutturato in paragrafi generato da Gemini AI
- **Glossario** — Concetti chiave espandibili con definizioni e esempi concreti
- **Quiz interattivo** — 10 domande basate sulla Tassonomia di Bloom, con feedback immediato
- **Storico quiz** — Ogni tentativo viene salvato separatamente con percentuale, data e riepilogo risposte
- **Progressi** — Statistiche per chat: media, miglior score, numero tentativi
- **Rate limiting** — Limite di 5 generazioni AI al giorno per utente (tracciato su Supabase)
- **Tema chiaro/scuro** — Toggle persistente, salvato nel profilo utente su Supabase
- **Upload PDF** — Estrazione testo lato client con `pdfjs-dist`

---

## 🚀 Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env
```

Modifica `.env`:

```env
VITE_GEMINI_API_KEY=la_tua_chiave_gemini
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- Chiave Gemini: [API keys | Google AI Studio](https://aistudio.google.com/api-keys)
- URL e chiave Supabase: Dashboard Supabase → **Settings → API**

### 3. Configura Supabase

#### Setup con SQL Editor

Scarica il file [`supabase_setup.sql`](./supabase_setup.sql), poi aprilo nell'**SQL Editor** del tuo progetto Supabase (Dashboard → SQL Editor → New query) e clicca **Run**.

Lo script crea in un colpo solo:
- le tre tabelle con i tipi corretti
- il trigger che genera il profilo utente automaticamente al signup
- tutte le policy **Row Level Security (RLS)**

#### Disattiva la conferma email su Supabase
 
Nel pannello Supabase: **Authentication → Providers → Email**, disattiva l'opzione **"Confirm email"**.
 
Senza questo passaggio la registrazione non effettua il login automatico: l'utente verrebbe bloccato in attesa di una email di conferma che non viene gestita dall'app.
 

### 4. Avvia il frontend

```bash
npm run dev
```

---

## 🗄️ Supabase — Tabelle, RLS e SQL Setup

Il progetto usa tre tabelle su Supabase: `profiles`, `chats` e `quiz_results`.

### Tabelle riepilogo

#### `profiles` (estende `auth.users`)

| Campo | Tipo | Default | Note |
|-------|------|---------|------|
| `id` | UUID (PK) | — | Riferimento a `auth.users` |
| `name` | Text | — | Popolato automaticamente dal trigger |
| `theme` | Text | `dark` | Valori: `dark` \| `light` |
| `created_at` | Timestamptz | `NOW()` | |

#### `chats`

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID (PK) | Auto-generato |
| `user_id` | UUID (FK) | Riferimento a `auth.users`, cascade delete |
| `title` | Text | Titolo della chat |
| `summary` | Text | Riassunto generato da Gemini |
| `key_concepts` | JSONB | Array di concetti chiave |
| `quiz` | JSONB | Array di domande quiz |
| `created_at` | Timestamptz | Usato per il rate limiting giornaliero |

#### `quiz_results`

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID (PK) | Auto-generato |
| `chat_id` | UUID (FK) | Riferimento a `chats`, cascade delete |
| `user_id` | UUID (FK) | Riferimento a `auth.users` |
| `score` | Integer | Risposte corrette (es. 7) |
| `total` | Integer | Totale domande (es. 10) |
| `percentage` | Integer | Percentuale 0–100 |
| `answers` | JSONB | Array `{ question, correct, selectedIndex }` |
| `created_at` | Timestamptz | |

---

## 📁 Struttura del progetto

```
smart-study-ai/
├── src/
│   ├── services/
│   │   ├── gemini.js        # Integrazione Google Gemini 3 Flash
│   │   └── supabase.js      # Auth, profili, chat, quiz results, rate limiting
│   ├── App.jsx              # UI completa: auth, sidebar, dashboard
│   ├── main.jsx             # Entry point React
│   └── index.css            # Tailwind + tema chiaro/scuro (CSS vars)
├── public/
│   └── favicon.png
├── supabase_setup.sql       # Script SQL per creare tabelle, trigger e RLS
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

## 🛠️ Stack Tecnico

| Tecnologia            | Uso                                     |
|-----------------------|-----------------------------------------|
| **Vite + React 18**   | Framework frontend                      |
| **gemini-3-flash-preview** | Analisi AI del testo              |
| **PocketBase**        | Backend as a Service (auth + database)  |
| **pdfjs-dist**        | Estrazione testo PDF lato client        |
| **Tailwind CSS**      | Styling utility-first + CSS variables   |
| **lucide-react**      | Icone                                   |
