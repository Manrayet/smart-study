-- ============================================================
-- Smart Study AI — Supabase Setup
-- Esegui questo script nell'SQL Editor del tuo progetto Supabase:
-- Dashboard → SQL Editor → New query → incolla → Run
-- ============================================================


-- ─────────────────────────────────────────────
-- 1. TABELLA: profiles
-- Estende auth.users con nome e preferenza tema
-- ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  theme      TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crea il profilo automaticamente alla registrazione
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede solo il proprio profilo"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Utente aggiorna solo il proprio profilo"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ─────────────────────────────────────────────
-- 2. TABELLA: chats
-- Ogni analisi AI è una chat separata
-- ─────────────────────────────────────────────
CREATE TABLE public.chats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  summary      TEXT,
  key_concepts JSONB,
  quiz         JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede solo le proprie chat"
  ON public.chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utente crea chat autenticato"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utente aggiorna solo le proprie chat"
  ON public.chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Utente elimina solo le proprie chat"
  ON public.chats FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- 3. TABELLA: quiz_results
-- Ogni tentativo quiz salvato separatamente
-- ─────────────────────────────────────────────
CREATE TABLE public.quiz_results (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  answers    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede solo i propri risultati"
  ON public.quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utente salva risultati autenticato"
  ON public.quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utente elimina solo i propri risultati"
  ON public.quiz_results FOR DELETE
  USING (auth.uid() = user_id);
