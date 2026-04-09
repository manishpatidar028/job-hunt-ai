import type { Skill } from '@/lib/actions/skills';

const LEVEL_POINTS: Record<string, number> = {
  expert:   2.0,
  strong:   1.5,
  familiar: 1.0,
  learning: 0.5,
};

// Aliases — if JD contains any of these, it counts as a match for the key skill
const SKILL_ALIASES: Record<string, string[]> = {
  'javascript':   ['js', 'javascript', 'ecmascript', 'es6', 'es2015'],
  'typescript':   ['ts', 'typescript'],
  'react':        ['react', 'react.js', 'reactjs'],
  'next.js':      ['next.js', 'nextjs', 'next js'],
  'node.js':      ['node.js', 'nodejs', 'node js', 'node'],
  'vue':          ['vue', 'vue.js', 'vuejs'],
  'angular':      ['angular', 'angularjs', 'angular.js'],
  'python':       ['python', 'py'],
  'golang':       ['golang', 'go lang', ' go '],
  'kubernetes':   ['kubernetes', 'k8s'],
  'postgresql':   ['postgresql', 'postgres', 'psql'],
  'mongodb':      ['mongodb', 'mongo'],
  'elasticsearch':['elasticsearch', 'elastic search', 'opensearch'],
  'aws':          ['aws', 'amazon web services'],
  'gcp':          ['gcp', 'google cloud', 'google cloud platform'],
  'azure':        ['azure', 'microsoft azure'],
  'graphql':      ['graphql', 'graph ql'],
  'tailwind':     ['tailwind', 'tailwindcss', 'tailwind css'],
  'css':          ['css', 'css3', 'scss', 'sass'],
  'html':         ['html', 'html5'],
  'java':         ['java'],
  'spring':       ['spring', 'spring boot', 'springboot'],
  'docker':       ['docker', 'dockerfile', 'containerization'],
  'redis':        ['redis', 'elasticache'],
  'kafka':        ['kafka', 'apache kafka'],
  'terraform':    ['terraform', 'iac', 'infrastructure as code'],
  'ci/cd':        ['ci/cd', 'cicd', 'github actions', 'jenkins', 'gitlab ci'],
};

function getAliases(skillName: string): string[] {
  const lower = skillName.toLowerCase();
  // Check if this skill is a key in our map
  if (SKILL_ALIASES[lower]) return SKILL_ALIASES[lower];
  // Check if it matches any alias value
  for (const [, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.includes(lower)) return aliases;
  }
  return [lower];
}

function skillMatchesJd(skillName: string, normalizedJd: string): boolean {
  const aliases = getAliases(skillName);
  return aliases.some((alias) => normalizedJd.includes(alias));
}

// Extract required years of experience from JD text
export function extractRequiredYears(jdText: string): { min: number; max: number | null } | null {
  const text = jdText.toLowerCase();

  const patterns = [
    // "3-5 years", "3 to 5 years"
    /(\d+)\s*(?:-|to)\s*(\d+)\s*\+?\s*years?/,
    // "5+ years", "5 or more years"
    /(\d+)\s*\+\s*years?/,
    // "minimum 3 years", "at least 3 years", "3 years minimum"
    /(?:minimum|at least|min\.?)\s*(\d+)\s*years?/,
    /(\d+)\s*years?\s*(?:minimum|min\.?)/,
    // "3 years of experience"
    /(\d+)\s*years?\s*(?:of\s+)?(?:relevant\s+)?experience/,
    // "experience of 3 years"
    /experience\s+of\s+(\d+)\s*(?:\+\s*)?years?/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // Range match e.g. "3-5 years"
        return { min: parseInt(match[1]), max: parseInt(match[2]) };
      } else {
        // Single value — treat as minimum
        return { min: parseInt(match[1]), max: null };
      }
    }
  }

  return null;
}

export function experienceMatches(
  jdText: string,
  userYears: number,
  toleranceUnder = 1 // allow applying if slightly under requirement
): boolean {
  const required = extractRequiredYears(jdText);
  if (!required) return true; // no experience mentioned — show the job

  const effectiveYears = userYears + toleranceUnder;

  if (effectiveYears < required.min) return false;
  if (required.max && userYears > required.max + 3) return false; // overqualified by 3+ years

  return true;
}

export type RuleScoreDetails = {
  score: number;
  matched: { name: string; level: string; isPrimary: boolean }[];
  missingPrimary: string[];
  requiredYears: { min: number; max: number | null } | null;
};

export function ruleScoreDetails(jdText: string, skills: Skill[]): RuleScoreDetails {
  const normalized = jdText.toLowerCase();
  const activeSkills = skills.filter((s) => !s.is_hidden);

  let rawScore = 0;
  const matched: RuleScoreDetails['matched'] = [];
  const missingPrimary: string[] = [];

  for (const skill of activeSkills) {
    if (skillMatchesJd(skill.name, normalized)) {
      rawScore += LEVEL_POINTS[skill.level] ?? 0.5;
      if (skill.is_primary) rawScore += 0.5;
      matched.push({ name: skill.name, level: skill.level, isPrimary: skill.is_primary });
    } else if (skill.is_primary) {
      missingPrimary.push(skill.name);
    }
  }

  const score = Math.round(Math.min((rawScore / 10) * 5, 5) * 10) / 10;
  const requiredYears = extractRequiredYears(jdText);

  return { score, matched, missingPrimary, requiredYears };
}

export function ruleScore(jdText: string, skills: Skill[]): number {
  return ruleScoreDetails(jdText, skills).score;
}
