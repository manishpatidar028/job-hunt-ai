import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ruleScoreDetails } from '@/lib/scoring/rule-scorer';
import { stripHtml } from '@/lib/utils/html';
import type { Skill } from '@/lib/actions/skills';

export const runtime = 'nodejs';
export const maxDuration = 30;

export type DiscoveredJob = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'onsite' | null;
  jdText: string;
  jdUrl: string;
  source: 'adzuna' | 'greenhouse' | 'lever';
  salaryMin: number | null;
  salaryMax: number | null;
  ruleScore: number;
  matchedSkills: { name: string; level: string; isPrimary: boolean }[];
  missingPrimary: string[];
};

// Tokenises a query string into lowercase words (2+ chars)
function queryTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
}

// Returns true if the text contains ALL of the required tokens
function matchesAllTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = text.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

// Returns true if the title OR jdText contains AT LEAST ONE token (loose match for portal jobs)
function matchesAnyToken(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

// --- Adzuna ---
async function fetchAdzuna(query: string, location: string, country: string): Promise<DiscoveredJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '20',
    // what_and requires ALL keywords to appear — much stricter than what
    what_and: query,
    ...(location ? { where: location } : {}),
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];

  const json = await res.json();
  return (json.results ?? []).map((r: Record<string, unknown>) => {
    const desc = String((r.description as string) ?? '');
    const remoteMatch = desc.toLowerCase().match(/\b(remote|hybrid)\b/);
    const remoteType = remoteMatch ? (remoteMatch[1] as 'remote' | 'hybrid') : 'onsite';
    return {
      externalId: `adzuna-${r.id}`,
      title: String((r.title as string) ?? ''),
      company: String(((r.company as Record<string, unknown>)?.display_name as string) ?? ''),
      location: String(((r.location as Record<string, unknown>)?.display_name as string) ?? ''),
      remoteType,
      jdText: desc,
      jdUrl: String((r.redirect_url as string) ?? ''),
      source: 'adzuna' as const,
      salaryMin: (r.salary_min as number) ?? null,
      salaryMax: (r.salary_max as number) ?? null,
      ruleScore: 0,
      matchedSkills: [],
      missingPrimary: [],
    };
  });
}

// --- Greenhouse ---
async function fetchGreenhouse(company: string, tokens: string[]): Promise<DiscoveredJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((json.jobs ?? []) as Record<string, unknown>[]).map((j) => {
      const content = stripHtml(String((j.content as string) ?? ''));
      const loc = ((j.location as Record<string, unknown>)?.name as string) ?? '';
      const remoteType: 'remote' | null = loc.toLowerCase().includes('remote') ? 'remote' : null;
      return {
        externalId: `greenhouse-${j.id}`,
        title: String((j.title as string) ?? ''),
        company,
        location: loc,
        remoteType,
        jdText: content,
        jdUrl: String((j.absolute_url as string) ?? ''),
        source: 'greenhouse' as const,
        salaryMin: null,
        salaryMax: null,
        ruleScore: 0,
        matchedSkills: [],
        missingPrimary: [],
      };
    });
    // Filter: title OR jdText must contain at least one keyword token
    return jobs.filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens)).slice(0, 20);
  } catch {
    return [];
  }
}

// --- Lever ---
async function fetchLever(company: string, tokens: string[]): Promise<DiscoveredJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((Array.isArray(json) ? json : []) as Record<string, unknown>[]).map((j) => {
      const lists = ((j.lists as Record<string, unknown>[]) ?? [])
        .map((l) => `${l.text}\n${l.content}`)
        .join('\n');
      const additional = stripHtml(String((j.additional as string) ?? ''));
      const jdText = stripHtml(`${j.text}\n${lists}\n${additional}`);
      const locStr = String(((j.categories as Record<string, unknown>)?.location as string) ?? '');
      const remoteType: 'remote' | null = locStr.toLowerCase().includes('remote') ? 'remote' : null;
      return {
        externalId: `lever-${j.id}`,
        title: String((j.text as string) ?? ''),
        company,
        location: locStr,
        remoteType,
        jdText,
        jdUrl: String((j.hostedUrl as string) ?? ''),
        source: 'lever' as const,
        salaryMin: null,
        salaryMax: null,
        ruleScore: 0,
        matchedSkills: [],
        missingPrimary: [],
      };
    });
    // Filter: title OR jdText must contain at least one keyword token
    return jobs.filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens)).slice(0, 20);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    query = '',
    location = '',
    country = 'in',
    companies = [] as string[],
  } = body;

  // Fetch user skills for rule scoring
  const { data: skillsData } = await supabase.from('skills').select('*').eq('user_id', user.id);
  const skills = (skillsData ?? []) as Skill[];

  const tokens = queryTokens(query);

  // Fan-out fetch: Adzuna + all company portals in parallel
  const portalFetches: Promise<DiscoveredJob[]>[] = [];

  if (query.trim()) {
    portalFetches.push(fetchAdzuna(query, location, country));
  }

  for (const company of companies) {
    if (company.trim()) {
      // Pass tokens so portal results are filtered to matching jobs only.
      // When tokens is empty (no keyword query), all jobs from the portal are returned.
      portalFetches.push(fetchGreenhouse(company.trim(), tokens));
      portalFetches.push(fetchLever(company.trim(), tokens));
    }
  }

  if (portalFetches.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  const results = await Promise.allSettled(portalFetches);
  const allJobs: DiscoveredJob[] = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<DiscoveredJob[]>).value);

  // Deduplicate by externalId
  const seen = new Set<string>();
  const unique = allJobs.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  // Run rule score + skill details in parallel (fast, no AI)
  const scored = await Promise.all(
    unique.map(async (job) => {
      if (!job.jdText) return job;
      const details = ruleScoreDetails(job.jdText, skills);
      return { ...job, ruleScore: details.score, matchedSkills: details.matched, missingPrimary: details.missingPrimary };
    })
  );

  // Sort by rule score descending
  scored.sort((a, b) => b.ruleScore - a.ruleScore);

  return NextResponse.json({ jobs: scored.slice(0, 30) });
}
