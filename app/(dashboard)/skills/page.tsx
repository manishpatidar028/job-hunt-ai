import { getSkills } from '@/lib/actions/skills';
import { SkillsClient } from '@/components/skills/skills-client';

export default async function SkillsPage() {
  const skills = await getSkills();

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.02em', marginBottom: '4px',
        }}>
          Skill Graph
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          AI-extracted skills from your CV. Click any bubble to edit.
        </p>
      </div>

      <SkillsClient initialSkills={skills} />
    </div>
  );
}
