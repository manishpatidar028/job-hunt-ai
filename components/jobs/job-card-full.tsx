'use client';

import { useState } from 'react';
import { MapPin, Wifi, Monitor, ArrowRight } from 'lucide-react';
import type { Job } from '@/lib/actions/jobs';

const LOGO_PALETTES: [string, string][] = [
  ['#EFF6FF', '#3B82F6'], ['#F0FDF4', '#10B981'], ['#FDF4FF', '#A855F7'],
  ['#FFF7ED', '#F97316'], ['#FEF2F2', '#EF4444'], ['#F0FDFA', '#14B8A6'],
];
function companyPalette(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_PALETTES[Math.abs(hash) % LOGO_PALETTES.length];
}

const BREAKDOWN_DIMS = ['skillMatch', 'seniorityFit', 'domainOverlap', 'remoteCompatibility', 'growthPotential'];
const DIM_LABELS = ['Skills', 'Seniority', 'Domain', 'Remote', 'Growth'];
const DIM_COLORS = ['#10B981', '#6366F1', '#F59E0B', '#0EA5E9', '#A855F7'];

const RECOMMENDATION_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  strong_apply: { bg: '#F0FDF4', color: '#065F46', border: '#BBF7D0', label: 'Strong Apply' },
  apply:        { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Apply' },
  consider:     { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Consider' },
  skip:         { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: 'Skip' },
};

const STATUS_OPTS = ['new', 'reviewing', 'applied', 'responded', 'interview', 'offer', 'rejected', 'skipped'];

function scoreStyle(s: number) {
  if (s >= 4) return { color: '#065F46', bg: '#F0FDF4', border: '#BBF7D0' };
  if (s >= 3) return { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' };
  return           { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' };
}

function formatSalary(min?: number | null, max?: number | null, currency = 'INR') {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    currency === 'INR' ? `₹${(n / 100000).toFixed(0)}L` : `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

type Props = {
  job: Job;
  onViewDetails: (job: Job) => void;
  onStatusChange: (id: string, status: string) => void;
};

export function JobCardFull({ job, onViewDetails, onStatusChange }: Props) {
  const [hovered, setHovered] = useState(false);
  const [hoveredDim, setHoveredDim] = useState<number | null>(null);

  const [logoBg, logoColor] = companyPalette(job.company ?? 'X');
  const initials = (job.company ?? '??').slice(0, 2).toUpperCase();
  const score = job.ai_score ?? job.rule_score ?? 0;
  const sc = scoreStyle(score);
  const bd = job.score_breakdown ?? {};
  const rec = (bd as Record<string, string>).recommendation ?? null;
  const recStyle = rec ? (RECOMMENDATION_STYLES[rec] ?? null) : null;
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-accent)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '16px 20px',
        boxShadow: hovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        {/* Logo */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: logoBg, color: logoColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700,
        }}>
          {initials}
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 500 }}>
            {job.company ?? 'Unknown'}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
            {job.title ?? 'Untitled role'}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {job.remote_type === 'remote' && (
              <span style={tagStyle}><Wifi size={9} /> Remote</span>
            )}
            {job.remote_type === 'hybrid' && (
              <span style={tagStyle}><Monitor size={9} /> Hybrid</span>
            )}
            {job.remote_type === 'onsite' && (
              <span style={tagStyle}><Monitor size={9} /> Onsite</span>
            )}
            {job.location && (
              <span style={tagStyle}><MapPin size={9} /> {job.location}</span>
            )}
            {salary && (
              <span style={tagStyle}>{salary}</span>
            )}
          </div>

          {/* Score mini bars */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
            {BREAKDOWN_DIMS.map((dim, i) => {
              const val = (bd as Record<string, number>)[dim] ?? 0;
              const isHovered = hoveredDim === i;
              return (
                <div
                  key={dim}
                  style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  onMouseEnter={() => setHoveredDim(i)}
                  onMouseLeave={() => setHoveredDim(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--text-primary)', color: '#fff',
                      fontSize: '10px', padding: '3px 7px', borderRadius: '5px', whiteSpace: 'nowrap',
                      marginBottom: '4px', zIndex: 10, pointerEvents: 'none',
                    }}>
                      {DIM_LABELS[i]}: {val.toFixed(1)}
                    </div>
                  )}
                  <div style={{
                    width: '36px', height: '4px',
                    background: 'var(--border-strong)', borderRadius: '99px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${(val / 5) * 100}%`,
                      background: DIM_COLORS[i], borderRadius: '99px',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          {/* Score badge */}
          <div style={{
            padding: '4px 10px', borderRadius: '99px',
            background: sc.bg, border: `1px solid ${sc.border}`,
            fontSize: '15px', fontWeight: 800, color: sc.color, lineHeight: 1.2,
          }}>
            {score.toFixed(1)}
            <span style={{ fontSize: '10px', fontWeight: 500 }}>/5</span>
          </div>

          {/* Recommendation */}
          {recStyle && (
            <span style={{
              padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 600,
              background: recStyle.bg, color: recStyle.color, border: `1px solid ${recStyle.border}`,
            }}>
              {recStyle.label}
            </span>
          )}

          {/* Status dropdown */}
          <select
            value={job.status}
            onChange={(e) => { e.stopPropagation(); onStatusChange(job.id, e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: '11px', padding: '3px 6px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-muted)',
              color: 'var(--text-secondary)',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          {/* View details */}
          <button
            onClick={() => onViewDetails(job)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: 'var(--radius-md)',
              background: 'transparent', border: '1px solid var(--border-default)',
              fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            View details <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

const tagStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '3px',
  fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
  background: 'var(--bg-muted)', border: '1px solid var(--border-strong)',
  color: 'var(--text-secondary)',
};
