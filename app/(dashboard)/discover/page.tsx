export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildSearchQuery } from '@/lib/discover/build-query';
import { DiscoverClient } from '@/components/discover/discover-client';
import type { Skill } from '@/lib/actions/skills';

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: skillsData }, { data: profile }] = await Promise.all([
    supabase.from('skills').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('preferences').eq('id', user.id).maybeSingle(),
  ]);

  const skills = (skillsData ?? []) as Skill[];
  const initialQuery = buildSearchQuery(skills);
  const hasAdzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  const watchedCompanies = (prefs.watchedCompanies as string[]) ?? [];
  const jobMarket = (prefs.jobMarket as string) ?? 'in';

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Discover Jobs
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Scan Greenhouse, Lever, and Adzuna in parallel. Select matches and evaluate up to 15 at once with AI.
        </p>
      </div>
      <DiscoverClient
        initialQuery={initialQuery}
        hasAdzuna={hasAdzuna}
        watchedCompanies={watchedCompanies}
        jobMarket={jobMarket}
      />
    </div>
  );
}
