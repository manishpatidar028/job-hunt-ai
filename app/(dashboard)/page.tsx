export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import type { Job } from '@/lib/actions/jobs';
import type { SuggestedJob } from '@/lib/actions/suggestions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: allJobs }, { data: profile }, { data: suggestions }] = await Promise.all([
    supabase.from('jobs').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('onboarding_complete').eq('id', user.id).maybeSingle(),
    supabase.from('suggested_jobs').select('*').eq('user_id', user.id).eq('status', 'pending').order('rule_score', { ascending: false }).limit(10),
  ]);

  const jobs = (allJobs ?? []) as Job[];

  const totalJobs = jobs.length;
  const strongMatches = jobs.filter((j) => (j.ai_score ?? 0) >= 4.0).length;
  const applied = jobs.filter((j) => ['applied', 'responded', 'interview', 'offer'].includes(j.status)).length;
  const scores = jobs.map((j) => j.ai_score).filter(Boolean) as number[];
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : '—';

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.updated_at ?? b.discovered_at ?? 0).getTime() - new Date(a.updated_at ?? a.discovered_at ?? 0).getTime())
    .slice(0, 5);

  return (
    <DashboardClient
      stats={{ totalJobs, strongMatches, applied, avgScore }}
      topMatches={recentJobs}
      showOnboarding={!profile?.onboarding_complete}
      suggestedJobs={(suggestions ?? []) as SuggestedJob[]}
    />
  );
}
