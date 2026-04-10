import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DAILY_LIMITS: Record<string, number> = {
  job_score:          20,
  cv_upload:           3,
  discover_evaluate:  15,
  resume_tailor:       5,
  cover_letter:        5,
  interview_prep:     10,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('ai_usage')
    .select('action')
    .eq('user_id', user.id)
    .gte('created_at', dayStart.toISOString());

  // Count per action
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.action] = (counts[row.action] ?? 0) + 1;
  }

  // Build result
  const result: Record<string, { used: number; limit: number; remaining: number }> = {};
  for (const [action, limit] of Object.entries(DAILY_LIMITS)) {
    const used = counts[action] ?? 0;
    result[action] = { used, limit, remaining: Math.max(0, limit - used) };
  }

  return NextResponse.json(result);
}
