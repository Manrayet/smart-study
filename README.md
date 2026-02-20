# 🧠 Smart Study AI v2

Trasforma testi complessi o PDF in dashboard di apprendimento persistenti con **gemini**, storico quiz e tracciamento progressi.

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
VITE_GEMINI_API_KEY=la_tua_chiave_da_aistudio.google.com
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

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

| Campo        | Tipo     | Obbligatorio | Note                              |
|--------------|----------|-------------|-----------------------------------|
| `user`       | Relation | ✅           | Relazione con `users`, cascade delete |
| `title`      | Text     | ✅           | Titolo della chat                 |
| `input_text` | Text     | ✅           | Testo originale analizzato        |
| `summary`    | Text     | ✅           | Riassunto generato da Gemini      |
| `key_concepts` | Text  | ✅           | JSON stringificato array concetti |
| `quiz`       | Text     | ✅           | JSON stringificato array domande  |

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

| Campo       | Tipo     | Obbligatorio | Note                                    |
|-------------|----------|--------------|-----------------------------------------|
| `chat`      | Relation | ✅            | Relazione con `chats`, cascade delete   |
| `user`      | Relation | ✅            | Relazione con `users`                   |
| `score`     | Number   | ✅            | Risposte corrette (es. 7)               |
| `total`     | Number   | ✅            | Totale domande (es. 10)                 |
| `percentage`| Number   | ✅            | Percentuale 0-100                       |
| `answers`   | Text     | ✅            | JSON stringificato array risposte       |

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

---

## 🎨 Sistema temi

Il tema è gestito tramite CSS custom properties (`--bg-base`, `--accent`, ecc.) applicate su `:root` (dark) e `html.light-mode` (light). Il valore viene:
1. Applicato immediatamente al DOM (`classList.toggle`)
2. Salvato in `localStorage` per il refresh
3. Persistito su PocketBase nel campo `theme` dell'utente per sincronizzazione cross-device
