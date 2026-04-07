import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import type { Job } from '@/lib/actions/jobs';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: allJobs }, { data: profile }] = await Promise.all([
    supabase.from('jobs').select('*').eq('user_id', user!.id),
    supabase.from('profiles').select('onboarding_complete').eq('id', user!.id).single(),
  ]);

  const jobs = (allJobs ?? []) as Job[];

  const totalJobs = jobs.length;
  const strongMatches = jobs.filter((j) => (j.ai_score ?? 0) >= 4.0).length;
  const applied = jobs.filter((j) => ['applied', 'responded', 'interview', 'offer'].includes(j.status)).length;
  const scores = jobs.map((j) => j.ai_score).filter(Boolean) as number[];
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : '—';

  const topMatches = jobs
    .filter((j) => ['new', 'reviewing'].includes(j.status) && j.ai_score != null)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 3);

  return (
    <DashboardClient
      stats={{ totalJobs, strongMatches, applied, avgScore }}
      topMatches={topMatches}
      showOnboarding={!profile?.onboarding_complete}
    />
  );
}
