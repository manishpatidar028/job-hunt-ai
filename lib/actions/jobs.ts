'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ScoreBreakdown = {
  skillMatch?: number;
  seniorityFit?: number;
  domainOverlap?: number;
  remoteCompatibility?: number;
  growthPotential?: number;
  matchedSkills?: string[];
  gaps?: string[];
  recommendation?: 'strong_apply' | 'apply' | 'consider' | 'skip';
  reasoning?: string;
};

export type Job = {
  id: string;
  user_id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  remote_type: 'remote' | 'hybrid' | 'onsite' | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  jd_text: string | null;
  jd_url: string | null;
  source: string;
  rule_score: number | null;
  ai_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  status: string;
  discovered_at: string;
  applied_at: string | null;
  prep_cache: Record<string, unknown> | null;
};

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, userId: user.id };
}

export async function getJobs(): Promise<Job[]> {
  const { supabase, userId } = await authed();
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('ai_score', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false });
  return (data ?? []) as Job[];
}

export async function updateJobStatus(jobId: string, status: string): Promise<void> {
  const { supabase, userId } = await authed();
  const update: Record<string, unknown> = { status };
  if (status === 'applied') update.applied_at = new Date().toISOString();
  await supabase.from('jobs').update(update).eq('id', jobId).eq('user_id', userId);
  revalidatePath('/jobs');
}

export async function deleteJob(jobId: string): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase.from('jobs').delete().eq('id', jobId).eq('user_id', userId);
  revalidatePath('/jobs');
}
