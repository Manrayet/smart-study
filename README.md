# 🧠 Smart Study AI

Trasforma testi complessi o PDF in dashboard di apprendimento persistenti con **gemini**, storico quiz e tracciamento progressi.

> **Nota sul progetto**: Smart Study AI è un progetto generato tramite AI con lo scopo esplicito di dare priorità al **problem solving da parte del programmatore**. Il codice è volutamente leggibile, commentato e strutturato in modo che lo sviluppatore possa concentrarsi sulla risoluzione di problemi reali — integrazione API, gestione dello stato, persistenza dati — senza partire da zero.

---

## ✨ Funzionalità

- **Auth completa** — Registrazione e login utenti via PocketBase
- **Chat separate** — Ogni analisi è una chat indipendente, riprendibile in qualsiasi momento
- **Studio Deep** — Riassunto accademico strutturato in paragrafi
- **Glossario** — Concetti chiave espandibili con esempi
- **Quiz interattivo** — 10 domande basate sulla Tassonomia di Bloom, con feedback immediato
- **Storico quiz** — Ogni tentativo viene salvato separatamente con percentuale, data e riepilogo risposte
- **Progressi** — Statistiche per chat: media, miglior score, numero tentativi
- **Tema chiaro/scuro** — Toggle persistente, salvato nel profilo utente su PocketBase
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
VITE_GEMINI_API_KEY=la_tua_chiave_
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```
Ottieni la tua chiave da [API keys | Google AI Studio](https://aistudio.google.com/api-keys)

### 3. Avvia PocketBase

Scarica PocketBase da [pocketbase.io](https://pocketbase.io/docs/) e avvialo:

```bash
./pocketbase serve
```

Apri l'admin UI su: **http://127.0.0.1:8090/_/**

### 4. Crea le collezioni (vedi sezione dedicata sotto)

### 5. Avvia il frontend

```bash
npm run dev
```

---

## 🗄️ PocketBase — Collezioni e API Rules

### Collezione: `users` (built-in, estesa)

> PocketBase include già la collezione `users`. Aggiungi solo il campo custom `theme`.

**Campi aggiuntivi da aggiungere:**

| Campo | Tipo    | Default | Note                     |
|-------|---------|---------|--------------------------|
| `theme` | Text  | `dark`  | Valori: `dark` \| `light` |

**API Rules:**

| Regola             | Valore                    |
|--------------------|---------------------------|
| List rule          | `id = @request.auth.id`   |
| View rule          | `id = @request.auth.id`   |
| Create rule        | *(vuoto — pubblica)*      |
| Update rule        | `id = @request.auth.id`   |
| Delete rule        | `id = @request.auth.id`   |

---

### Collezione: `chats`

**Crea nuova collezione** con nome `chats`.

**Campi:**

| Campo        | Tipo     | Note                              |
|--------------|----------|-----------------------------------|
| `user`       | Relation | Relazione con `users`, cascade delete |
| `title`      | Text     | Titolo della chat                 |
| `summary`    | Text     | Riassunto generato da Gemini      |
| `key_concepts` | Json  | Concetti chiave |
| `quiz`       | Json     | Domande salvate per tenere traccia dei progressi  |

**API Rules:**

| Regola      | Valore                              |
|-------------|-------------------------------------|
| List rule   | `user = @request.auth.id`           |
| View rule   | `user = @request.auth.id`           |
| Create rule | `@request.auth.id != ""`            |
| Update rule | `user = @request.auth.id`           |
| Delete rule | `user = @request.auth.id`           |

---

### Collezione: `quiz_results`

**Crea nuova collezione** con nome `quiz_results`.

**Campi:**

| Campo       | Tipo     | Note                                    |
|-------------|----------|-----------------------------------------|
| `chat`      | Relation | Relazione con `chats`, cascade delete   |
| `user`      | Relation | Relazione con `users`                   |
| `score`     | Number   | Risposte corrette (es. 7)               |
| `total`     | Number   | Totale domande (es. 10)                 |
| `percentage`| Number   | Percentuale 0-100                       |
| `answers`   | Text     | JSON stringificato array risposte       |

**API Rules:**

| Regola      | Valore                              |
|-------------|-------------------------------------|
| List rule   | `user = @request.auth.id`           |
| View rule   | `user = @request.auth.id`           |
| Create rule | `@request.auth.id != ""`            |
| Update rule | `user = @request.auth.id`           |
| Delete rule | `user = @request.auth.id`           |

---

## 📁 Struttura del progetto

```
smart-study-ai/
├── src/
│   ├── services/
│   │   ├── gemini.js        # Integrazione gemini-3-flash-preview
│   │   └── pocketbase.js    # Auth, chat, quiz results, tema
│   ├── App.jsx              # UI completa: auth, sidebar, dashboard
│   ├── main.jsx             # Entry point React
│   └── index.css            # Tailwind + tema chiaro/scuro (CSS vars)
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
