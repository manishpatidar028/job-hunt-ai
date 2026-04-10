import { createClient } from '@/lib/supabase/server';

export type AiAction =
  | 'job_score'
  | 'cv_upload'
  | 'discover_evaluate'
  | 'resume_tailor'
  | 'cover_letter'
  | 'interview_prep';

const DAILY_LIMITS: Record<AiAction, number> = {
  job_score:          20,
  cv_upload:           3,
  discover_evaluate:  15,
  resume_tailor:       10,
  cover_letter:        5,
  interview_prep:     10,
};

type LimitResult =
  | { allowed: true; used: number; limit: number; remaining: number }
  | { allowed: false; used: number; limit: number; remaining: 0; retryAfter: string };

export async function checkAndRecordUsage(
  userId: string,
  action: AiAction
): Promise<LimitResult> {
  const supabase = await createClient();
  const limit = DAILY_LIMITS[action];

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', dayStart.toISOString());

  const used = count ?? 0;

  if (used >= limit) {
    const tomorrow = new Date(dayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
      retryAfter: tomorrow.toISOString(),
    };
  }

  // Record usage
  await supabase.from('ai_usage').insert({ user_id: userId, action });

  return { allowed: true, used: used + 1, limit, remaining: limit - used - 1 };
}
