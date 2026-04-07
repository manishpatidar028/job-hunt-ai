-- ============================================================
-- Job Hunt AI — Initial Schema (Session 2)
-- Run this in Supabase SQL Editor
-- ============================================================

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  cv_text text,
  cv_url text,
  preferences jsonb default '{}'::jsonb,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SKILLS TABLE
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  years_experience numeric default 0,
  level text check (level in ('expert','strong','familiar','learning')) default 'familiar',
  category text check (category in ('frontend','backend','devops','database','mobile','ai_ml','tools','soft')) default 'tools',
  is_primary boolean default false,
  is_hidden boolean default false,
  source text check (source in ('cv_extracted','manual')) default 'cv_extracted',
  created_at timestamptz default now()
);

-- JOBS TABLE
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  company text,
  location text,
  remote_type text check (remote_type in ('remote','hybrid','onsite')),
  salary_min numeric,
  salary_max numeric,
  currency text default 'INR',
  jd_text text,
  jd_url text,
  source text default 'manual',
  rule_score numeric,
  ai_score numeric,
  score_breakdown jsonb default '{}'::jsonb,
  status text default 'new' check (status in ('new','reviewing','applied','responded','interview','offer','rejected','skipped')),
  discovered_at timestamptz default now(),
  applied_at timestamptz
);

-- RLS
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.jobs enable row level security;

create policy "Users own their profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users own their skills" on public.skills
  for all using (auth.uid() = user_id);

create policy "Users own their jobs" on public.jobs
  for all using (auth.uid() = user_id);

-- AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- UPDATED_AT TRIGGER
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- STORAGE BUCKET
-- In Supabase dashboard: Storage → New bucket → name: "cvs" → private → 10MB limit
-- Then run these policies:
-- ============================================================
-- create policy "Users can upload their own CV"
--   on storage.objects for insert
--   with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users can read their own CV"
--   on storage.objects for select
--   using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
