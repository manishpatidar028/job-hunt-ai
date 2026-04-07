import type { Skill } from '@/lib/actions/skills';

/**
 * Builds a search query string from the user's primary/expert skills.
 * Prioritises: primary > expert > strong, top 5.
 */
export function buildSearchQuery(skills: Skill[]): string {
  const ranked = skills
    .filter((s) => !s.is_hidden)
    .sort((a, b) => {
      const aScore = (a.is_primary ? 10 : 0) + { expert: 4, strong: 3, familiar: 2, learning: 1 }[a.level];
      const bScore = (b.is_primary ? 10 : 0) + { expert: 4, strong: 3, familiar: 2, learning: 1 }[b.level];
      return bScore - aScore;
    })
    .slice(0, 5)
    .map((s) => s.name);

  return ranked.join(' ');
}

/**
 * Returns a role title hint for the search (e.g. "Software Engineer", "Data Scientist").
 * Derived from the top primary category.
 */
export function buildRoleHint(skills: Skill[]): string {
  const primary = skills.filter((s) => s.is_primary && !s.is_hidden);
  if (primary.length === 0) return 'Software Engineer';

  const categories: Record<string, string> = {
    languages: 'Software Engineer',
    frameworks: 'Software Engineer',
    databases: 'Backend Engineer',
    cloud: 'Cloud Engineer',
    devops: 'DevOps Engineer',
    ml_ai: 'Machine Learning Engineer',
    data: 'Data Engineer',
    mobile: 'Mobile Engineer',
    design: 'UX Designer',
    other: 'Software Engineer',
  };

  const topCategory = primary[0].category;
  return categories[topCategory] ?? 'Software Engineer';
}
