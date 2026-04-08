export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Job } from '@/lib/actions/jobs';
import { PrepClient } from '@/components/prep/prep-client';

export default async function PrepPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['interview', 'applied'])
    .order('ai_score', { ascending: false, nullsFirst: false });

  const jobs = (data ?? []) as Job[];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Interview Prep
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          AI-generated prep content: questions, STAR stories, company research, and negotiation scripts.
        </p>
      </div>
      <PrepClient jobs={jobs} />
    </div>
  );
}
