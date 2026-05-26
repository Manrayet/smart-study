import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  BookOpen, Brain, FileText, Upload, Sparkles, ChevronRight,
  CheckCircle, XCircle, RotateCcw, Trophy, Layers, GraduationCap,
  AlertCircle, X, MessageSquare, Trash2, Plus, Sun, Moon,
  LogOut, User, BarChart2, Clock, Pencil, ChevronLeft, Eye,
  TrendingUp, Award, Menu, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { analyzeText } from "./services/gemini";
import {
  supabase, loginUser, registerUser, logoutUser,
  getSession, onAuthChange, updateUserTheme, getUserProfile,
  createChat, getUserChats, deleteChat, updateChatTitle,
  saveQuizResult, getChatQuizResults,
  checkGenerationLimit, DAILY_GENERATION_LIMIT,
} from "./services/supabase";

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
// HOOK: useTheme
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
// HOOK: useIsMobile
// ============================================================
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);
  return isMobile;
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
      <div className="flex flex-col items-center gap-8 p-8 rounded-3xl card-glass shadow-2xl max-w-sm w-full mx-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-accent/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-accent2 border-b-transparent border-l-transparent animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-7 h-7 text-accent animate-pulse" />
          </div>
        </div>
        <div className="text-center min-h-[3rem]">
          <p className="text-text-primary text-base font-medium tracking-wide">
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
        const { user } = await loginUser(email, password);
        onLogin(user);
      } else {
        const { user } = await registerUser(email, password, name);
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-bg-base">
      <button
        onClick={onToggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text-primary transition-all z-10"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Smart Study AI
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            {mode === "login" ? "Bentornato" : "Crea account"}
          </h1>
          <p className="text-text-muted text-sm sm:text-base">
            {mode === "login" ? "Accedi al tuo spazio di studio" : "Inizia a studiare con l'AI"}
          </p>
        </div>

        <div className="card-glass rounded-2xl p-5 sm:p-6 space-y-4">
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
// COMPONENTE: Sidebar — lista chat (responsive)
// ============================================================
function Sidebar({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat,
                   user, onLogout, theme, onToggleTheme, isOpen, isCollapsed, onClose, onToggleCollapse, isMobile }) {
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

  // Classi dinamiche per la sidebar
  const sidebarClass = [
    "sidebar-desktop",
    isMobile ? (isOpen ? "open" : "") : (isCollapsed ? "collapsed" : ""),
  ].filter(Boolean).join(" ");

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`sidebar-overlay ${isMobile && isOpen ? "visible" : ""}`}
        onClick={onClose}
      />

      <aside className={sidebarClass}>
        {/* Header sidebar */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
              <Brain className="w-5 h-5 text-accent" />
            </div>
            <span className="font-bold text-text-primary text-sm truncate">Smart Study AI</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onToggleTheme}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Pulsante chiudi: X su mobile, freccia su desktop */}
            {isMobile ? (
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all">
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onToggleCollapse}
                className="sidebar-collapse-btn p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all"
                title="Comprimi sidebar">
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Nuova analisi */}
        <div className="p-3 shrink-0">
          <button onClick={() => { onNewChat(); if (isMobile) onClose(); }}
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
                onClick={() => { onSelectChat(chat); if (isMobile) onClose(); }}
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
                    {new Date(chat.created_at).toLocaleDateString("it-IT")}
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
        <div className="p-3 border-t border-border shrink-0">
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
    </>
  );
}

// ============================================================
// COMPONENTE: MobileTopbar — barra superiore su mobile
// ============================================================
function MobileTopbar({ onOpenSidebar, title, theme, onToggleTheme }) {
  return (
    <div className="mobile-topbar">
      <button
        onClick={onOpenSidebar}
        className="p-2 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all shrink-0"
        aria-label="Apri menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
          <Brain className="w-4 h-4 text-accent" />
        </div>
        <span className="font-bold text-text-primary text-sm truncate">
          {title || "Smart Study AI"}
        </span>
      </div>

    </div>
  );
}

