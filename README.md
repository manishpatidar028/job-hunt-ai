# JobHunt AI

> Your personal AI recruiter that never sleeps.

JobHunt AI helps you cut through the noise of job hunting. Paste a job description, get an honest AI match score against your actual skills. Discover fresh jobs every morning from Greenhouse, Lever, RemoteOK, and more — without lifting a finger. Track applications in a Kanban board. Prep for interviews with AI-generated questions tailored to the role.

Built for engineers who are serious about their next move.

---

## What it does

| Feature | Description |
|---|---|
| **CV Parser** | Upload a PDF or paste text — AI extracts your skills, experience, and domains |
| **Job Evaluator** | Paste a JD or URL, get a 0–5 AI match score with breakdown and gap analysis |
| **Job Discovery** | Scans Greenhouse, Lever, RemoteOK, Remotive, and Adzuna in parallel |
| **Nightly Cron** | Runs every night, surfaces new matches into your dashboard automatically |
| **Pipeline** | Kanban board — drag jobs between New → Applied → Interview → Offer → Rejected |
| **Interview Prep** | AI-generated questions, STAR stories, company research, negotiation scripts |
| **Resume Tailor** | Rewrites your resume bullet points to match a specific JD |
| **Cover Letter** | Generates a cover letter from your CV + JD in seconds |

---

## Tech stack

```
Next.js 16 (App Router)     — framework, server components, API routes
Supabase                    — auth, postgres database, storage (CV files)
Groq (Llama 3.3 70B)        — AI scoring, CV parsing, interview prep generation
Vercel AI SDK               — unified LLM interface
@dnd-kit                    — drag-and-drop Kanban board
Zod                         — runtime validation on all API inputs + LLM outputs
Tailwind CSS v4             — utility styles
TypeScript                  — strict mode throughout
pdf-parse                   — server-side PDF text extraction
```

---

## Project structure

```
app/
├── (auth)/                 # Login / signup pages
├── (dashboard)/
│   ├── page.tsx            # Dashboard — stats, suggested jobs, quick actions
│   ├── jobs/               # Evaluate a job (score + full breakdown)
│   ├── discover/           # Search jobs across all sources
│   ├── pipeline/           # Kanban board
│   ├── prep/               # Interview prep
│   ├── skills/             # Manage your skill profile
│   ├── settings/           # Preferences, job market, watched companies
│   └── profile/            # CV upload + onboarding wizard
│
app/api/
├── cv/upload/              # PDF parse → Groq extraction → skills insert
├── jobs/score/             # Rule score + AI score a JD
├── discover/
│   ├── search/             # Fan-out fetch across all job sources
│   └── evaluate/           # Batch AI-evaluate selected discovered jobs
├── resume/
│   ├── tailor/             # Rewrite resume for a specific JD
│   └── cover-letter/       # Generate cover letter
└── cron/discover/          # Nightly job discovery for all users

lib/
├── ai/groq.ts              # Groq client (Llama 3.3 70B)
├── scoring/
│   ├── rule-scorer.ts      # Fast keyword-based pre-filter score
│   └── ai-scorer.ts        # Full LLM scoring with Zod-validated output
├── discover/
│   ├── fetchers.ts         # Greenhouse, Lever, RemoteOK, Remotive, Adzuna
│   └── build-query.ts      # Build search query from user skills
└── actions/                # Server actions (jobs, skills, suggestions, prep)

components/
├── layout/                 # Sidebar + Topbar
├── dashboard/              # Dashboard client, suggested jobs section
├── discover/               # Discover client + job detail slide-in panel
├── jobs/                   # Job list, job cards, detail sheet
├── pipeline/               # Kanban board + drag-and-drop columns
├── prep/                   # Interview prep UI
├── skills/                 # Skills manager
├── settings/               # Settings form with dirty tracking
└── ui/                     # Shared: stat cards, job cards, gradient orbs
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/job-hunt-ai.git
cd job-hunt-ai
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in the [Database schema](#database-schema) section below in the Supabase SQL editor
3. Enable Row Level Security on all tables (see [RLS setup](#rls-setup))
4. Go to **Settings → API** and copy your keys

### 3. Get a Groq API key

1. Sign up at [console.groq.com](https://console.groq.com) — it's free
2. Create an API key
3. The app uses `llama-3.3-70b-versatile` — the free tier is more than enough for development

### 4. Create your `.env.local`

```env
# Supabase — Settings → API in your Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Groq — console.groq.com
GROQ_API_KEY=gsk_your-key-here

