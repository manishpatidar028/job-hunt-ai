import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { geminiFlash } from '@/lib/ai/gemini';
import { ruleScore } from '@/lib/scoring/rule-scorer';
import { aiScore } from '@/lib/scoring/ai-scorer';
import { stripHtml } from '@/lib/utils/html';
import type { Skill } from '@/lib/actions/skills';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function extractJobInfo(jdText: string) {
  const prompt = `Extract job metadata from this job description. Return ONLY this JSON:
{
  "title": "Software Engineer",
  "company": "Acme Corp",
  "location": "Bangalore",
  "remoteType": "remote",
  "salaryMin": null,
  "salaryMax": null,
  "currency": "INR"
}
remoteType must be one of: remote, hybrid, onsite, or null.
salaryMin/salaryMax are numbers (annual, in currency units) or null.

JOB DESCRIPTION:
${jdText.slice(0, 3000)}`;

  try {
    const { text } = await generateText({
      model: geminiFlash,
      system: 'Extract job metadata. Return ONLY valid JSON, no markdown, no explanation.',
      prompt,
    });
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(clean);
  } catch {
    return { title: null, company: null, location: null, remoteType: null, salaryMin: null, salaryMax: null, currency: 'INR' };
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let jdText = '';
  let jdUrl = '';

  try {
    const body = await request.json();
    jdUrl = body.jdUrl ?? '';
    jdText = body.jdText ?? '';

    // Fetch URL if no JD text provided
    if (jdUrl && !jdText) {
      try {
        const res = await fetch(jdUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobHuntAI/1.0)' },
        });
        const html = await res.text();
        jdText = stripHtml(html).slice(0, 5000);
      } catch (fetchErr) {
        console.error('[jobs/score] URL fetch error:', fetchErr);
        return NextResponse.json({ error: 'Could not fetch the URL. Try pasting the job description instead.' }, { status: 400 });
      }
    }

    if (!jdText.trim()) {
      return NextResponse.json({ error: 'No job description provided' }, { status: 400 });
    }

    // Rate limit: max 50 jobs scored today
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('discovered_at', dayStart.toISOString());
    if ((count ?? 0) >= 50) {
      return NextResponse.json({ error: 'Daily limit of 50 job evaluations reached.' }, { status: 429 });
    }

    // Fetch user skills and CV text
    const { data: skillsData } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id);
    const skills = (skillsData ?? []) as Skill[];

    const { data: profile } = await supabase
      .from('profiles')
      .select('cv_text')
      .eq('id', user.id)
      .single();
    const cvText = profile?.cv_text ?? '';

    // Run rule score + AI score + job info extraction in parallel
    const [aiResult, jobInfo, ruleSc] = await Promise.all([
      aiScore(jdText, cvText, skills),
      extractJobInfo(jdText),
      Promise.resolve(ruleScore(jdText, skills)),
    ]);

    // Insert job row
    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        title: jobInfo.title ?? null,
        company: jobInfo.company ?? null,
        location: jobInfo.location ?? null,
        remote_type: jobInfo.remoteType ?? null,
        salary_min: jobInfo.salaryMin ?? null,
        salary_max: jobInfo.salaryMax ?? null,
        currency: jobInfo.currency ?? 'INR',
        jd_text: jdText,
        jd_url: jdUrl || null,
        source: jdUrl ? 'url' : 'manual',
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
      .single();

    if (insertError) throw insertError;
    return NextResponse.json(job);
  } catch (err) {
    console.error('[jobs/score] error:', err);
    return NextResponse.json({ error: 'Unexpected error during scoring' }, { status: 500 });
  }
}
