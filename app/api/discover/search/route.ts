import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ruleScoreDetails, experienceMatches } from '@/lib/scoring/rule-scorer';
import type { Skill } from '@/lib/actions/skills';
import {
  queryTokens, fetchRemoteOK, fetchRemotive, fetchAdzuna,
  fetchGreenhouse, fetchLever, DEFAULT_GREENHOUSE, DEFAULT_LEVER,
  fetchAshby, DEFAULT_ASHBY,
  fetchWorkable, DEFAULT_WORKABLE,
  fetchSmartRecruiters, DEFAULT_SMARTRECRUITERS,
  fetchBambooHR, DEFAULT_BAMBOOHR,
  fetchRecruitee, DEFAULT_RECRUITEE,
  isRemoteFilter, locationMatchesFilter,
  type RawJob,
} from '@/lib/discover/fetchers';
import { fetchAIWebSearch } from '@/lib/discover/ai-web-search';

export const runtime = 'nodejs';
export const maxDuration = 30;

export type DiscoveredJob = RawJob & {
  source: 'adzuna' | 'greenhouse' | 'lever' | 'remoteok' | 'remotive' | 'ashby' | 'workable' | 'smartrecruiters' | 'bamboohr' | 'recruitee' | 'ai_web_search';
  ruleScore: number;
  matchedSkills: { name: string; level: string; isPrimary: boolean }[];
  missingPrimary: string[];
  requiredYears: { min: number; max: number | null } | null;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchSchema = z.object({
    query:      z.string().max(200).default(''),
    locations:  z.array(z.string().max(100)).max(10).default([]),
    country:    z.string().max(10).default('in'),
    companies:  z.array(z.string().max(100)).max(50).default([]),
    daysBack:   z.number().int().min(1).max(90).optional(),
    minYears:   z.number().int().min(0).max(30).optional(),
    maxYears:   z.number().int().min(0).max(30).optional(),
  });

  const parsed = searchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  const { query, locations, country, companies, daysBack, minYears, maxYears } = parsed.data;
  const userYears = minYears ?? 0;

  const { data: skillsData } = await supabase.from('skills').select('*').eq('user_id', user.id);
  const skills = (skillsData ?? []) as Skill[];

  const tokens = queryTokens(query);
  const fetches: Promise<RawJob[]>[] = [];

  const wantsRemote   = locations.length === 0 || locations.some((l) => isRemoteFilter(l));
  const cityLocations = locations.filter((l) => !isRemoteFilter(l));

  if (query.trim()) {
    if (wantsRemote) {
      fetches.push(fetchRemoteOK(tokens, daysBack));
      fetches.push(fetchRemotive(query, tokens, daysBack));
    }
    if (cityLocations.length > 0) {
      for (const city of cityLocations) {
        fetches.push(fetchAdzuna(query, city, country, daysBack));
      }
    } else {
      fetches.push(fetchAdzuna(query, '', country, daysBack));
    }
  }

  // Merge user companies + defaults, deduplicated
  const allCompanies = [...new Set([
    ...companies.map((c) => c.trim()).filter(Boolean),
    ...DEFAULT_GREENHOUSE,
    ...DEFAULT_LEVER,
  ])];

  for (const company of allCompanies) {
    fetches.push(fetchGreenhouse(company, tokens, daysBack, locations));
    fetches.push(fetchLever(company, tokens, daysBack, locations));
  }

  for (const company of DEFAULT_ASHBY) {
    fetches.push(fetchAshby(company, tokens, daysBack, locations));
  }
  for (const company of DEFAULT_WORKABLE) {
    fetches.push(fetchWorkable(company, tokens, daysBack, locations));
  }
  for (const company of DEFAULT_SMARTRECRUITERS) {
    fetches.push(fetchSmartRecruiters(company, tokens, daysBack, locations));
  }
  for (const company of DEFAULT_BAMBOOHR) {
    fetches.push(fetchBambooHR(company, tokens, daysBack, locations));
  }
  for (const company of DEFAULT_RECRUITEE) {
    fetches.push(fetchRecruitee(company, tokens, daysBack, locations));
  }

  // AI web search — Tavily + Jina Reader + Groq extraction
  // Hard-capped at 18 s so it never blows the route's 30 s maxDuration.
  // Silently returns [] if TAVILY_API_KEY is missing or the cap is hit.
  if (process.env.TAVILY_API_KEY) {
    const activeSkillNames = skills
      .filter((s) => !s.is_hidden)
      .sort((a, b) => {
        const w = { expert: 4, strong: 3, familiar: 2, learning: 1 };
        return (b.is_primary ? 10 : 0) + (w[b.level as keyof typeof w] ?? 0)
             - (a.is_primary ? 10 : 0) - (w[a.level as keyof typeof w] ?? 0);
      })
      .map((s) => s.name);

    const primarySkillNames = skills
      .filter((s) => s.is_primary && !s.is_hidden)
      .map((s) => s.name);

    const aiSearchTimeout = new Promise<RawJob[]>((resolve) =>
      setTimeout(() => resolve([]), 18_000),
    );

    fetches.push(
      Promise.race([
        fetchAIWebSearch({
          skills:        activeSkillNames,
          primarySkills: primarySkillNames,
          locations,
          minYears,
          maxYears,
          daysBack,
        }),
        aiSearchTimeout,
      ]),
    );
  }

  if (fetches.length === 0) return NextResponse.json({ jobs: [] });

  const results = await Promise.allSettled(fetches);
  const allJobs: RawJob[] = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<RawJob[]>).value);

  // Deduplicate by externalId
  const seen = new Set<string>();
  const unique = allJobs.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  // Location filter — applied after dedup as a safety net for sources that don't filter internally
  const locationFiltered = locations.length > 0
    ? unique.filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
    : unique;

  // Rule score + skill match + experience filter
  const scored: DiscoveredJob[] = locationFiltered
    .map((job) => {
      if (!job.jdText) {
        return { ...job, source: job.source as DiscoveredJob['source'], ruleScore: 0, matchedSkills: [], missingPrimary: [], requiredYears: null };
      }
      const details = ruleScoreDetails(job.jdText, skills);
      return {
        ...job,
        source: job.source as DiscoveredJob['source'],
        ruleScore: details.score,
        matchedSkills: details.matched,
        missingPrimary: details.missingPrimary,
        requiredYears: details.requiredYears,
      };
    })
    .filter((job) => {
      // Experience year filter — only apply if user specified their years
      if (!job.jdText || userYears === 0) return true;
      return experienceMatches(job.jdText, userYears);
    })
    .filter((job) => {
      // Max years filter — hide jobs requiring more experience than user has
      if (!maxYears || !job.requiredYears) return true;
      return job.requiredYears.min <= maxYears;
    });

  scored.sort((a, b) => b.ruleScore - a.ruleScore);
  return NextResponse.json({ jobs: scored.slice(0, 50) });
}
