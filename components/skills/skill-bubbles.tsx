'use client';

import type { Skill } from '@/lib/actions/skills';

const LEVEL_COLORS = {
  expert:   { bg: '#F0FDF4', border: '#10B981', text: '#065F46', dot: '#10B981' },
  strong:   { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', dot: '#3B82F6' },
  familiar: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', dot: '#F59E0B' },
  learning: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dot: '#94A3B8' },
};

const LEVEL_ORDER = ['expert', 'strong', 'familiar', 'learning'] as const;

function getBubbleSize(years: number): React.CSSProperties {
  if (years < 1)  return { padding: '6px 12px',  fontSize: '11px', fontWeight: 500 };
  if (years < 3)  return { padding: '8px 14px',  fontSize: '12px', fontWeight: 500 };
  if (years < 5)  return { padding: '10px 18px', fontSize: '13px', fontWeight: 500 };
  return                  { padding: '12px 22px', fontSize: '14px', fontWeight: 600 };
}

type Props = {
  skills: Skill[];
  onEdit: (skill: Skill) => void;
};

export function SkillBubbles({ skills, onEdit }: Props) {
  const visible = skills.filter((s) => !s.is_hidden);
  const primaryCount = visible.filter((s) => s.is_primary).length;
  const levelCounts = LEVEL_ORDER.map((l) => ({
    level: l,
    count: visible.filter((s) => s.level === l).length,
    ...LEVEL_COLORS[l],
  })).filter((l) => l.count > 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
          {visible.length} skills{primaryCount > 0 ? ` · ${primaryCount} primary` : ''}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {levelCounts.map(({ level, count, dot, bg, border, text }) => (
            <span key={level} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 9px', borderRadius: '99px',
              background: bg, border: `1px solid ${border}`,
              fontSize: '11px', fontWeight: 500, color: text,
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
              {level.charAt(0).toUpperCase() + level.slice(1)} · {count}
            </span>
          ))}
        </div>
      </div>

      {/* Bubbles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
        {skills.map((skill) => {
          const lc = LEVEL_COLORS[skill.level] ?? LEVEL_COLORS.learning;
          const size = getBubbleSize(skill.years_experience);

          return (
            <div
              key={skill.id}
              onClick={() => onEdit(skill)}
              style={{
                position: 'relative',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                ...size,
                background: lc.bg,
                border: `1.5px solid ${lc.border}`,
                color: lc.text,
                borderRadius: '999px',
                cursor: 'pointer',
                opacity: skill.is_hidden ? 0.4 : 1,
                textDecoration: skill.is_hidden ? 'line-through' : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Source badge */}
              <span style={{
                position: 'absolute', top: '-5px', left: '-2px',
                fontSize: '9px', fontWeight: 700, lineHeight: 1,
                padding: '1px 4px', borderRadius: '99px',
                background: skill.source === 'manual' ? '#6366F1' : '#10B981',
                color: '#fff',
              }}>
                {skill.source === 'manual' ? '+' : 'CV'}
              </span>

              {skill.name}

              {/* Primary dot */}
              {skill.is_primary && (
                <span style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#10B981', border: '1.5px solid #fff',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {skills.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No skills to display.
        </p>
      )}
    </div>
  );
}
