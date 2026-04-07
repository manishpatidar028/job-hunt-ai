-- Session 5: Add prep_cache column to jobs table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS prep_cache jsonb DEFAULT '{}'::jsonb;
