import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildSearchQuery } from '@/lib/discover/build-query';
import { ruleScoreDetails } from '@/lib/scoring/rule-scorer';
import { stripHtml } from '@/lib/utils/html';
import type { Skill } from '@/lib/actions/skills';

export const runtime = 'nodejs';
export const maxDuration = 120;

// --- Adzuna fetch (same as discover/search but standalone) ---
async function fetchAdzunaJobs(query: string, country = 'in') {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey || !query.trim()) return [];

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: '15',
    what_and: query,
  });
  try {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []).map((r: Record<string, unknown>) => ({
      title: String((r.title as string) ?? ''),
      company: String(((r.company as Record<string, unknown>)?.display_name as string) ?? ''),
      location: String(((r.location as Record<string, unknown>)?.display_name as string) ?? ''),
      jdText: stripHtml(String((r.description as string) ?? '')),
      jdUrl: String((r.redirect_url as string) ?? ''),
      source: 'cron_adzuna',
    }));
  } catch { return []; }
}

// --- Greenhouse fetch ---
async function fetchGreenhouseJobs(company: string) {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.jobs ?? []) as Record<string, unknown>[]).slice(0, 10).map((j) => ({
      title: String((j.title as string) ?? ''),
      company,
      location: String(((j.location as Record<string, unknown>)?.name as string) ?? ''),
      jdText: stripHtml(String((j.content as string) ?? '')),
      jdUrl: String((j.absolute_url as string) ?? ''),
      source: 'cron_greenhouse',
    }));
  } catch { return []; }
}

// --- Lever fetch ---
async function fetchLeverJobs(company: string) {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return ((Array.isArray(json) ? json : []) as Record<string, unknown>[]).slice(0, 10).map((j) => {
      const lists = ((j.lists as Record<string, unknown>[]) ?? [])
        .map((l) => `${l.text}\n${l.content}`).join('\n');
      const additional = stripHtml(String((j.additional as string) ?? ''));
      return {
        title: String((j.text as string) ?? ''),
        company,
        location: String(((j.categories as Record<string, unknown>)?.location as string) ?? ''),
        jdText: stripHtml(`${j.text}\n${lists}\n${additional}`),
        jdUrl: String((j.hostedUrl as string) ?? ''),
        source: 'cron_lever',
      };
    });
  } catch { return []; }
}

// Run discovery for one user
async function discoverForUser(
  userId: string,
  skills: Skill[],
  preferences: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const query = buildSearchQuery(skills);
  const country = (preferences?.jobMarket as string) ?? 'in';
  const watchedCompanies = (preferences?.watchedCompanies as string[]) ?? [];

  // Fan-out fetches in parallel
  const fetches = [fetchAdzunaJobs(query, country)];
  for (const company of watchedCompanies) {
    fetches.push(fetchGreenhouseJobs(company));
    fetches.push(fetchLeverJobs(company));
  }
  const settled = await Promise.allSettled(fetches);
  const raw = settled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<typeof raw>).value);

  if (raw.length === 0) return { inserted: 0 };

  // Score + filter — only keep jobs with rule_score >= 1.5
  const scored = raw
    .filter((j) => j.jdText?.trim())
    .map((j) => {
      const details = ruleScoreDetails(j.jdText, skills);
      return { ...j, rule_score: details.score, matched_skills: details.matched, missing_primary: details.missingPrimary };
    })
    .filter((j) => j.rule_score >= 1.5);

  if (scored.length === 0) return { inserted: 0 };

  // Get existing URLs + title/company combos to dedup
  const { data: existing } = await supabase
    .from('suggested_jobs')
    .select('jd_url, title, company')
    .eq('user_id', userId);

  const existingUrls = new Set((existing ?? []).map((e: Record<string, string>) => e.jd_url).filter(Boolean));
  const existingKeys = new Set(
    (existing ?? [])
      .filter((e: Record<string, string>) => e.title && e.company)
      .map((e: Record<string, string>) => `${e.title.toLowerCase()}|${e.company.toLowerCase()}`)
  );

  // Also dedup against main jobs table
  const { data: mainJobs } = await supabase
    .from('jobs')
    .select('jd_url, title, company')
    .eq('user_id', userId);

  (mainJobs ?? []).forEach((j: Record<string, string>) => {
    if (j.jd_url) existingUrls.add(j.jd_url);
    if (j.title && j.company) existingKeys.add(`${j.title.toLowerCase()}|${j.company.toLowerCase()}`);
  });

  const toInsert = scored.filter((j) => {
    if (j.jdUrl && existingUrls.has(j.jdUrl)) return false;
    if (j.title && j.company) {
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
      if (existingKeys.has(key)) return false;
    }
    return true;
  });

  if (toInsert.length === 0) return { inserted: 0 };

  const rows = toInsert.map((j) => ({
    user_id: userId,
    title: j.title || null,
    company: j.company || null,
    location: j.location || null,
    jd_text: j.jdText,
    jd_url: j.jdUrl || null,
    source: j.source,
    rule_score: j.rule_score,
    matched_skills: j.matched_skills,
    missing_primary: j.missing_primary,
    status: 'pending',
  }));

  const { error } = await supabase.from('suggested_jobs').insert(rows);
  if (error) console.error(`[cron/discover] insert error for user ${userId}:`, error.message);

  return { inserted: error ? 0 : toInsert.length };
}

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all users who have at least one primary skill
  const { data: users } = await supabase
    .from('skills')
    .select('user_id')
    .eq('is_primary', true)
    .eq('is_hidden', false);

  const uniqueUserIds = [...new Set((users ?? []).map((u: { user_id: string }) => u.user_id))];
  if (uniqueUserIds.length === 0) return NextResponse.json({ message: 'No users with skills', processed: 0 });

  let totalInserted = 0;

  for (const userId of uniqueUserIds) {
    // Get skills + preferences
    const [{ data: skillsData }, { data: profile }] = await Promise.all([
      supabase.from('skills').select('*').eq('user_id', userId).eq('is_hidden', false),
      supabase.from('profiles').select('preferences').eq('id', userId).single(),
    ]);

    const skills = (skillsData ?? []) as Skill[];
    const preferences = (profile?.preferences ?? {}) as Record<string, unknown>;

    try {
      const { inserted } = await discoverForUser(userId, skills, preferences, supabase);
      totalInserted += inserted;
      console.log(`[cron/discover] user ${userId}: inserted ${inserted} suggestions`);
    } catch (err) {
      console.error(`[cron/discover] error for user ${userId}:`, err);
    }
  }

  return NextResponse.json({ message: 'Done', processed: uniqueUserIds.length, inserted: totalInserted });
}
