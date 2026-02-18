# 🧠 Smart Study AI

Trasforma testi complessi o file PDF in dashboard di apprendimento avanzate usando **Google Gemini 2.5 Pro**.

## ✨ Funzionalità

- **Upload PDF** — Estrazione testo lato client con `pdfjs-dist` (nessun server richiesto)
- **Analisi AI** — Gemini 2.5 Pro genera summary, glossario e quiz in JSON strutturato
- **Studio Deep** — Riassunto accademico in paragrafi
- **Glossario** — Concetti chiave con definizioni approfondite e esempi
- **Simulazione Esame** — Quiz interattivo basato sulla Tassonomia di Bloom (10 domande)
- **Persistenza** — Sessione salvata in `localStorage`, nessuna chiamata API al refresh
- **Design Glassmorphism** — UI in stile indigo/slate con `backdrop-blur`

## 🚀 Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura la chiave API

```bash
cp .env.example .env
```

Apri `.env` e sostituisci `LA_TUA_CHIAVE_API_QUI` con la tua chiave ottenuta da [Google AI Studio](https://aistudio.google.com/apikey).

```env
VITE_GEMINI_API_KEY=la_tua_chiave_reale
```

### 3. Avvia in modalità sviluppo

```bash
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser.

### 4. Build per produzione

```bash
npm run build
npm run preview
```

## 📁 Struttura del progetto

```
smart-study-ai/
├── src/
│   ├── services/
│   │   └── gemini.js     # Integrazione Gemini AI
│   ├── App.jsx           # Componente principale + UI
│   ├── main.jsx          # Entry point React
│   └── index.css         # Tailwind + stili glassmorphism
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example          # Template variabili d'ambiente
└── .gitignore
```

## 🛠️ Stack Tecnico

| Tecnologia | Uso |
|---|---|
| **Vite + React 18** | Framework frontend |
| **@google/generative-ai** | SDK Gemini 2.5 Pro |
| **pdfjs-dist** | Estrazione testo PDF lato client |
| **Tailwind CSS** | Styling utility-first |
| **lucide-react** | Icone |

## ⚠️ Note importanti

- La chiave API deve avere accesso a **Gemini 3 flash**
- L'estrazione PDF funziona solo con PDF con testo selezionabile (non scansioni)
- Il file `.env` non deve mai essere committato su Git
