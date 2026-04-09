import type { Skill } from '@/lib/actions/skills';

const LEVEL_WEIGHT: Record<string, number> = {
  expert: 4, strong: 3, familiar: 2, learning: 1,
};

/**
 * Builds a search query from the user's top skills.
 * Prioritises primary + expert skills, includes a role hint.
 */
export function buildSearchQuery(skills: Skill[]): string {
  const active = skills.filter((s) => !s.is_hidden);

  const ranked = [...active]
    .sort((a, b) => {
      const aScore = (a.is_primary ? 10 : 0) + (LEVEL_WEIGHT[a.level] ?? 0);
      const bScore = (b.is_primary ? 10 : 0) + (LEVEL_WEIGHT[b.level] ?? 0);
      return bScore - aScore;
    })
    .slice(0, 6)
    .map((s) => s.name);

  const roleHint = buildRoleHint(active);

  // Put role hint first so API relevance ranking picks it up
  const parts = roleHint ? [roleHint, ...ranked] : ranked;

  // Deduplicate (role hint might overlap with a skill name)
  return [...new Set(parts.map((p) => p.toLowerCase()))].join(' ');
}

/**
 * Returns a role title derived from the user's top primary skill category.
 */
export function buildRoleHint(skills: Skill[]): string {
  const primary = skills.filter((s) => s.is_primary && !s.is_hidden);
  if (primary.length === 0) return '';

  const CATEGORY_ROLE: Record<string, string> = {
    languages:  'Software Engineer',
    frameworks: 'Software Engineer',
    databases:  'Backend Engineer',
    cloud:      'Cloud Engineer',
    devops:     'DevOps Engineer',
    ml_ai:      'Machine Learning Engineer',
    data:       'Data Engineer',
    mobile:     'Mobile Engineer',
    design:     'UX Designer',
    tools:      'Software Engineer',
    other:      'Software Engineer',
  };

  const topCategory = primary[0].category;
  return CATEGORY_ROLE[topCategory] ?? 'Software Engineer';
}
