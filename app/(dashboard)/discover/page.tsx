import { createClient } from '@/lib/supabase/server';
import { buildSearchQuery } from '@/lib/discover/build-query';
import { DiscoverClient } from '@/components/discover/discover-client';
import type { Skill } from '@/lib/actions/skills';

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: skillsData } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', user!.id);

  const skills = (skillsData ?? []) as Skill[];
  const initialQuery = buildSearchQuery(skills);
  const hasAdzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);

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
      <DiscoverClient initialQuery={initialQuery} hasAdzuna={hasAdzuna} />
    </div>
  );
}