# Cron job secret — generate one: openssl rand -hex 32
CRON_SECRET=your-random-secret-here

# Adzuna (optional — adds more job results)
# Free keys at: https://developer.adzuna.com
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
```

> `.env.local` is already in `.gitignore`. Never commit it.

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, upload your CV, and you're off.

---

## Database schema

Run this in your Supabase SQL editor (**SQL Editor → New query**):

```sql
-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  cv_text text,
  cv_url text,
  preferences jsonb default '{}',
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- Skills extracted from CV or added manually
create table skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  level text check (level in ('expert', 'strong', 'familiar', 'learning')),
  years_experience numeric default 0,
  category text default 'tools',
  is_primary boolean default false,
  is_hidden boolean default false,
  source text default 'manual',
  created_at timestamptz default now()
);

-- Evaluated jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  company text,
  location text,
  remote_type text check (remote_type in ('remote', 'hybrid', 'onsite')),
  salary_min numeric,
  salary_max numeric,
  currency text default 'INR',
  jd_text text,
  jd_url text,
  source text default 'manual',
  rule_score numeric,
  ai_score numeric,
  score_breakdown jsonb,
  status text default 'new',
  prep_cache jsonb,
  discovered_at timestamptz default now(),
  updated_at timestamptz default now(),
  applied_at timestamptz
);

-- Nightly discovered jobs waiting to be reviewed
create table suggested_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  company text,
  location text,
  remote_type text,
  jd_text text,
  jd_url text,
  source text,
  rule_score numeric,
  matched_skills jsonb,
  missing_primary jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);
```

---

## RLS setup

In Supabase go to **Authentication → Policies** and enable RLS + add policies for each table.

The pattern is the same for `jobs`, `skills`, and `suggested_jobs`:

```sql
alter table jobs enable row level security;

create policy "Users own their jobs" on jobs
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

For `profiles`, the column is `id` not `user_id`:

```sql
alter table profiles enable row level security;

create policy "Users own their profile" on profiles
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

Two things to always get right: use `to authenticated` (not `to public`), and always include both `using` and `with check`.

---

## Nightly cron

The endpoint `/api/cron/discover` scans all job sources for every user who has skills set up and inserts new matches into `suggested_jobs`.

**Run it manually (dev):**
```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/discover
```

**Schedule it on Vercel** — create a `vercel.json` in the root:
```json
{
  "crons": [
    {
      "path": "/api/cron/discover",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Make sure `CRON_SECRET` in your Vercel environment variables matches the one in `.env.local`.

---

## What's not built yet

Forking this? Here's what would make it production-ready for a wider audience:

- **Email notifications** — alert users when nightly discovery finds strong matches (Resend or Postmark)
- **Browser extension** — one-click "Evaluate this job" while browsing job boards
- **Multiple CV versions** — maintain different CVs for different target roles
- **Redis rate limiting** — current rate limiting is DB-based; swap for Redis for proper atomic counters
- **More job sources** — WeWorkRemotely, LinkedIn (fragile), Indeed
- **Webhook on status change** — trigger Zapier/n8n automations when you move a job to Applied
- **Team mode** — share your pipeline with a recruiter or mentor
- **Application analytics** — response rates, time-to-offer, best-performing job sources

---

## License

MIT
