import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkAndRecordUsage } from '@/lib/usage/check-limit';
import { ruleScore } from '@/lib/scoring/rule-scorer';
import { aiScore } from '@/lib/scoring/ai-scorer';
import type { Skill } from '@/lib/actions/skills';
import type { DiscoveredJob } from '../search/route';

export const runtime = 'nodejs';
export const maxDuration = 120;

export type EvaluateResult =
  | { status: 'ok'; externalId: string; job: Record<string, unknown> }
  | { status: 'error'; externalId: string; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evaluateOne(
  discovered: DiscoveredJob,
  skills: Skill[],
  cvText: string,
  userId: string,
  supabase: any
): Promise<EvaluateResult> {
  try {
    const jdText = discovered.jdText?.trim();
    if (!jdText) return { status: 'error', externalId: discovered.externalId, error: 'No JD text' };

    const [aiResult, ruleSc] = await Promise.all([
      aiScore(jdText, cvText, skills),
      Promise.resolve(ruleScore(jdText, skills)),
    ]);

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        title: discovered.title || null,
        company: discovered.company || null,
        location: discovered.location || null,
        remote_type: discovered.remoteType,
        salary_min: discovered.salaryMin,
        salary_max: discovered.salaryMax,
        currency: 'INR',
        jd_text: jdText,
        jd_url: discovered.jdUrl || null,
        source: discovered.source,
        rule_score: ruleSc,
        ai_score: aiResult.overallScore,
        score_breakdown: {
          ...aiResult.breakdown,
          matchedSkills: aiResult.matchedSkills,
          gaps: aiResult.gaps,
          recommendation: aiResult.recommendation,
          reasoning: aiResult.reasoning,
        },
        status: 'new',
      })
      .select()
      .maybeSingle();

    if (error) return { status: 'error', externalId: discovered.externalId, error: error.message };
    return { status: 'ok', externalId: discovered.externalId, job: job as Record<string, unknown> };
  } catch (err) {
    return { status: 'error', externalId: discovered.externalId, error: String(err) };
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await checkAndRecordUsage(user.id, 'discover_evaluate');
  if (!limit.allowed) return NextResponse.json({ error: `Daily limit reached (${limit.limit}/day). Resets at midnight.`, retryAfter: limit.retryAfter }, { status: 429 });

  const evaluateSchema = z.object({
    jobs: z.array(z.object({
      externalId: z.string().max(200),
      title:      z.string().max(300).optional().default(''),
      company:    z.string().max(200).optional().default(''),
      location:   z.string().max(200).optional().default(''),
      remoteType: z.enum(['remote', 'hybrid', 'onsite']).nullable().optional(),
      jdText:     z.string().max(50000),
      jdUrl:      z.string().max(2000).optional().default(''),
      source:     z.string().max(50),
      salaryMin:  z.number().nullable().optional(),
      salaryMax:  z.number().nullable().optional(),
      ruleScore:       z.number().optional().default(0),
      matchedSkills:   z.array(z.any()).optional().default([]),
      missingPrimary:  z.array(z.string()).optional().default([]),
    })).max(15),
  });

  const parsed = evaluateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  const jobs = parsed.data.jobs as DiscoveredJob[];

  if (jobs.length === 0) return NextResponse.json({ results: [] });

  // Check daily rate limit
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('discovered_at', dayStart.toISOString());

  const remaining = 50 - (count ?? 0);
  const toEvaluate = jobs.slice(0, Math.max(0, remaining));
  if (toEvaluate.length === 0) {
    return NextResponse.json({ error: 'Daily limit of 50 job evaluations reached.' }, { status: 429 });
  }

  const { data: skillsData } = await supabase.from('skills').select('*').eq('user_id', user.id);
  const skills = (skillsData ?? []) as Skill[];

  const { data: profile } = await supabase.from('profiles').select('cv_text').eq('id', user.id).maybeSingle();
  const cvText = profile?.cv_text ?? '';

  // Evaluate all in parallel — sub-agent pattern
  const settled = await Promise.allSettled(
    toEvaluate.map((job) => evaluateOne(job, skills, cvText, user.id, supabase))
  );

  const results: EvaluateResult[] = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { status: 'error', externalId: toEvaluate[i].externalId, error: String(r.reason) };
  });

  return NextResponse.json({ results });
}
