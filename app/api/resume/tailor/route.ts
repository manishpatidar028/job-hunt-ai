import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAndRecordUsage } from '@/lib/usage/check-limit';
import { generateText } from 'ai';
import { geminiFlash } from '@/lib/ai/groq';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await checkAndRecordUsage(user.id, 'resume_tailor');
  if (!limit.allowed) return NextResponse.json({ error: `Daily limit reached (${limit.limit}/day). Resets at midnight.`, retryAfter: limit.retryAfter }, { status: 429 });

  const { jdText, title, company } = await request.json();
  if (!jdText) return NextResponse.json({ error: 'jdText required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('cv_text, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const cvText = profile?.cv_text?.trim();
  if (!cvText) {
    return NextResponse.json({ error: 'No CV found. Please upload your CV first.' }, { status: 400 });
  }

  const prompt = `You are an expert resume writer. Tailor the candidate's resume for the specific job below.

RULES:
- Do NOT fabricate any experience, skills, or qualifications that are not in the original CV
- Reorder bullet points to surface the most relevant experience first
- Reword descriptions to naturally incorporate keywords from the job description
- Emphasize skills and achievements that match what the employer is looking for
- Keep all dates, companies, titles, and factual information exactly as-is
- Output the full tailored resume as clean plain text (no markdown)

JOB: ${title ?? ''} at ${company ?? ''}

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

ORIGINAL CV:
${cvText.slice(0, 4000)}

OUTPUT: The complete tailored resume as plain text.`;

  try {
    const { text } = await generateText({
      model: geminiFlash,
      system: 'You are an expert resume writer. Output only the tailored resume text, nothing else.',
      prompt,
    });
    return NextResponse.json({ tailoredResume: text.trim(), originalCv: cvText });
  } catch (err) {
    console.error('[resume/tailor] error:', err);
    return NextResponse.json({ error: 'Failed to generate tailored resume' }, { status: 500 });
  }
}
