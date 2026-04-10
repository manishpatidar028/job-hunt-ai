export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const LEVEL_WEIGHT: Record<string, number> = { expert: 4, strong: 3, familiar: 2, learning: 1 };
  const activeSkills = skills.filter((s) => !s.is_hidden);
  const initialSkills = [...activeSkills]
    .sort((a, b) => {
      const aScore = (a.is_primary ? 10 : 0) + (LEVEL_WEIGHT[a.level] ?? 0);
      const bScore = (b.is_primary ? 10 : 0) + (LEVEL_WEIGHT[b.level] ?? 0);
      return bScore - aScore;
    })
    .slice(0, 6)
    .map((s) => s.name);
  const allUserSkills = activeSkills.map((s) => s.name);

  const hasAdzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  const watchedCompanies = (prefs.watchedCompanies as string[]) ?? [];
  const jobMarket = (prefs.jobMarket as string) ?? 'in';
  const userYearsExperience = (prefs.totalYearsExperience as number) ?? 0;

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
        initialSkills={initialSkills}
        allUserSkills={allUserSkills}
        hasAdzuna={hasAdzuna}
        watchedCompanies={watchedCompanies}
        jobMarket={jobMarket}
        userYearsExperience={userYearsExperience}
      />
    </div>
  );
}
