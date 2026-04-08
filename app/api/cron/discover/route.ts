import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildSearchQuery } from '@/lib/discover/build-query';
import { ruleScoreDetails } from '@/lib/scoring/rule-scorer';
import type { Skill } from '@/lib/actions/skills';
import {
  queryTokens, fetchRemoteOK, fetchRemotive, fetchAdzuna,
  fetchGreenhouse, fetchLever, DEFAULT_GREENHOUSE, DEFAULT_LEVER,
  type RawJob,
} from '@/lib/discover/fetchers';

export const runtime = 'nodejs';
export const maxDuration = 120;

const DAYS_BACK = 1; // only surface jobs posted in the last 24 hours
const MIN_SCORE = 1.5;

async function discoverForUser(
  userId: string,
  skills: Skill[],
  preferences: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const query = buildSearchQuery(skills);
  if (!query.trim()) return { inserted: 0 };

  const country = (preferences?.jobMarket as string) ?? 'in';
  const watchedCompanies = (preferences?.watchedCompanies as string[]) ?? [];
  const tokens = queryTokens(query);

  // Fan-out: free remote sources + Adzuna + all company portals
  const fetches: Promise<RawJob[]>[] = [
    fetchRemoteOK(tokens, DAYS_BACK),
    fetchRemotive(query, tokens, DAYS_BACK),
    fetchAdzuna(query, '', country, DAYS_BACK),
  ];

  const allCompanies = [...new Set([
    ...watchedCompanies.map((c: string) => c.trim()).filter(Boolean),
    ...DEFAULT_GREENHOUSE,
    ...DEFAULT_LEVER,
  ])];

  for (const company of allCompanies) {
    fetches.push(fetchGreenhouse(company, tokens, DAYS_BACK));
    fetches.push(fetchLever(company, tokens, DAYS_BACK));
  }

  const settled = await Promise.allSettled(fetches);
  const raw: RawJob[] = settled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<RawJob[]>).value);

  if (raw.length === 0) return { inserted: 0 };

  // Deduplicate fetched jobs by externalId
  const seen = new Set<string>();
  const unique = raw.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  // Score and keep only high-match jobs
  const scored = unique
    .filter((j) => j.jdText?.trim())
    .map((j) => {
      const details = ruleScoreDetails(j.jdText, skills);
      return { ...j, rule_score: details.score, matched_skills: details.matched, missing_primary: details.missingPrimary };
    })
    .filter((j) => j.rule_score >= MIN_SCORE);

  if (scored.length === 0) return { inserted: 0 };

  // Build dedup sets from suggested_jobs (all statuses) + jobs (applied/evaluated)
  const [{ data: suggested }, { data: appliedJobs }] = await Promise.all([
    supabase.from('suggested_jobs').select('jd_url, title, company').eq('user_id', userId),
    supabase.from('jobs').select('jd_url, title, company').eq('user_id', userId),
  ]);

  const seenUrls = new Set<string>();
  const seenKeys = new Set<string>();

  for (const row of [...(suggested ?? []), ...(appliedJobs ?? [])]) {
    const r = row as Record<string, string>;
    if (r.jd_url) seenUrls.add(r.jd_url);
    if (r.title && r.company) seenKeys.add(`${r.title.toLowerCase()}|${r.company.toLowerCase()}`);
  }

  const toInsert = scored.filter((j) => {
    if (j.jdUrl && seenUrls.has(j.jdUrl)) return false;
    if (j.title && j.company && seenKeys.has(`${j.title.toLowerCase()}|${j.company.toLowerCase()}`)) return false;
    return true;
  });

  if (toInsert.length === 0) return { inserted: 0 };

  const rows = toInsert.map((j) => ({
    user_id: userId,
    title: j.title || null,
    company: j.company || null,
    location: j.location || null,
    remote_type: j.remoteType,
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
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: users } = await supabase
    .from('skills')
    .select('user_id')
    .eq('is_primary', true)
    .eq('is_hidden', false);

  const uniqueUserIds = [...new Set((users ?? []).map((u: { user_id: string }) => u.user_id))];
  if (uniqueUserIds.length === 0) return NextResponse.json({ message: 'No users with skills', processed: 0 });

  // Batch-fetch all skills + profiles in 2 queries instead of 2×N
  const [{ data: allSkills }, { data: allProfiles }] = await Promise.all([
    supabase.from('skills').select('*').in('user_id', uniqueUserIds).eq('is_hidden', false),
    supabase.from('profiles').select('id, preferences').in('id', uniqueUserIds),
  ]);

  const skillsByUser = new Map<string, Skill[]>();
  for (const skill of (allSkills ?? []) as (Skill & { user_id: string })[]) {
    const list = skillsByUser.get(skill.user_id) ?? [];
    list.push(skill);
    skillsByUser.set(skill.user_id, list);
  }

  const prefsByUser = new Map<string, Record<string, unknown>>();
  for (const p of (allProfiles ?? []) as { id: string; preferences: Record<string, unknown> | null }[]) {
    prefsByUser.set(p.id, (p.preferences ?? {}) as Record<string, unknown>);
  }

  let totalInserted = 0;

  for (const userId of uniqueUserIds) {
    const skills = skillsByUser.get(userId) ?? [];
    const preferences = prefsByUser.get(userId) ?? {};

    try {
      const { inserted } = await discoverForUser(userId, skills, preferences, supabase);
      totalInserted += inserted;
    } catch (err) {
      console.error(`[cron/discover] error for user ${userId}:`, err);
    }
  }

  return NextResponse.json({ message: 'Done', processed: uniqueUserIds.length, inserted: totalInserted });
}
