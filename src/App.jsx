// ============================================================
// App.jsx — Smart Study AI v2
// Architettura completa: Auth · Chat persistenti · Quiz tracking
// Tema chiaro/scuro · PocketBase backend
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  BookOpen, Brain, FileText, Upload, Sparkles, ChevronRight,
  CheckCircle, XCircle, RotateCcw, Trophy, Layers, GraduationCap,
  AlertCircle, X, MessageSquare, Trash2, Plus, Sun, Moon,
  LogOut, User, BarChart2, Clock, Pencil, ChevronLeft, Eye,
  TrendingUp, Award,
} from "lucide-react";
import { analyzeText } from "./services/gemini";
import {
  loginUser, registerUser, updateUserTheme,
  createChat, getUserChats, deleteChat, updateChatTitle,
  saveQuizResult, getChatQuizResults, getUserQuizResults,
} from "./services/pocketbase";

// ─── PDF.js Worker ───────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── Messaggi loading dinamici ────────────────────────────────
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

// ─── Tema helpers ─────────────────────────────────────────────
const THEME_KEY = "ssa_theme";

// ============================================================
// COMPONENTE: ThemeProvider wrapper
// ============================================================
function useTheme(initialTheme = "dark") {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light-mode", theme === "light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = (t) => setThemeState(t);
  return { theme, setTheme };
}

