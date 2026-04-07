'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import type { Skill } from '@/lib/actions/skills';

const SUGGESTIONS = [
  'Angular', 'React', 'Vue', 'TypeScript', 'JavaScript', 'Next.js',
  'Node.js', 'Java', 'Spring Boot', 'Python', 'Go', 'Rust',
  'Docker', 'Kubernetes', 'AWS', 'PostgreSQL', 'MongoDB', 'Redis',
  'GraphQL', 'REST APIs', 'Git', 'Figma', 'Tailwind CSS', 'CSS',
  'HTML', 'React Native', 'Flutter', 'TensorFlow', 'PyTorch',
  'LangChain', 'NX Monorepo', 'RxJS', 'NgRx', 'Zustand',
];

const LEVELS = ['expert', 'strong', 'familiar', 'learning'] as const;
const LEVEL_LABELS = { expert: 'Expert', strong: 'Strong', familiar: 'Familiar', learning: 'Learning' };
const LEVEL_COLORS = {
  expert:   { bg: '#F0FDF4', border: '#10B981', text: '#065F46', activeBg: '#10B981' },
  strong:   { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', activeBg: '#3B82F6' },
  familiar: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', activeBg: '#F59E0B' },
  learning: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', activeBg: '#94A3B8' },
};

const CATEGORIES = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend',  label: 'Backend' },
  { value: 'devops',   label: 'DevOps' },
  { value: 'database', label: 'Database' },
  { value: 'mobile',   label: 'Mobile' },
  { value: 'ai_ml',    label: 'AI & ML' },
  { value: 'tools',    label: 'Tools' },
  { value: 'soft',     label: 'Soft Skills' },
];

export type SavePayload = {
  name: string;
  yearsExperience: number;
  level: string;
  category: string;
  isPrimary: boolean;
};

type Props = {
  open: boolean;
  skill: Skill | null;
  onClose: () => void;
  onSave: (data: SavePayload) => void;
  onDelete: (id: string) => void;
};

export function AddSkillSheet({ open, skill, onClose, onSave, onDelete }: Props) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [years, setYears] = useState(0);
  const [level, setLevel] = useState<typeof LEVELS[number]>('familiar');
  const [category, setCategory] = useState('tools');
  const [isPrimary, setIsPrimary] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Animate in/out
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      setConfirmDelete(false);
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (skill) {
        setName(skill.name);
        setYears(skill.years_experience);
        setLevel(skill.level);
        setCategory(skill.category);
        setIsPrimary(skill.is_primary);
      } else {
        setName('');
        setYears(0);
        setLevel('familiar');
        setCategory('tools');
        setIsPrimary(false);
      }
      setShowSuggestions(false);
      setSaving(false);
    }
  }, [open, skill]);

  const suggestions = name.trim()
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(name.toLowerCase()) && s.toLowerCase() !== name.toLowerCase())
    : SUGGESTIONS;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    onSave({ name: name.trim(), yearsExperience: years, level, category, isPrimary });
  }

  function handleStepYears(delta: number) {
    setYears((v) => Math.max(0, Math.min(30, parseFloat((v + delta).toFixed(1)))));
  }

  if (!open && !visible) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,23,42,0.3)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, height: '100%', width: '400px',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-4px 0 24px rgba(15,23,42,0.08)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-default)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {skill ? 'Edit skill' : 'Add skill'}
          </h2>
          <button onClick={onClose} style={iconBtnStyle}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Skill name */}
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Skill name</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. TypeScript"
              style={inputStyle}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', marginTop: '4px',
                boxShadow: 'var(--shadow-dropdown)',
                maxHeight: '200px', overflowY: 'auto',
              }}>
                {suggestions.slice(0, 10).map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => { setName(s); setShowSuggestions(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', fontSize: '13px',
                      color: 'var(--text-primary)', background: 'none', border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Years of experience */}
          <div>
            <label style={labelStyle}>Years of experience</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => handleStepYears(-0.5)} style={stepperBtn}>
                <Minus size={14} />
              </button>
              <input
                type="number" min={0} max={30} step={0.5}
                value={years}
                onChange={(e) => setYears(Math.max(0, Math.min(30, parseFloat(e.target.value) || 0)))}
                style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
              />
              <button onClick={() => handleStepYears(0.5)} style={stepperBtn}>
                <Plus size={14} />
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>years</span>
            </div>
          </div>

          {/* Level */}
          <div>
            <label style={labelStyle}>Level</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {LEVELS.map((l) => {
                const lc = LEVEL_COLORS[l];
                const active = level === l;
                return (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    style={{
                      flex: 1, padding: '7px 4px', fontSize: '11px', fontWeight: 500,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: active ? lc.activeBg : lc.bg,
                      border: `1.5px solid ${lc.border}`,
                      color: active ? '#fff' : lc.text,
                    }}
                  >
                    {LEVEL_LABELS[l]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Primary toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Mark as primary
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Highlight as a core skill
              </div>
            </div>
            <button
              onClick={() => setIsPrimary((v) => !v)}
              style={{
                width: '40px', height: '22px', borderRadius: '99px', border: 'none',
                cursor: 'pointer', position: 'relative', flexShrink: 0,
                background: isPrimary ? 'var(--accent)' : 'var(--border-strong)',
                transition: 'background 0.2s ease',
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: isPrimary ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-default)',
          display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0,
        }}>
          {skill && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                color: 'var(--danger)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Trash2 size={13} /> Delete skill
            </button>
          )}
          {confirmDelete && (
            <div style={{
              padding: '12px', borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--danger)', textAlign: 'center' }}>
                Delete this skill permanently?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { onDelete(skill!.id); }}
                  style={{ flex: 1, padding: '7px', borderRadius: 'var(--radius-md)', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: '7px', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '9px', borderRadius: 'var(--radius-md)',
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              style={{
                flex: 2, padding: '9px', borderRadius: 'var(--radius-md)',
                background: !name.trim() ? 'var(--text-muted)' : 'var(--accent)',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500,
                cursor: !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : skill ? 'Save changes' : 'Add skill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  background: 'var(--bg-input)', border: '1px solid var(--border-input)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
  background: 'transparent', border: '1px solid var(--border-default)',
  color: 'var(--text-muted)', cursor: 'pointer',
};

const stepperBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
  background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
};
