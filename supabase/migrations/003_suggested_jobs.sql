-- ============================================================
-- Job Hunt AI — Suggested Jobs (nightly auto-discovery)
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE public.suggested_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  company TEXT,
  location TEXT,
  remote_type TEXT CHECK (remote_type IN ('remote', 'hybrid', 'onsite')),
  jd_text TEXT,
  jd_url TEXT,
  source TEXT NOT NULL DEFAULT 'cron',
  rule_score FLOAT DEFAULT 0,
  matched_skills JSONB DEFAULT '[]'::jsonb,
  missing_primary JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'proceeded')),
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate jobs per user by URL
CREATE UNIQUE INDEX suggested_jobs_user_url_idx
  ON public.suggested_jobs(user_id, jd_url)
  WHERE jd_url IS NOT NULL;

-- Prevent duplicate jobs per user by title+company
CREATE UNIQUE INDEX suggested_jobs_user_title_company_idx
  ON public.suggested_jobs(user_id, lower(title), lower(company))
  WHERE title IS NOT NULL AND company IS NOT NULL;

ALTER TABLE public.suggested_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their suggested jobs"
  ON public.suggested_jobs FOR ALL
  USING (auth.uid() = user_id);