// ============================================================
// COMPONENTE: LoadingScreen
// ============================================================
function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t1 = setInterval(() => setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length), 3000);
    const t2 = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-8 p-10 rounded-3xl card-glass shadow-2xl max-w-md w-full mx-4">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-accent/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-accent2 border-b-transparent border-l-transparent animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-8 h-8 text-accent animate-pulse" />
          </div>
        </div>
        <div className="text-center min-h-[3rem]">
          <p className="text-text-primary text-lg font-medium tracking-wide">
            {LOADING_MESSAGES[msgIndex]}<span className="text-accent">{dots}</span>
          </p>
          <p className="text-text-muted text-sm mt-2">gemini sta elaborando</p>
        </div>
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent via-accent2 to-accent rounded-full animate-[shimmer_2s_linear_infinite] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: AuthPanel (Login / Register)
// ============================================================
function AuthPanel({ onLogin, theme, onToggleTheme }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const { token, record } = await loginUser(email, password);
        onLogin(token, record);
      } else {
        await registerUser(email, password, name);
        const { token, record } = await loginUser(email, password);
        onLogin(token, record);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-base">
      <button
        onClick={onToggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text-primary transition-all"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            gemini · Smart Study AI
          </div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Bentornato
          </h1>
          <p className="text-text-muted">
            {mode === "login" ? "Accedi al tuo spazio di studio" : "Crea il tuo account"}
          </p>
        </div>

        <div className="card-glass rounded-2xl p-6 space-y-4">
          {mode === "register" && (
            <input className={inputClass} placeholder="Nome" value={name}
              onChange={e => setName(e.target.value)} />
          )}
          <input className={inputClass} type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl btn-primary font-semibold transition-all shadow-lg"
          >
            {loading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {mode === "login" ? "Accedi" : "Registrati"}
          </button>

          <p className="text-center text-text-muted text-sm">
            {mode === "login" ? "Non hai un account?" : "Hai già un account?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-accent hover:underline font-medium">
              {mode === "login" ? "Registrati" : "Accedi"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Sidebar — lista chat
// ============================================================
function Sidebar({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat, user, onLogout, theme, onToggleTheme }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const startEdit = (chat, e) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const commitEdit = async (chatId) => {
    if (editTitle.trim()) await onRenameChat(chatId, editTitle.trim());
    setEditingId(null);
  };

  const confirmDelete = (chatId, e) => {
    e.stopPropagation();
    setDeleteConfirm(chatId);
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col h-screen bg-bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <span className="font-bold text-text-primary text-sm">Smart Study AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleTheme}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nuova analisi */}
      <div className="p-3">
        <button onClick={onNewChat}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-sm font-medium transition-all">
          <Plus className="w-4 h-4" />
          Nuova Analisi
        </button>
      </div>

      {/* Lista chat */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {chats.length === 0 ? (
          <div className="text-center text-text-muted text-xs py-8 px-4">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nessuna analisi ancora.<br />Inizia creandone una!
          </div>
        ) : (
          chats.map(chat => (
            <div key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                activeChatId === chat.id
                  ? "bg-accent/15 border border-accent/25 text-text-primary"
                  : "hover:bg-bg-card text-text-muted hover:text-text-primary"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                {editingId === chat.id ? (
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => commitEdit(chat.id)}
                    onKeyDown={e => e.key === "Enter" && commitEdit(chat.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-transparent border-b border-accent text-text-primary text-xs outline-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs font-medium truncate">{chat.title}</p>
                )}
                <p className="text-[10px] text-text-muted mt-0.5">
                  {new Date(chat.created).toLocaleDateString("it-IT")}
                </p>
              </div>
              <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => startEdit(chat, e)}
                  className="p-1 rounded hover:bg-bg-base text-text-muted hover:text-text-primary">
                  <Pencil className="w-3 h-3" />
                </button>
                {deleteConfirm === chat.id ? (
                  <button onClick={e => { e.stopPropagation(); onDeleteChat(chat.id); setDeleteConfirm(null); }}
                    className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
                    <Trash2 className="w-3 h-3" />
                  </button>
                ) : (
                  <button onClick={e => confirmDelete(chat.id, e)}
                    className="p-1 rounded hover:bg-bg-base text-text-muted hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer utente */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-red-400 transition-all">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
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

  const extractPdfText = async (file) => {
    setError(""); setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n\n";
      }
      if (!fullText.trim()) throw new Error("Il PDF non contiene testo selezionabile.");
      setText(fullText.trim());
    } catch (err) {
      setError(`Errore PDF: ${err.message}`); setFileName("");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") extractPdfText(file);
    else setError("Formato non supportato. Carica un file PDF.");
  }, []);

  const handleSubmit = () => {
    if (!text.trim()) { setError("Inserisci del testo o carica un PDF."); return; }
    if (text.trim().length < 100) { setError("Testo troppo breve. Almeno 100 caratteri."); return; }
    setError(""); onAnalyze(text);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-bg-base min-h-screen">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            gemini · Nuova Analisi
          </div>
          <h2 className="text-4xl font-bold text-text-primary tracking-tight">
            Cosa vuoi studiare?
          </h2>
          <p className="text-text-muted">Carica un PDF o incolla il testo da analizzare</p>
        </div>

        <div className="card-glass rounded-2xl p-6 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 hover:bg-bg-card"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => e.target.files[0] && extractPdfText(e.target.files[0])} className="hidden" />
            {fileName ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-accent" />
                <span className="text-accent font-medium">{fileName}</span>
                <button onClick={e => { e.stopPropagation(); setFileName(""); setText(""); }} className="text-text-muted hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-primary font-medium">Trascina un PDF qui</p>
                <p className="text-text-muted text-sm mt-1">oppure clicca per selezionare</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-sm">oppure scrivi direttamente</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Incolla qui appunti, articoli, capitoli di libri..."
            rows={8}
            className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all text-sm leading-relaxed"
          />

          <div className="flex justify-between text-xs text-text-muted">
            <span>{text.length.toLocaleString()} caratteri</span>
            <span>Min. 100 caratteri</span>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={isLoading || !text.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl btn-primary font-semibold transition-all shadow-lg">
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
// COMPONENTE: SummaryTab
// ============================================================
function SummaryTab({ summary }) {
  const paragraphs = summary.split(/\n+/).filter(p => p.trim());
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <BookOpen className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Studio Deep</h2>
          <p className="text-text-muted text-sm">Sintesi strutturata del contenuto</p>
        </div>
      </div>
      <div className="card-glass rounded-2xl p-6 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-text-secondary leading-relaxed text-[15px]">{p}</p>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: GlossaryTab
// ============================================================
function GlossaryTab({ keyConcepts }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent2/10 border border-accent2/20">
          <Layers className="w-5 h-5 text-accent2" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Glossario</h2>
          <p className="text-text-muted text-sm">{keyConcepts.length} concetti chiave identificati</p>
        </div>
      </div>
      <div className="grid gap-3">
        {keyConcepts.map((concept, i) => (
          <div key={i}
            className="card-glass rounded-xl overflow-hidden cursor-pointer hover:border-accent2/30 transition-all"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent2/10 border border-accent2/20 text-accent2 text-xs font-bold">{i + 1}</span>
                <h3 className="text-text-primary font-semibold">{concept.term}</h3>
              </div>
              <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-300 ${expanded === i ? "rotate-90" : ""}`} />
            </div>
            {expanded === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                <p className="text-text-secondary text-sm leading-relaxed">{concept.definition}</p>
                {concept.example && (
                  <div className="flex gap-2 px-3 py-2 rounded-lg bg-accent2/5 border border-accent2/10">
                    <span className="text-accent2 text-xs font-semibold shrink-0 mt-0.5">Esempio:</span>
                    <p className="text-text-muted text-xs leading-relaxed">{concept.example}</p>
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
// COMPONENTE: QuizTab — con salvataggio risultati
// ============================================================
function QuizTab({ quiz, chatId, userId, token, onQuizComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [saving, setSaving] = useState(false);

  const question = quiz[currentQ];
  const isCorrect = selectedAnswer === question?.correctAnswer;
  const percentage = Math.round((score / quiz.length) * 100);

  const handleAnswer = (idx) => {
    if (selectedAnswer !== null) return;
    const correct = idx === question.correctAnswer;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, {
      question: question.question,
      selectedIndex: idx,
      correct,
      correctIndex: question.correctAnswer,
    }]);
  };

  const handleNext = () => {
    if (currentQ + 1 >= quiz.length) {
      finishQuiz();
    } else {
      setCurrentQ(q => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const finishQuiz = async () => {
    setCompleted(true);
    // Calcola score finale (già aggiornato se l'ultima era corretta)
    const finalScore = answers.filter(a => a.correct).length + (isCorrect ? 0 : 0);
    const realScore = answers.filter(a => a.correct).length;
    setSaving(true);
    try {
      await saveQuizResult(chatId, userId, realScore + (isCorrect ? 1 : 0), quiz.length, [...answers], token);
      onQuizComplete?.();
    } catch (e) {
      console.error("Errore salvataggio quiz:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentQ(0); setSelectedAnswer(null);
    setShowExplanation(false); setScore(0);
    setCompleted(false); setAnswers([]);
  };

  if (completed) {
    const finalPerc = Math.round((answers.filter(a => a.correct).length / quiz.length) * 100);
    return (
      <div className="animate-fade-in">
        <div className="card-glass rounded-2xl p-8 text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent2/20 border border-accent/30 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-text-primary">{finalPerc}%</h2>
            <p className="text-text-muted mt-1">
              {answers.filter(a => a.correct).length} su {quiz.length} risposte corrette
            </p>
            {saving && <p className="text-text-muted text-xs mt-1">Salvataggio in corso...</p>}
            {!saving && <p className="text-emerald-400 text-xs mt-1">✓ Risultato salvato</p>}
          </div>
          <div className="w-full h-3 bg-bg-card rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              finalPerc >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-400"
              : finalPerc >= 50 ? "bg-gradient-to-r from-yellow-500 to-orange-400"
              : "bg-gradient-to-r from-red-500 to-rose-400"
            }`} style={{ width: `${finalPerc}%` }} />
          </div>
          <div className="px-4 py-3 rounded-xl bg-bg-card border border-border">
            <p className="text-text-secondary text-sm">
              {finalPerc >= 90 ? "🏆 Eccellente! Padronanza completa." :
               finalPerc >= 70 ? "✅ Buon risultato! Concetti fondamentali appresi." :
               finalPerc >= 50 ? "📚 Sufficiente. Rivedi il Glossario." :
               "🔄 Serve più studio. Rileggi il riassunto."}
            </p>
          </div>
          <div className="text-left space-y-2">
            <p className="text-text-muted text-sm font-medium">Riepilogo:</p>
            {answers.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {a.correct
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                <span className="text-text-muted line-clamp-1">{a.question}</span>
              </div>
            ))}
          </div>
          <button onClick={handleReset}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-bg-card hover:bg-border border border-border text-text-primary transition-all">
            <RotateCcw className="w-4 h-4" />Riprova il Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <GraduationCap className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Simulazione Esame</h2>
            <span className="text-text-muted text-sm">{currentQ + 1} / {quiz.length}</span>
          </div>
          <div className="w-full h-1.5 bg-bg-card rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentQ + 1) / quiz.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="card-glass rounded-2xl p-6 space-y-5">
        {question.bloomLevel && (
          <span className="inline-block px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
            🎯 {question.bloomLevel}
          </span>
        )}
        <h3 className="text-text-primary font-semibold text-lg leading-snug">{question.question}</h3>
        <div className="space-y-2.5">
          {question.options.map((option, idx) => {
            let cls = "w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 ";
            if (selectedAnswer === null)
              cls += "border-border bg-bg-card hover:border-accent/40 hover:bg-accent/5 text-text-secondary cursor-pointer";
            else if (idx === question.correctAnswer)
              cls += "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
            else if (idx === selectedAnswer && !isCorrect)
              cls += "border-red-500/50 bg-red-500/10 text-red-300";
            else
              cls += "border-border/30 bg-bg-card/30 text-text-muted cursor-default";
            return (
              <button key={idx} onClick={() => handleAnswer(idx)} disabled={selectedAnswer !== null} className={cls}>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-left leading-snug">{option}</span>
                  {selectedAnswer !== null && idx === question.correctAnswer &&
                    <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto shrink-0 mt-0.5" />}
                  {selectedAnswer === idx && !isCorrect &&
                    <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>
        {showExplanation && (
          <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
            isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <p className={`font-semibold mb-1 ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
              {isCorrect ? "✅ Risposta corretta!" : "❌ Risposta errata"}
            </p>
            <p className="text-text-secondary leading-relaxed">{question.explanation}</p>
          </div>
        )}
        {selectedAnswer !== null && (
          <button onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-primary font-semibold transition-all">
            {currentQ + 1 >= quiz.length ? <><Trophy className="w-4 h-4" />Vedi Risultato</> : <>Prossima<ChevronRight className="w-4 h-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: QuizHistory — storico quiz di una chat
// ============================================================
function QuizHistory({ chatId, token }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !token) return;
    setLoading(true);
    getChatQuizResults(chatId, token)
      .then(items => {
        setResults(items.map(r => ({
          ...r,
          answers: typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers,
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [chatId, token]);

  if (loading) return <div className="text-text-muted text-sm text-center py-4">Caricamento storico...</div>;
  if (results.length === 0) return (
    <div className="text-center text-text-muted text-sm py-8">
      <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
      Nessun quiz completato ancora per questa analisi.
    </div>
  );

  const avg = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length);
  const best = Math.max(...results.map(r => r.percentage));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <BarChart2 className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Progressi Quiz</h2>
          <p className="text-text-muted text-sm">{results.length} tentativ{results.length === 1 ? "o" : "i"} completati</p>
        </div>
      </div>

      {/* Stats veloci */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Media", value: `${avg}%`, icon: TrendingUp, color: "accent" },
          { label: "Miglior score", value: `${best}%`, icon: Award, color: "yellow-400" },
          { label: "Tentativi", value: results.length, icon: RotateCcw, color: "accent2" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card-glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-text-muted text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Lista tentativi */}
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={r.id} className="card-glass rounded-xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              r.percentage >= 70 ? "bg-emerald-500/20 text-emerald-400"
              : r.percentage >= 50 ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"}`}>
              {r.percentage}%
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary text-sm font-medium">
                  Tentativo #{results.length - i}
                </span>
                <span className="text-text-muted text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(r.created).toLocaleString("it-IT")}
                </span>
              </div>
              <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  r.percentage >= 70 ? "bg-emerald-500" : r.percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                }`} style={{ width: `${r.percentage}%` }} />
              </div>
              <p className="text-text-muted text-xs mt-1">{r.score} / {r.total} corrette</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: ChatDashboard — dashboard di una chat aperta
// ============================================================
function ChatDashboard({ chat, user, token, onBack }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [quizKey, setQuizKey] = useState(0); // forza re-mount del quiz

  const studyData = {
    summary: chat.summary,
    keyConcepts: typeof chat.key_concepts === "string" ? JSON.parse(chat.key_concepts) : chat.key_concepts,
    quiz: typeof chat.quiz === "string" ? JSON.parse(chat.quiz) : chat.quiz,
  };

  const tabs = [
    { id: "summary", label: "Studio Deep", icon: BookOpen },
    { id: "glossary", label: "Glossario", icon: Layers },
    { id: "quiz", label: "Simulazione Esame", icon: GraduationCap },
    { id: "history", label: "Progressi", icon: BarChart2 },
  ];

  return (
    <div className="flex-1 flex flex-col bg-bg-base">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button onClick={onBack}
          className="p-2 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-text-primary font-bold text-lg truncate">{chat.title}</h1>
          <p className="text-text-muted text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(chat.created).toLocaleString("it-IT")} · gemini
          </p>
        </div>
        {activeTab === "quiz" && (
          <button onClick={() => setQuizKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text-primary text-xs transition-all">
            <RotateCcw className="w-3 h-3" />Rifai quiz
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-6">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
        {activeTab === "summary" && <SummaryTab summary={studyData.summary} />}
        {activeTab === "glossary" && <GlossaryTab keyConcepts={studyData.keyConcepts} />}
        {activeTab === "quiz" && (
          <QuizTab
            key={quizKey}
            quiz={studyData.quiz}
            chatId={chat.id}
            userId={user.id}
            token={token}
            onQuizComplete={() => {
              // Quando il quiz finisce, se torna alla scheda history si aggiorna
            }}
          />
        )}
        {activeTab === "history" && <QuizHistory chatId={chat.id} token={token} />}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-3 text-center text-text-muted text-xs">
        gemini · Smart Study AI · Sessione persistente su PocketBase
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPALE: App
// ============================================================
export default function App() {
  // ─── Auth state ───────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem("ssa_token") || null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ssa_user") || "null"); } catch { return null; }
  });

  // ─── Theme ───────────────────────────────────────────────
  const savedTheme = user?.theme || localStorage.getItem(THEME_KEY) || "dark";
  const { theme, setTheme } = useTheme(savedTheme);

  // ─── Chat state ───────────────────────────────────────────
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // chat aperta
  const [view, setView] = useState("upload"); // "upload" | "dashboard"

  // ─── Loading / error ──────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ─── Carica le chat dell'utente ───────────────────────────
  const loadChats = useCallback(async () => {
    if (!user || !token) return;
    try {
      const items = await getUserChats(user.id, token);
      setChats(items);
    } catch (e) {
      console.error("Errore caricamento chat:", e);
    }
  }, [user, token]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // ─── Sync tema su PocketBase quando cambia ────────────────
  const handleToggleTheme = useCallback(async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (user && token) {
      try {
        const updated = await updateUserTheme(user.id, newTheme, token);
        const updatedUser = { ...user, theme: updated.theme };
        setUser(updatedUser);
        localStorage.setItem("ssa_user", JSON.stringify(updatedUser));
      } catch (e) {
        console.error("Errore aggiornamento tema:", e);
      }
    }
  }, [theme, setTheme, user, token]);

  // ─── Login ────────────────────────────────────────────────
  const handleLogin = (newToken, record) => {
    setToken(newToken);
    setUser(record);
    localStorage.setItem("ssa_token", newToken);
    localStorage.setItem("ssa_user", JSON.stringify(record));
    if (record.theme) setTheme(record.theme);
  };

  // ─── Logout ───────────────────────────────────────────────
  const handleLogout = () => {
    setToken(null); setUser(null);
    setChats([]); setActiveChat(null);
    setView("upload");
    localStorage.removeItem("ssa_token");
    localStorage.removeItem("ssa_user");
  };

  // ─── Nuova analisi ────────────────────────────────────────
  const handleAnalyze = async (text) => {
    setIsLoading(true); setError("");
    try {
      const data = await analyzeText(text);

      // Genera un titolo automatico dalla prima frase del summary
      const autoTitle = data.summary.split(/[.!?]/)[0].trim().slice(0, 60) || "Nuova analisi";

      const newChat = await createChat(user.id, autoTitle, data, token);
      // Ricarica lista chat
      await loadChats();
      // Apri direttamente la nuova chat
      const fullChat = {
        ...newChat,
        title: autoTitle,
        summary: data.summary,
        key_concepts: JSON.stringify(data.keyConcepts),
        quiz: JSON.stringify(data.quiz),
      };
      setActiveChat(fullChat);
      setView("dashboard");
    } catch (err) {
      setError(err.message || "Errore durante l'analisi. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Seleziona chat dalla sidebar ─────────────────────────
  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setView("dashboard");
  };

  // ─── Elimina chat ─────────────────────────────────────────
  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId, token);
      if (activeChat?.id === chatId) { setActiveChat(null); setView("upload"); }
      await loadChats();
    } catch (e) {
      console.error("Errore eliminazione:", e);
    }
  };

  // ─── Rinomina chat ────────────────────────────────────────
  const handleRenameChat = async (chatId, title) => {
    try {
      await updateChatTitle(chatId, title, token);
      await loadChats();
    } catch (e) {
      console.error("Errore rinomina:", e);
    }
  };

  // ─── Non autenticato ──────────────────────────────────────
  if (!token || !user) {
    return (
      <AuthPanel
        onLogin={handleLogin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // ─── App principale ───────────────────────────────────────
  return (
    <div className={`flex h-screen overflow-hidden bg-bg-base ${theme}`}>
      {isLoading && <LoadingScreen />}

      {/* Sidebar */}
      <Sidebar
        chats={chats}
        activeChatId={activeChat?.id}
        onSelectChat={handleSelectChat}
        onNewChat={() => { setActiveChat(null); setView("upload"); }}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Contenuto principale */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {view === "upload" || !activeChat ? (
          <div className="flex-1 overflow-y-auto relative">
            <UploadPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
            {error && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm shadow-xl backdrop-blur-lg max-w-md z-40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
                <button onClick={() => setError("")} className="ml-2 hover:text-red-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <ChatDashboard
            chat={activeChat}
            user={user}
            token={token}
            onBack={() => { setActiveChat(null); setView("upload"); }}
          />
        )}
      </main>
    </div>
  );
}
