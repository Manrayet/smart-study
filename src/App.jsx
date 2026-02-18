// ============================================================
// App.jsx — Smart Study AI
// Componente principale che gestisce upload PDF/testo,
// chiamate a Gemini, persistenza su localStorage e
// la dashboard di apprendimento a schede.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  BookOpen,
  Brain,
  FileText,
  Upload,
  Sparkles,
  ChevronRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  Layers,
  GraduationCap,
  AlertCircle,
  X,
} from "lucide-react";
import { analyzeText } from "./services/gemini";

// ─── Configurazione PDF.js Worker ───────────────────────────
// Usa la versione dinamica del pacchetto installato per evitare mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── Chiave localStorage ─────────────────────────────────────
const STORAGE_KEY = "smart_study_ai_session";

// ─── Messaggi di caricamento dinamici ───────────────────────
const LOADING_MESSAGES = [
  "Analizzando la struttura del testo...",
  "Identificando i concetti chiave...",
  "Costruendo la mappa cognitiva...",
  "Generando sfide cognitive...",
  "Calibrando la Tassonomia di Bloom...",
  "Sintetizzando i punti cruciali...",
  "Elaborando spiegazioni pedagogiche...",
  "Ottimizzando la dashboard di apprendimento...",
];

// ============================================================
// COMPONENTE: LoadingScreen
// ============================================================
function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState("");

  // Rotazione messaggi ogni 3 secondi
  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    const dotsTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => {
      clearInterval(msgTimer);
      clearInterval(dotsTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-8 p-10 rounded-3xl bg-white/5 border border-white/10 shadow-2xl max-w-md w-full mx-4">
        {/* Spinner animato */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-violet-400 border-b-transparent border-l-transparent animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-8 h-8 text-indigo-300 animate-pulse" />
          </div>
        </div>

        {/* Messaggio dinamico */}
        <div className="text-center min-h-[3rem]">
          <p className="text-indigo-200 text-lg font-medium tracking-wide">
            {LOADING_MESSAGES[msgIndex]}
            <span className="text-indigo-400">{dots}</span>
          </p>
          <p className="text-slate-500 text-sm mt-2">
            gemini-3-flash-preview sta elaborando
          </p>
        </div>

        {/* Barra di progresso animata */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-full animate-[shimmer_2s_linear_infinite] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: UploadPanel
// ============================================================
function UploadPanel({ onAnalyze, isLoading }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Estrazione testo da PDF usando pdfjs-dist
  const extractPdfText = async (file) => {
    setError("");
    setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n\n";
      }

      if (!fullText.trim()) {
        throw new Error(
          "Il PDF sembra essere scansionato o non contiene testo selezionabile."
        );
      }
      setText(fullText.trim());
    } catch (err) {
      setError(`Errore PDF: ${err.message}`);
      setFileName("");
    }
  };

  // Gestione drop file
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      extractPdfText(file);
    } else {
      setError("Formato non supportato. Carica un file PDF.");
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) extractPdfText(file);
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      setError("Inserisci del testo o carica un PDF prima di continuare.");
      return;
    }
    if (text.trim().length < 100) {
      setError("Il testo è troppo breve. Inserisci almeno 100 caratteri.");
      return;
    }
    setError("");
    onAnalyze(text);
  };

  const clearFile = () => {
    setFileName("");
    setText("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Powered by gemini-3-flash-preview
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Smart Study{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              AI
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Trasforma qualsiasi testo in una dashboard di apprendimento avanzata
          </p>
        </div>

        {/* Pannello upload */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          {/* Zona drag-and-drop PDF */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-white/10 hover:border-indigo-500/50 hover:bg-white/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-indigo-400" />
                <span className="text-indigo-300 font-medium">{fileName}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">
                  Trascina un PDF qui
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  oppure clicca per selezionare
                </p>
              </>
            )}
          </div>

          {/* Separatore */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-sm font-medium">
              oppure scrivi direttamente
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Textarea testo */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Incolla qui il testo del libro, appunti, articoli accademici..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm leading-relaxed"
          />

          {/* Contatore caratteri */}
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>{text.length.toLocaleString()} caratteri</span>
            <span>Min. 100 caratteri richiesti</span>
          </div>

          {/* Errore */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Bottone analisi */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            <Brain className="w-5 h-5" />
            Genera Dashboard di Apprendimento
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: SummaryTab — Scheda Studio Deep
// ============================================================
function SummaryTab({ summary }) {
  // Divide il summary in paragrafi per una migliore leggibilità
  const paragraphs = summary
    .split(/\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <BookOpen className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Studio Deep</h2>
          <p className="text-slate-400 text-sm">
            Sintesi strutturata del contenuto
          </p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-slate-300 leading-relaxed text-[15px]"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: GlossaryTab — Scheda Concetti Chiave
// ============================================================
function GlossaryTab({ keyConcepts }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <Layers className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Glossario</h2>
          <p className="text-slate-400 text-sm">
            {keyConcepts.length} concetti chiave identificati
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {keyConcepts.map((concept, index) => (
          <div
            key={index}
            className="glass-card rounded-xl overflow-hidden cursor-pointer hover:border-violet-500/30 transition-all duration-300"
            onClick={() => setExpanded(expanded === index ? null : index)}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold">
                  {index + 1}
                </span>
                <h3 className="text-white font-semibold">{concept.term}</h3>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
                  expanded === index ? "rotate-90" : ""
                }`}
              />
            </div>

            {expanded === index && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                <p className="text-slate-300 text-sm leading-relaxed">
                  {concept.definition}
                </p>
                {concept.example && (
                  <div className="flex gap-2 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
                    <span className="text-violet-400 text-xs font-semibold shrink-0 mt-0.5">
                      Esempio:
                    </span>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {concept.example}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: QuizTab — Scheda Simulazione Esame
// ============================================================
function QuizTab({ quiz }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  const question = quiz[currentQ];
  const isCorrect = selectedAnswer === question?.correctAnswer;
  const percentage = Math.round((score / quiz.length) * 100);

  const handleAnswer = (optionIndex) => {
    if (selectedAnswer !== null) return; // Già risposto
    setSelectedAnswer(optionIndex);
    setShowExplanation(true);
    if (optionIndex === question.correctAnswer) {
      setScore((s) => s + 1);
    }
    setAnsweredQuestions((prev) => [
      ...prev,
      {
        correct: optionIndex === question.correctAnswer,
        question: question.question,
      },
    ]);
  };

  const handleNext = () => {
    if (currentQ + 1 >= quiz.length) {
      setCompleted(true);
    } else {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleReset = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
    setAnsweredQuestions([]);
  };

  // ── Schermata risultato finale ──
  if (completed) {
    return (
      <div className="animate-fade-in">
        <div className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white">{percentage}%</h2>
            <p className="text-slate-400 mt-1">
              {score} su {quiz.length} risposte corrette
            </p>
          </div>

          {/* Barra punteggio */}
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                percentage >= 70
                  ? "bg-gradient-to-r from-green-500 to-emerald-400"
                  : percentage >= 50
                  ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                  : "bg-gradient-to-r from-red-500 to-rose-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Valutazione */}
          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-slate-300 text-sm">
              {percentage >= 90
                ? "🏆 Eccellente! Hai una padronanza completa dell'argomento."
                : percentage >= 70
                ? "✅ Buon risultato! Hai compreso i concetti fondamentali."
                : percentage >= 50
                ? "📚 Sufficiente. Rivedi i concetti chiave nel Glossario."
                : "🔄 Hai bisogno di più studio. Rileggi il riassunto e ritenta."}
            </p>
          </div>

          {/* Riepilogo risposte */}
          <div className="text-left space-y-2">
            <p className="text-slate-400 text-sm font-medium mb-3">
              Riepilogo risposte:
            </p>
            {answeredQuestions.map((aq, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {aq.correct ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="text-slate-400 line-clamp-1">{aq.question}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Riprova il Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Domanda corrente ──
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <GraduationCap className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Simulazione Esame</h2>
            <span className="text-slate-400 text-sm">
              {currentQ + 1} / {quiz.length}
            </span>
          </div>
          {/* Barra progresso quiz */}
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentQ + 1) / quiz.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        {/* Badge livello Bloom */}
        {question.bloomLevel && (
          <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            🎯 {question.bloomLevel}
          </span>
        )}

        {/* Domanda */}
        <h3 className="text-white font-semibold text-lg leading-snug">
          {question.question}
        </h3>

        {/* Opzioni */}
        <div className="space-y-2.5">
          {question.options.map((option, index) => {
            let optionClass =
              "w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 ";

            if (selectedAnswer === null) {
              optionClass +=
                "border-white/10 bg-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-slate-300 cursor-pointer";
            } else if (index === question.correctAnswer) {
              optionClass +=
                "border-green-500/50 bg-green-500/10 text-green-300";
            } else if (index === selectedAnswer && !isCorrect) {
              optionClass += "border-red-500/50 bg-red-500/10 text-red-300";
            } else {
              optionClass +=
                "border-white/5 bg-white/[0.02] text-slate-500 cursor-default";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null}
                className={optionClass}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-left leading-snug">{option}</span>
                  {selectedAnswer !== null &&
                    index === question.correctAnswer && (
                      <CheckCircle className="w-4 h-4 text-green-400 ml-auto shrink-0 mt-0.5" />
                    )}
                  {selectedAnswer === index && !isCorrect && (
                    <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Spiegazione */}
        {showExplanation && (
          <div
            className={`p-4 rounded-xl border text-sm leading-relaxed ${
              isCorrect
                ? "border-green-500/20 bg-green-500/5 text-green-200"
                : "border-red-500/20 bg-red-500/5 text-red-200"
            }`}
          >
            <p className="font-semibold mb-1">
              {isCorrect ? "✅ Risposta corretta!" : "❌ Risposta errata"}
            </p>
            <p className="text-slate-300 leading-relaxed">
              {question.explanation}
            </p>
          </div>
        )}

        {/* Bottone avanti */}
        {selectedAnswer !== null && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all"
          >
            {currentQ + 1 >= quiz.length ? (
              <>
                <Trophy className="w-4 h-4" />
                Vedi Risultato Finale
              </>
            ) : (
              <>
                Prossima Domanda
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPALE: App
// ============================================================
export default function App() {
  const [studyData, setStudyData] = useState(null); // Dati sessione corrente
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");

  // Carica sessione precedente da localStorage al mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.summary && parsed.keyConcepts && parsed.quiz) {
          setStudyData(parsed);
        }
      }
    } catch {
      // Sessione corrotta, ignora
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Analizza il testo tramite Gemini
  const handleAnalyze = async (text) => {
    setIsLoading(true);
    setError("");

    try {
      const data = await analyzeText(text);

      // Salva in localStorage per persistenza tra refresh
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      setStudyData(data);
      setActiveTab("summary");
    } catch (err) {
      setError(err.message || "Errore durante l'analisi. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset sessione
  const handleReset = () => {
    setStudyData(null);
    setActiveTab("summary");
    localStorage.removeItem(STORAGE_KEY);
  };

  const tabs = [
    { id: "summary", label: "Studio Deep", icon: BookOpen },
    { id: "glossary", label: "Glossario", icon: Layers },
    { id: "quiz", label: "Simulazione Esame", icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background decorativo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
      </div>

      {/* Loading overlay */}
      {isLoading && <LoadingScreen />}

      {/* Contenuto principale */}
      <div className="relative z-10">
        {!studyData ? (
          // ── Vista Upload ──
          <>
            <UploadPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
            {error && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm shadow-xl backdrop-blur-lg max-w-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
                <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          // ── Vista Dashboard ──
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Header dashboard */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Brain className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Smart Study AI
                  </h1>
                  <p className="text-slate-400 text-sm">
                    Dashboard di apprendimento generata
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Nuova Analisi
              </button>
            </div>

            {/* Tabs di navigazione */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Contenuto scheda attiva */}
            <div className="min-h-[60vh]">
              {activeTab === "summary" && (
                <SummaryTab summary={studyData.summary} />
              )}
              {activeTab === "glossary" && (
                <GlossaryTab keyConcepts={studyData.keyConcepts} />
              )}
              {activeTab === "quiz" && <QuizTab quiz={studyData.quiz} />}
            </div>

            {/* Footer */}
            <div className="text-center text-slate-600 text-xs pt-4 border-t border-white/5">
              Sessione salvata automaticamente · gemini-3-flash-preview · Smart Study AI
            </div>
          </div>
        )}
      </div>
    </div>
  );
}