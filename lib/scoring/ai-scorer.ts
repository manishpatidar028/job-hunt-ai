import { generateText } from 'ai';
import { z } from 'zod';
import { geminiFlash } from '@/lib/ai/groq';
import type { Skill } from '@/lib/actions/skills';

const scoreSchema = z.object({
  overallScore: z.number().min(0).max(5),
  breakdown: z.object({
    skillMatch:           z.number().min(0).max(5),
    seniorityFit:         z.number().min(0).max(5),
    domainOverlap:        z.number().min(0).max(5),
    remoteCompatibility:  z.number().min(0).max(5),
    growthPotential:      z.number().min(0).max(5),
  }),
  matchedSkills: z.array(z.string()).default([]),
  gaps:          z.array(z.string()).default([]),
  recommendation: z.enum(['strong_apply', 'apply', 'consider', 'skip']),
  reasoning: z.string(),
});

export type ScoreResult = z.infer<typeof scoreSchema>;

const FALLBACK: ScoreResult = {
  overallScore: 2.5,
  breakdown: { skillMatch: 2.5, seniorityFit: 2.5, domainOverlap: 2.5, remoteCompatibility: 2.5, growthPotential: 2.5 },
  matchedSkills: [],
  gaps: [],
  recommendation: 'consider',
  reasoning: 'AI scoring temporarily unavailable. This is a neutral placeholder score — evaluate manually.',
};

export async function aiScore(
  jdText: string,
  cvText: string,
  skills: Skill[]
): Promise<ScoreResult> {
  const skillSummary = skills
    .filter((s) => !s.is_hidden)
    .map((s) => `${s.name} (${s.level}, ${s.years_experience}yrs)`)
    .join(', ');

  const prompt = `CANDIDATE SKILLS: ${skillSummary}

JOB DESCRIPTION:
${jdText.slice(0, 4000)}

CANDIDATE CV SUMMARY:
${cvText.slice(0, 1000)}

Return ONLY this JSON, nothing else:
{
  "overallScore": 3.5,
  "breakdown": {
    "skillMatch": 3.5,
    "seniorityFit": 3.0,
    "domainOverlap": 3.5,
    "remoteCompatibility": 4.0,
    "growthPotential": 3.0
  },
  "matchedSkills": ["TypeScript", "React"],
  "gaps": ["Kubernetes", "Go"],
  "recommendation": "apply",
  "reasoning": "Strong frontend match. Missing some DevOps skills."
}

All scores 0-5 (1 decimal). recommendation must be one of: strong_apply, apply, consider, skip.`;

  try {
    const { text } = await generateText({
      model: geminiFlash,
      system:
        'You are an expert technical recruiter evaluating job fit. Return ONLY valid JSON with no markdown fences, no explanation.',
      prompt,
    });
    const clean = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const parsed = scoreSchema.parse(JSON.parse(clean));
    return parsed;
  } catch (err) {
    console.error('[ai-scorer] error:', err);
    return FALLBACK;
  }
}