// ============================================================
// COMPONENTE: SidebarToggleDesktop — pulsante per riaprire la sidebar (solo desktop)
// ============================================================
function SidebarToggleDesktop({ onOpen, visible }) {
  if (!visible) return null;
  return (
    <button
      onClick={onOpen}
      className="hidden md:flex items-center justify-center w-9 h-9 mt-4 ml-2 rounded-lg hover:bg-bg-card border border-border text-text-muted hover:text-text-primary transition-all shrink-0 self-start"
      title="Espandi sidebar"
    >
      <PanelLeftOpen className="w-4 h-4" />
    </button>
  );
}

// ============================================================
// COMPONENTE: UploadPanel
// ============================================================
function UploadPanel({ onAnalyze, isLoading, genLimit }) {
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
    <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-bg-base">
      <div className="w-full max-w-2xl space-y-5 py-4">
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs sm:text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Nuova Analisi
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Cosa vuoi studiare?
          </h2>
          <p className="text-text-muted text-sm sm:text-base">Carica un PDF o incolla il testo da analizzare</p>
        </div>

        <div className="card-glass rounded-2xl p-4 sm:p-6 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 hover:bg-bg-card"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => e.target.files[0] && extractPdfText(e.target.files[0])} className="hidden" />
            {fileName ? (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <FileText className="w-5 h-5 text-accent shrink-0" />
                <span className="text-accent font-medium text-sm truncate max-w-[200px]">{fileName}</span>
                <button onClick={e => { e.stopPropagation(); setFileName(""); setText(""); }} className="text-text-muted hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-text-muted mx-auto mb-2 sm:mb-3" />
                <p className="text-text-primary font-medium text-sm sm:text-base">Trascina un PDF qui</p>
                <p className="text-text-muted text-xs sm:text-sm mt-1">oppure tocca per selezionare</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-xs sm:text-sm whitespace-nowrap">oppure scrivi direttamente</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Incolla qui appunti, articoli, capitoli di libri..."
            rows={6}
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

          {genLimit && (
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm ${
              genLimit.remaining === 0
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : genLimit.remaining <= 2
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-accent/10 border-accent/20 text-accent"
            }`}>
              <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Analisi rimanenti oggi
              </span>
              <span className="font-bold text-sm sm:text-base ml-2">
                {genLimit.remaining} / {DAILY_GENERATION_LIMIT}
              </span>
            </div>
          )}

          <button onClick={handleSubmit}
            disabled={isLoading || !text.trim() || genLimit?.remaining === 0}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl btn-primary font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">
              {genLimit?.remaining === 0 ? "Limite giornaliero raggiunto" : "Genera Dashboard"}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0" />
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
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <BookOpen className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Studio Deep</h2>
          <p className="text-text-muted text-xs sm:text-sm">Sintesi strutturata del contenuto</p>
        </div>
      </div>
      <div className="card-glass rounded-2xl p-4 sm:p-6 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-text-secondary leading-relaxed text-sm sm:text-[15px]">{p}</p>
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
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Glossario</h2>
          <p className="text-text-muted text-xs sm:text-sm">{keyConcepts.length} concetti chiave identificati</p>
        </div>
      </div>
      <div className="grid gap-3">
        {keyConcepts.map((concept, i) => (
          <div key={i}
            className="card-glass rounded-xl overflow-hidden cursor-pointer hover:border-accent2/30 transition-all"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-accent2/10 border border-accent2/20 text-accent2 text-xs font-bold">{i + 1}</span>
                <h3 className="text-text-primary font-semibold text-sm sm:text-base truncate">{concept.term}</h3>
              </div>
              <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-300 shrink-0 ml-2 ${expanded === i ? "rotate-90" : ""}`} />
            </div>
            {expanded === i && (
              <div className="px-3 sm:px-4 pb-4 space-y-3 border-t border-border pt-3">
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
// COMPONENTE: QuizTab
// ============================================================
function QuizTab({ quiz, chatId, userId, onQuizComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [saving, setSaving] = useState(false);

  const question = quiz[currentQ];
  const isCorrect = selectedAnswer === question?.correctAnswer;

  const handleAnswer = (idx) => {
    if (selectedAnswer !== null) return;
    const correct = idx === question.correctAnswer;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, {
      question: question.question,
      selectedIndex: idx, correct,
      correctIndex: question.correctAnswer,
    }]);
  };

  const handleNext = () => {
    if (currentQ + 1 >= quiz.length) finishQuiz();
    else { setCurrentQ(q => q + 1); setSelectedAnswer(null); setShowExplanation(false); }
  };

  const finishQuiz = async () => {
    setCompleted(true);
    const finalAnswers = [...answers];
    const realScore = finalAnswers.filter(a => a.correct).length;
    setSaving(true);
    try {
      await saveQuizResult(chatId, userId, realScore, quiz.length, finalAnswers);
      onQuizComplete?.();
    } catch (e) { console.error("Errore salvataggio quiz:", e); }
    finally { setSaving(false); }
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
        <div className="card-glass rounded-2xl p-5 sm:p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-accent2/20 border border-accent/30 flex items-center justify-center mx-auto">
            <Trophy className="w-9 h-9 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-text-primary">{finalPerc}%</h2>
            <p className="text-text-muted mt-1 text-sm">
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
              {finalPerc >= 90 ? "Eccellente! Padronanza completa." :
               finalPerc >= 70 ? "Buon risultato! Concetti fondamentali appresi." :
               finalPerc >= 60 ? "Sufficiente. Rivedi il Glossario." :
               "Serve più studio. Rileggi il riassunto."}
            </p>
          </div>
          <div className="text-left space-y-2 max-h-48 overflow-y-auto">
            <p className="text-text-muted text-sm font-medium">Riepilogo:</p>
            {answers.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {a.correct
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                <span className="text-text-muted line-clamp-1 text-xs sm:text-sm">{a.question}</span>
              </div>
            ))}
          </div>
          <button onClick={handleReset}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-bg-card hover:bg-border border border-border text-text-primary transition-all text-sm">
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
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">Simulazione Esame</h2>
            <span className="text-text-muted text-sm">{currentQ + 1} / {quiz.length}</span>
          </div>
          <div className="w-full h-1.5 bg-bg-card rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentQ + 1) / quiz.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="card-glass rounded-2xl p-4 sm:p-6 space-y-4">
        {question.bloomLevel && (
          <span className="inline-block px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
            {question.bloomLevel}
          </span>
        )}
        <h3 className="text-text-primary font-semibold text-base sm:text-lg leading-snug">{question.question}</h3>
        <div className="space-y-2.5">
          {question.options.map((option, idx) => {
            let cls = "w-full text-left px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border text-sm transition-all duration-200 ";
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
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-left leading-snug flex-1">{option}</span>
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
          <div className={`p-3 sm:p-4 rounded-xl border text-sm leading-relaxed ${
            isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <p className={`font-semibold mb-1 ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
              {isCorrect ? "Risposta corretta!" : "Risposta errata"}
            </p>
            <p className="text-text-secondary leading-relaxed text-sm">{question.explanation}</p>
          </div>
        )}
        {selectedAnswer !== null && (
          <button onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-primary font-semibold transition-all text-sm sm:text-base">
            {currentQ + 1 >= quiz.length ? <><Trophy className="w-4 h-4" />Vedi Risultato</> : <>Prossima<ChevronRight className="w-4 h-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: QuizHistory
// ============================================================
function QuizHistory({ chatId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    getChatQuizResults(chatId)
      .then(items => setResults(items.map(r => ({
        ...r,
        answers: typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers,
      }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [chatId]);

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
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Progressi Quiz</h2>
          <p className="text-text-muted text-xs sm:text-sm">{results.length} tentativ{results.length === 1 ? "o" : "i"} completati</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Media", value: `${avg}%`, icon: TrendingUp },
          { label: "Miglior score", value: `${best}%`, icon: Award },
          { label: "Tentativi", value: results.length, icon: RotateCcw },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card-glass rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-text-muted text-[10px] sm:text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={r.id} className="card-glass rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
              r.percentage >= 70 ? "bg-emerald-500/20 text-emerald-400"
              : r.percentage >= 60 ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"}`}>
              {r.percentage}%
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-text-primary text-xs sm:text-sm font-medium truncate">
                  Tentativo #{results.length - i}
                </span>
                <span className="text-text-muted text-[10px] sm:text-xs flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">{new Date(r.created).toLocaleString("it-IT")}</span>
                  <span className="sm:hidden">{new Date(r.created).toLocaleDateString("it-IT")}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  r.percentage >= 70 ? "bg-emerald-500" : r.percentage >= 60 ? "bg-yellow-500" : "bg-red-500"
                }`} style={{ width: `${r.percentage}%` }} />
              </div>
              <p className="text-text-muted text-[10px] sm:text-xs mt-1">{r.number} / {r.total} corrette</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: ChatDashboard
// ============================================================
function ChatDashboard({ chat, user, onBack, onOpenSidebar, isMobile }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [quizKey, setQuizKey] = useState(0);

  const studyData = {
    summary: chat.summary,
    keyConcepts: typeof chat.key_concepts === "string" ? JSON.parse(chat.key_concepts) : chat.key_concepts,
    quiz: typeof chat.quiz === "string" ? JSON.parse(chat.quiz) : chat.quiz,
  };

  const tabs = [
    { id: "summary",  label: "Studio Deep",      icon: BookOpen },
    { id: "glossary", label: "Glossario",         icon: Layers },
    { id: "quiz",     label: "Esame",             icon: GraduationCap },
    { id: "history",  label: "Progressi",         icon: BarChart2 },
  ];

  return (
    <div className="flex-1 flex flex-col bg-bg-base min-h-0">
      {/* Header — nascosto su mobile (gestito dalla MobileTopbar) */}
      <div className="hidden md:flex border-b border-border px-5 py-3.5 items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-text-primary font-bold text-base sm:text-lg truncate">{chat.title}</h1>
          <p className="text-text-muted text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(chat.created_at).toLocaleString("it-IT")}
            </p>
        </div>
        {activeTab === "quiz" && (
          <button onClick={() => setQuizKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text-primary text-xs transition-all">
            <RotateCcw className="w-3 h-3" />Rifai quiz
          </button>
        )}
      </div>

      {/* Header mobile — info chat sotto la MobileTopbar */}
      <div className="md:hidden border-b border-border px-4 py-2.5 flex items-center gap-2">
        <button onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-all shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-semibold text-sm truncate">{chat.title}</p>
          <p className="text-text-muted text-[10px]">{new Date(chat.created_at).toLocaleDateString("it-IT")}</p>
        </div>
        {activeTab === "quiz" && (
          <button onClick={() => setQuizKey(k => k + 1)}
            className="p-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text-primary transition-all">
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-3 sm:px-6 shrink-0">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 max-w-3xl w-full mx-auto">
        {activeTab === "summary"  && <SummaryTab summary={studyData.summary} />}
        {activeTab === "glossary" && <GlossaryTab keyConcepts={studyData.keyConcepts} />}
        {activeTab === "quiz"     && <QuizTab key={quizKey} quiz={studyData.quiz} chatId={chat.id} userId={user.id} onQuizComplete={() => {}} />}
        {activeTab === "history"  && <QuizHistory chatId={chat.id} />}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPALE: App
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const savedTheme = user?.user_metadata?.theme || localStorage.getItem(THEME_KEY) || "dark";
  const { theme, setTheme } = useTheme(savedTheme);

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [view, setView] = useState("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [genLimit, setGenLimit] = useState({ count: 0, remaining: DAILY_GENERATION_LIMIT, canGenerate: true });

  // ─── Responsive sidebar state ─────────────────────────────
  const isMobile = useIsMobile(768);
  const [sidebarOpen, setSidebarOpen] = useState(false);     // mobile: drawer aperto/chiuso
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop: compressa/espansa

  // Chiudi la sidebar mobile quando si passa a desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // ─── Session ──────────────────────────────────────────────
  useEffect(() => {
    getSession().then(async session => {
      if (session?.user) {
        setUser(session.user);
        // Carica il tema dal database (source of truth)
        try {
          const profile = await getUserProfile(session.user.id);
          if (profile?.theme) setTheme(profile.theme);
        } catch (e) {
          console.error("Errore caricamento tema dal profilo:", e);
          // Fallback ai metadati se il DB non è disponibile
          if (session.user.user_metadata?.theme) setTheme(session.user.user_metadata.theme);
        }
      }
      setSessionReady(true);
    });
    const sub = onAuthChange(session => {
      setUser(session?.user || null);
      if (!session) { setChats([]); setActiveChat(null); setView("upload"); }
    });
    return () => sub.unsubscribe();
  }, []);

  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      const [items, limit] = await Promise.all([
        getUserChats(user.id),
        checkGenerationLimit(user.id),
      ]);
      setChats(items);
      setGenLimit(limit);
    } catch (e) { console.error("Errore caricamento chat:", e); }
  }, [user]);

  useEffect(() => { loadChats(); }, [loadChats]);

  const handleToggleTheme = useCallback(async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (user) {
      try { await updateUserTheme(user.id, newTheme); }
      catch (e) { console.error("Errore aggiornamento tema:", e); }
    }
  }, [theme, setTheme, user]);

  const handleLogin = async (supabaseUser) => {
    setUser(supabaseUser);
    // Carica il tema dal database (source of truth)
    try {
      const profile = await getUserProfile(supabaseUser.id);
      if (profile?.theme) setTheme(profile.theme);
    } catch (e) {
      console.error("Errore caricamento tema dal profilo:", e);
      // Fallback ai metadati se il DB non è disponibile
      if (supabaseUser.user_metadata?.theme) setTheme(supabaseUser.user_metadata.theme);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null); setChats([]); setActiveChat(null); setView("upload");
  };

  const handleAnalyze = async (text) => {
    setIsLoading(true); setError("");
    try {
      const limit = await checkGenerationLimit(user.id);
      if (!limit.canGenerate) throw new Error(`Hai raggiunto il limite di ${DAILY_GENERATION_LIMIT} analisi al giorno.`);
      const data = await analyzeText(text);
      const autoTitle = data.summary.split(/[.!?]/)[0].trim().slice(0, 60) || "Nuova analisi";
      const newChat = await createChat(user.id, autoTitle, data);
      await loadChats();
      const fullChat = {
        ...newChat,
        summary: data.summary,
        key_concepts: newChat.key_concepts ?? data.keyConcepts,
        quiz: newChat.quiz ?? data.quiz,
      };
      setActiveChat(fullChat);
      setView("dashboard");
    } catch (err) {
      setError(err.message || "Errore durante l'analisi. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = (chat) => { setActiveChat(chat); setView("dashboard"); };
  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      if (activeChat?.id === chatId) { setActiveChat(null); setView("upload"); }
      await loadChats();
    } catch (e) { console.error("Errore eliminazione:", e); }
  };
  const handleRenameChat = async (chatId, title) => {
    try { await updateChatTitle(chatId, title); await loadChats(); }
    catch (e) { console.error("Errore rinomina:", e); }
  };

  if (!sessionReady) return null;
  if (!user) return <AuthPanel onLogin={handleLogin} theme={theme} onToggleTheme={handleToggleTheme} />;

  // Titolo da mostrare nella MobileTopbar
  const mobileTitle = activeChat ? activeChat.title : "Smart Study AI";

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
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        isMobile={isMobile}
      />

      {/* Pulsante per riaprire sidebar su desktop quando è collassata */}
      <SidebarToggleDesktop
        onOpen={() => setSidebarCollapsed(false)}
        visible={!isMobile && sidebarCollapsed}
      />

      {/* Contenuto principale */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* MobileTopbar — visibile solo su mobile */}
        <MobileTopbar
          onOpenSidebar={() => setSidebarOpen(true)}
          title={mobileTitle}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {view === "upload" || !activeChat ? (
          <div className="flex-1 overflow-y-auto relative">
            <UploadPanel onAnalyze={handleAnalyze} isLoading={isLoading} genLimit={genLimit} />
            {error && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm shadow-xl backdrop-blur-lg max-w-sm w-[calc(100%-2rem)] z-40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-xs sm:text-sm">{error}</span>
                <button onClick={() => setError("")} className="ml-1 hover:text-red-300 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <ChatDashboard
            chat={activeChat}
            user={user}
            onBack={() => { setActiveChat(null); setView("upload"); }}
            onOpenSidebar={() => setSidebarOpen(true)}
            isMobile={isMobile}
          />
        )}
      </main>
    </div>
  );
}