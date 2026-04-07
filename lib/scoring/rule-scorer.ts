import type { Skill } from '@/lib/actions/skills';

const LEVEL_POINTS: Record<string, number> = {
  expert:   2.0,
  strong:   1.5,
  familiar: 1.0,
  learning: 0.5,
};

export type RuleScoreDetails = {
  score: number;
  matched: { name: string; level: string; isPrimary: boolean }[];
  missingPrimary: string[];
};

export function ruleScoreDetails(jdText: string, skills: Skill[]): RuleScoreDetails {
  const normalized = jdText.toLowerCase();
  const activeSkills = skills.filter((s) => !s.is_hidden);

  let rawScore = 0;
  const matched: RuleScoreDetails['matched'] = [];
  const missingPrimary: string[] = [];

  for (const skill of activeSkills) {
    if (normalized.includes(skill.name.toLowerCase())) {
      rawScore += LEVEL_POINTS[skill.level] ?? 0.5;
      if (skill.is_primary) rawScore += 0.5;
      matched.push({ name: skill.name, level: skill.level, isPrimary: skill.is_primary });
    } else if (skill.is_primary) {
      missingPrimary.push(skill.name);
    }
  }

  const score = Math.round(Math.min((rawScore / 10) * 5, 5) * 10) / 10;
  return { score, matched, missingPrimary };
}

export function ruleScore(jdText: string, skills: Skill[]): number {
  return ruleScoreDetails(jdText, skills).score;
}
