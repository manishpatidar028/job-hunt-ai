'use client';

import { useState } from 'react';
import { MapPin, Wifi, Monitor, ChevronRight, Calendar } from 'lucide-react';
import type { Job } from '@/lib/actions/jobs';

const LOGO_PALETTES: [string, string][] = [
  ['#EFF6FF', '#3B82F6'], ['#F0FDF4', '#10B981'], ['#FDF4FF', '#A855F7'],
  ['#FFF7ED', '#F97316'], ['#FEF2F2', '#EF4444'], ['#F0FDFA', '#14B8A6'],
  ['#FFF1F2', '#F43F5E'], ['#F0F9FF', '#0EA5E9'],
];
function companyPalette(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_PALETTES[Math.abs(hash) % LOGO_PALETTES.length];
}

const BREAKDOWN_DIMS = [
  { key: 'skillMatch',          label: 'Skill Match',   color: '#10B981' },
  { key: 'seniorityFit',        label: 'Seniority',     color: '#6366F1' },
  { key: 'domainOverlap',       label: 'Domain',        color: '#F59E0B' },
  { key: 'remoteCompatibility', label: 'Remote Fit',    color: '#0EA5E9' },
  { key: 'growthPotential',     label: 'Growth',        color: '#A855F7' },
];

const REC_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  strong_apply: { bg: '#F0FDF4', color: '#065F46', border: '#BBF7D0', label: '⚡ Strong Apply' },
  apply:        { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: '✓ Apply'         },
  consider:     { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: '◎ Consider'      },
  skip:         { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: '✕ Skip'           },
};

const STATUS_OPTS = ['new', 'reviewing', 'applied', 'responded', 'interview', 'offer', 'rejected', 'skipped'];

function scoreStyle(s: number) {
  if (s >= 4) return { color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7', bar: '#10B981' };
  if (s >= 3) return { color: '#92400E', bg: '#FFFBEB', border: '#FCD34D', bar: '#F59E0B' };
  return           { color: '#991B1B', bg: '#FFF1F2', border: '#FCA5A5', bar: '#EF4444' };
}

function formatSalary(min?: number | null, max?: number | null, currency = 'INR') {
  if (!min && !max) return null;
  const fmt = (n: number) => currency === 'INR' ? `₹${(n / 100000).toFixed(0)}L` : `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

type Props = {
  job: Job;
  onViewDetails: (job: Job) => void;
  onStatusChange: (id: string, status: string) => void;
};

export function JobCardFull({ job, onViewDetails, onStatusChange }: Props) {
  const [hovered, setHovered] = useState(false);

  const [logoBg, logoColor] = companyPalette(job.company ?? 'X');
  const initials = (job.company ?? '??').slice(0, 2).toUpperCase();
  const score = job.ai_score ?? job.rule_score ?? 0;
  const sc = scoreStyle(score);
  const bd = (job.score_breakdown ?? {}) as Record<string, unknown>;
  const rec = (bd.recommendation as string) ?? null;
  const recStyle = rec ? (REC_STYLES[rec] ?? null) : null;
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-accent)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: hovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top section */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '18px 20px 14px' }}>

        {/* Company logo */}
        <div style={{
          width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
          background: logoBg, color: logoColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 800, letterSpacing: '-0.02em',
          border: `1px solid ${logoColor}22`,
        }}>
          {initials}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '3px' }}>
            {job.title ?? 'Untitled role'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {job.company ?? 'Unknown'}{job.location ? ` · ${job.location}` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {job.remote_type === 'remote'  && <Tag icon={<Wifi size={9} />}>Remote</Tag>}
            {job.remote_type === 'hybrid'  && <Tag icon={<Monitor size={9} />}>Hybrid</Tag>}
            {job.remote_type === 'onsite'  && <Tag icon={<MapPin size={9} />}>Onsite</Tag>}
            {job.location && job.remote_type !== 'remote' && <Tag icon={<MapPin size={9} />}>{job.location}</Tag>}
            {salary && <Tag>{salary}</Tag>}
            {job.discovered_at && <Tag icon={<Calendar size={9} />}>{timeAgo(job.discovered_at)}</Tag>}
          </div>
        </div>

        {/* Score + recommendation */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <div style={{
            padding: '6px 14px', borderRadius: '99px',
            background: sc.bg, border: `1px solid ${sc.border}`,
            display: 'flex', alignItems: 'baseline', gap: '2px',
          }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: sc.color, lineHeight: 1 }}>
              {score.toFixed(1)}
            </span>
            <span style={{ fontSize: '11px', color: sc.color, opacity: 0.7 }}>/5</span>
          </div>
          {recStyle && (
            <span style={{
              padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
              background: recStyle.bg, color: recStyle.color, border: `1px solid ${recStyle.border}`,
              whiteSpace: 'nowrap',
            }}>
              {recStyle.label}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-default)', margin: '0 20px' }} />

      {/* Bottom section: score bars + actions */}
      <div style={{ display: 'flex', gap: '20px', padding: '14px 20px', alignItems: 'center' }}>

        {/* Score breakdown bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 }}>
          {BREAKDOWN_DIMS.map(({ key, label, color }) => {
            const val = (bd[key] as number) ?? 0;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '80px', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 500 }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: '7px', background: 'var(--border-strong)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(val / 5) * 100}%`,
                    background: color,
                    borderRadius: '99px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ width: '28px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color, flexShrink: 0 }}>
                  {val.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flexShrink: 0, alignItems: 'stretch', minWidth: '130px' }}>
          <select
            value={job.status}
            onChange={(e) => { e.stopPropagation(); onStatusChange(job.id, e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: '12px', padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-muted)',
              color: 'var(--text-secondary)',
              cursor: 'pointer', outline: 'none', fontWeight: 500,
            }}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <button
            onClick={() => onViewDetails(job)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: 'var(--radius-md)',
              background: hovered ? 'var(--accent)' : 'transparent',
              border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border-default)'}`,
              fontSize: '12px', fontWeight: 600,
              color: hovered ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            View Details <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '10px', padding: '2px 8px', borderRadius: '99px',
      background: 'var(--bg-muted)', border: '1px solid var(--border-strong)',
      color: 'var(--text-secondary)', fontWeight: 500,
    }}>
      {icon}{children}
    </span>
  );
}
