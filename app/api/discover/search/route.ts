import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ruleScoreDetails } from '@/lib/scoring/rule-scorer';
import type { Skill } from '@/lib/actions/skills';
import {
  queryTokens, fetchRemoteOK, fetchRemotive, fetchAdzuna,
  fetchGreenhouse, fetchLever, DEFAULT_GREENHOUSE, DEFAULT_LEVER,
  type RawJob,
} from '@/lib/discover/fetchers';

export const runtime = 'nodejs';
export const maxDuration = 30;

export type DiscoveredJob = RawJob & {
  source: 'adzuna' | 'greenhouse' | 'lever' | 'remoteok' | 'remotive';
  ruleScore: number;
  matchedSkills: { name: string; level: string; isPrimary: boolean }[];
  missingPrimary: string[];
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchSchema = z.object({
    query:     z.string().max(200).default(''),
    location:  z.string().max(100).default(''),
    country:   z.string().max(10).default('in'),
    companies: z.array(z.string().max(100)).max(50).default([]),
    daysBack:  z.number().int().min(1).max(30).optional(),
  });

  const parsed = searchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  const { query, location, country, companies, daysBack } = parsed.data;

  const { data: skillsData } = await supabase.from('skills').select('*').eq('user_id', user.id);
  const skills = (skillsData ?? []) as Skill[];

  const tokens = queryTokens(query);
  const fetches: Promise<RawJob[]>[] = [];

  if (query.trim()) {
    fetches.push(fetchRemoteOK(tokens, daysBack));
    fetches.push(fetchRemotive(query, tokens, daysBack));
    fetches.push(fetchAdzuna(query, location, country, daysBack));
  }

  // Merge user companies + defaults, deduplicated
  const allCompanies = [...new Set([
    ...companies.map((c) => c.trim()).filter(Boolean),
    ...DEFAULT_GREENHOUSE,
    ...DEFAULT_LEVER,
  ])];

  for (const company of allCompanies) {
    fetches.push(fetchGreenhouse(company, tokens, daysBack));
    fetches.push(fetchLever(company, tokens, daysBack));
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

  // Rule score + skill match
  const scored: DiscoveredJob[] = unique.map((job) => {
    if (!job.jdText) {
      return { ...job, source: job.source as DiscoveredJob['source'], ruleScore: 0, matchedSkills: [], missingPrimary: [] };
    }
    const details = ruleScoreDetails(job.jdText, skills);
    return {
      ...job,
      source: job.source as DiscoveredJob['source'],
      ruleScore: details.score,
      matchedSkills: details.matched,
      missingPrimary: details.missingPrimary,
    };
  });

  scored.sort((a, b) => b.ruleScore - a.ruleScore);
  return NextResponse.json({ jobs: scored.slice(0, 50) });
}
