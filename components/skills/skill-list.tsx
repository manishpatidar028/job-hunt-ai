'use client';

import { useState } from 'react';
import { Search, Plus, Star, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import type { Skill } from '@/lib/actions/skills';

const LEVEL_COLORS = {
  expert:   { bg: '#F0FDF4', border: '#10B981', text: '#065F46', dot: '#10B981' },
  strong:   { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', dot: '#3B82F6' },
  familiar: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', dot: '#F59E0B' },
  learning: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dot: '#94A3B8' },
};

const CAT_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend',  label: 'Backend' },
  { value: 'devops',   label: 'DevOps' },
  { value: 'database', label: 'Database' },
  { value: 'mobile',   label: 'Mobile' },
  { value: 'ai_ml',    label: 'AI/ML' },
  { value: 'tools',    label: 'Tools' },
  { value: 'soft',     label: 'Soft' },
];

const CAT_LABELS: Record<string, string> = {
  frontend: 'Frontend', backend: 'Backend', devops: 'DevOps',
  database: 'Database', mobile: 'Mobile', ai_ml: 'AI / ML',
  tools: 'Tools', soft: 'Soft Skills',
};

const CAT_ORDER = ['frontend', 'backend', 'devops', 'database', 'mobile', 'ai_ml', 'tools', 'soft'];

type Props = {
  skills: Skill[];
  onEdit: (skill: Skill) => void;
  onAdd: () => void;
  onTogglePrimary: (id: string, val: boolean) => void;
  onToggleHidden: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
};

export function SkillList({ skills, onEdit, onAdd, onTogglePrimary, onToggleHidden, onDelete }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = skills.filter((s) => {
    const matchesCat = activeCategory === 'all' || s.category === activeCategory;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Group by category when "all" is selected
  const groups: { label: string; items: Skill[] }[] = activeCategory === 'all'
    ? CAT_ORDER
        .map((cat) => ({ label: CAT_LABELS[cat] ?? cat, items: filtered.filter((s) => s.category === cat) }))
        .filter((g) => g.items.length > 0)
    : [{ label: CAT_LABELS[activeCategory] ?? activeCategory, items: filtered }];

  const presentCats = new Set(skills.map((s) => s.category));

  if (skills.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)', padding: '40px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center',
        boxShadow: 'var(--shadow-card)',
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No skills yet.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/profile" style={secondaryBtnStyle}>Upload CV</a>
          <button onClick={onAdd} style={primaryBtnStyle}>Add manually</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border-default)',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Your Skills</span>
        <button onClick={onAdd} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 12px', borderRadius: 'var(--radius-md)',
          background: 'var(--accent)', border: 'none',
          color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
        }}>
          <Plus size={12} /> Add skill
        </button>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', overflowX: 'auto', padding: '0 20px',
        borderBottom: '1px solid var(--border-default)',
        scrollbarWidth: 'none',
        gap: '0',
      }}>
        {CAT_TABS.filter((t) => t.value === 'all' || presentCats.has(t.value)).map((tab) => {
          const active = activeCategory === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              style={{
                padding: '10px 12px', fontSize: '12px', fontWeight: 500,
                border: 'none', background: 'none', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills…"
            style={{
              width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px',
              background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
        {groups.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            No skills match your search.
          </p>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label}>
              {activeCategory === 'all' && (
                <div style={{
                  padding: '8px 20px 4px',
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                }}>
                  {label} <span style={{ opacity: 0.7 }}>({items.length})</span>
                </div>
              )}
              {items.map((skill) => {
                const lc = LEVEL_COLORS[skill.level] ?? LEVEL_COLORS.learning;
                return (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 20px',
                      opacity: skill.is_hidden ? 0.5 : 1,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Level dot + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: lc.dot, flexShrink: 0 }} />
                      <span style={{
                        fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
                        textDecoration: skill.is_hidden ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {skill.name}
                      </span>
                    </div>

                    {/* Years + level pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {skill.years_experience > 0 && (
                        <span style={{
                          fontSize: '11px', color: 'var(--text-muted)',
                          background: 'var(--bg-muted)', padding: '1px 6px',
                          borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)',
                        }}>
                          {skill.years_experience}y
                        </span>
                      )}
                      <span style={{
                        fontSize: '10px', fontWeight: 500, padding: '2px 7px',
                        borderRadius: '99px', background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`,
                      }}>
                        {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      <ActionBtn
                        onClick={() => onTogglePrimary(skill.id, !skill.is_primary)}
                        title={skill.is_primary ? 'Remove primary' : 'Mark primary'}
                        color={skill.is_primary ? '#10B981' : undefined}
                      >
                        <Star size={12} fill={skill.is_primary ? '#10B981' : 'none'} />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => onToggleHidden(skill.id, !skill.is_hidden)}
                        title={skill.is_hidden ? 'Show' : 'Hide'}
                      >
                        {skill.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </ActionBtn>
                      <ActionBtn onClick={() => onEdit(skill)} title="Edit">
                        <Pencil size={11} />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => onDelete(skill.id)}
                        title="Delete"
                        color="#EF4444"
                      >
                        <Trash2 size={11} />
                      </ActionBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title, color }: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px', borderRadius: '5px',
        background: 'none', border: 'none',
        color: color ?? 'var(--text-muted)', cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-default)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-md)',
  background: 'var(--accent)', border: 'none',
  color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  textDecoration: 'none',
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '7px 16px', borderRadius: 'var(--radius-md)',
  background: 'transparent', border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  textDecoration: 'none',
};
