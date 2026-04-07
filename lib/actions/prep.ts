'use server';

import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { geminiFlash } from '@/lib/ai/gemini';

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, userId: user.id };
}

async function getJobWithCache(jobId: string) {
  const { supabase, userId } = await authed();
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, profiles!inner(cv_text)')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();
  if (error || !job) throw new Error('Job not found');
  return { supabase, userId, job };
}

async function saveCache(supabase: Awaited<ReturnType<typeof createClient>>, jobId: string, key: string, value: unknown, existingCache: Record<string, unknown>) {
  await supabase
    .from('jobs')
    .update({ prep_cache: { ...existingCache, [key]: value } })
    .eq('id', jobId);
}

async function callGroq(system: string, prompt: string): Promise<string> {
  const { text } = await generateText({ model: geminiFlash, system, prompt });
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

// ─── Interview Questions ───────────────────────────────────────────────────

export type InterviewQuestion = {
  type: 'technical' | 'behavioral' | 'situational';
  question: string;
  hint: string;
};

export async function generateInterviewQuestions(
  jobId: string,
  forceRegenerate = false
): Promise<InterviewQuestion[]> {
  const { supabase, job } = await getJobWithCache(jobId);
  const cache = (job.prep_cache ?? {}) as Record<string, unknown>;

  if (!forceRegenerate && cache.questions) return cache.questions as InterviewQuestion[];

  const text = await callGroq(
    'You are an expert interview coach. Return ONLY valid JSON, no markdown.',
    `Generate 8 likely interview questions for this role.
Mix: 3 technical, 3 behavioral, 2 situational.
Return a JSON array exactly like this:
[{"type":"technical","question":"...","hint":"..."},...]
type must be: technical, behavioral, or situational.
hint: one sentence on how to approach this question.

JOB DESCRIPTION:
${(job.jd_text ?? '').slice(0, 3000)}`
  );

  let questions: InterviewQuestion[] = [];
  try { questions = JSON.parse(text); } catch { questions = []; }

  await saveCache(supabase, jobId, 'questions', questions, cache);
  return questions;
}

// ─── STAR Stories ──────────────────────────────────────────────────────────

export type StarStory = {
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
};

export async function generateStarStories(
  jobId: string,
  forceRegenerate = false
): Promise<StarStory[]> {
  const { supabase, job } = await getJobWithCache(jobId);
  const cache = (job.prep_cache ?? {}) as Record<string, unknown>;

  if (!forceRegenerate && cache.starStories) return cache.starStories as StarStory[];

  const cvText = (job as unknown as { profiles: { cv_text: string } }).profiles?.cv_text ?? '';
  const text = await callGroq(
    'You are an expert interview coach. Return ONLY valid JSON, no markdown.',
    `Based on this JD and candidate CV, suggest 5 STAR stories to prepare.
Return a JSON array exactly like this:
[{"question":"What's an example of...","situation":"...","task":"...","action":"...","result":"...","reflection":"..."}]

JOB DESCRIPTION:
${(job.jd_text ?? '').slice(0, 2000)}

CANDIDATE CV:
${cvText.slice(0, 1000)}`
  );

  let stories: StarStory[] = [];
  try { stories = JSON.parse(text); } catch { stories = []; }

  await saveCache(supabase, jobId, 'starStories', stories, cache);
  return stories;
}

// ─── Company Research ──────────────────────────────────────────────────────

export type CompanyResearch = {
  mission: string;
  culture: string[];
  recentNews: string[];
  techStack: string[];
  glassdoorSentiment: string;
  questionsToAsk: string[];
};

export async function generateCompanyResearch(
  jobId: string,
  forceRegenerate = false
): Promise<CompanyResearch> {
  const { supabase, job } = await getJobWithCache(jobId);
  const cache = (job.prep_cache ?? {}) as Record<string, unknown>;

  if (!forceRegenerate && cache.companyResearch) return cache.companyResearch as CompanyResearch;

  const company = job.company ?? 'the company';
  const text = await callGroq(
    'You are an expert career coach. Return ONLY valid JSON, no markdown.',
    `Research ${company} based on the job description below. Return JSON exactly like:
{"mission":"...","culture":["..."],"recentNews":["..."],"techStack":["..."],"glassdoorSentiment":"Generally positive — 4.1/5","questionsToAsk":["..."]}

Provide 3-5 items per array. For recentNews, include approximate time like "(2024)".
Base your analysis on the job description context.

JOB DESCRIPTION:
${(job.jd_text ?? '').slice(0, 2000)}`
  );

  const FALLBACK: CompanyResearch = {
    mission: 'Mission not available.',
    culture: [],
    recentNews: [],
    techStack: [],
    glassdoorSentiment: 'Not available',
    questionsToAsk: [],
  };

  let research: CompanyResearch = FALLBACK;
  try { research = JSON.parse(text); } catch { /* use fallback */ }

  await saveCache(supabase, jobId, 'companyResearch', research, cache);
  return research;
}

// ─── Negotiation Script ────────────────────────────────────────────────────

export type NegotiationScript = {
  openingLine: string;
  anchorStatement: string;
  pushbackResponse: string;
  closingLine: string;
  tips: string[];
};

export async function generateNegotiationScript(
  jobId: string,
  forceRegenerate = false
): Promise<NegotiationScript> {
  const { supabase, job } = await getJobWithCache(jobId);
  const cache = (job.prep_cache ?? {}) as Record<string, unknown>;

  if (!forceRegenerate && cache.negotiation) return cache.negotiation as NegotiationScript;

  const salaryInfo = job.salary_min
    ? `Job range: ${job.salary_min}–${job.salary_max ?? '?'} ${job.currency ?? 'INR'}`
    : 'Salary not specified in the JD';

  const text = await callGroq(
    'You are an expert salary negotiation coach. Return ONLY valid JSON, no markdown.',
    `Generate a salary negotiation script for ${job.title ?? 'this role'} at ${job.company ?? 'this company'}.
${salaryInfo}

Return JSON exactly like:
{
  "openingLine": "Thank you for the offer...",
  "anchorStatement": "Based on my research and experience...",
  "pushbackResponse": "I understand that may be a constraint...",
  "closingLine": "I'm very excited about this opportunity...",
  "tips": ["Research market rates...", "Practice out loud..."]
}

Make the script conversational and professional. Include 4-6 tips.`
  );

  const FALLBACK: NegotiationScript = {
    openingLine: 'Thank you for the offer. I\'m very excited about this opportunity.',
    anchorStatement: 'Based on my research and experience, I was expecting a range of X–Y.',
    pushbackResponse: 'I understand constraints exist. Is there flexibility in other areas like equity or benefits?',
    closingLine: 'I\'m confident we can find a number that works for both sides.',
    tips: ['Research market rates on Glassdoor and Levels.fyi', 'Never give a number first', 'Practice out loud beforehand'],
  };

  let script: NegotiationScript = FALLBACK;
  try { script = JSON.parse(text); } catch { /* use fallback */ }

  await saveCache(supabase, jobId, 'negotiation', script, cache);
  return script;
}
