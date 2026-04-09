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

  const limit = await checkAndRecordUsage(user.id, 'cover_letter');
  if (!limit.allowed) return NextResponse.json({ error: `Daily limit reached (${limit.limit}/day). Resets at midnight.`, retryAfter: limit.retryAfter }, { status: 429 });

  const { jdText, title, company } = await request.json();
  if (!jdText) return NextResponse.json({ error: 'jdText required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('cv_text, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const cvText = profile?.cv_text?.trim();
  const candidateName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Candidate';

  if (!cvText) {
    return NextResponse.json({ error: 'No CV found. Please upload your CV first.' }, { status: 400 });
  }

  const prompt = `Write a professional cover letter for ${candidateName} applying for the role of ${title ?? 'the position'} at ${company ?? 'the company'}.

STRUCTURE:
1. Opening paragraph — express enthusiasm for the specific role and company, mention 1 key thing about the company
2. Body paragraph 1 — highlight most relevant experience from CV that matches the JD requirements
3. Body paragraph 2 — highlight relevant technical skills and a specific achievement or impact
4. Closing paragraph — express eagerness to contribute, call to action

TONE: Professional, confident, concise. No filler phrases like "I am writing to apply".

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

CANDIDATE CV:
${cvText.slice(0, 3000)}

Write the complete cover letter. Address it to "Hiring Manager" if no name is known. Include today's date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`;

  try {
    const { text } = await generateText({
      model: geminiFlash,
      system: 'You are an expert cover letter writer. Output only the cover letter text, nothing else.',
      prompt,
    });
    return NextResponse.json({ coverLetter: text.trim() });
  } catch (err) {
    console.error('[resume/cover-letter] error:', err);
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 });
  }
}
