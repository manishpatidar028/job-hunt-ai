'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type SuggestedJob = {
  id: string;
  user_id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  remote_type: string | null;
  jd_text: string | null;
  jd_url: string | null;
  source: string;
  rule_score: number;
  matched_skills: { name: string; level: string; isPrimary: boolean }[];
  missing_primary: string[];
  status: 'pending' | 'dismissed' | 'proceeded';
  discovered_at: string;
};

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, userId: user.id };
}

export async function getPendingSuggestions(): Promise<SuggestedJob[]> {
  const { supabase, userId } = await authed();
  const { data } = await supabase
    .from('suggested_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('rule_score', { ascending: false })
    .limit(10);
  return (data ?? []) as SuggestedJob[];
}

export async function dismissSuggestion(id: string): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase
    .from('suggested_jobs')
    .update({ status: 'dismissed' })
    .eq('id', id)
    .eq('user_id', userId);
  revalidatePath('/');
}

export async function markProceeded(id: string): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase
    .from('suggested_jobs')
    .update({ status: 'proceeded' })
    .eq('id', id)
    .eq('user_id', userId);
  revalidatePath('/');
}
