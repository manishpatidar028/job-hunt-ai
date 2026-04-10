'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Trash2, ExternalLink, MapPin, Wifi, Monitor, Calendar, FileText } from 'lucide-react';
import { stripHtml } from '@/lib/utils/html';
import type { Job } from '@/lib/actions/jobs';
import { ProceedSheet } from '@/components/proceed/proceed-sheet';

// ── Constants ──────────────────────────────────────────────────────────────────

const BREAKDOWN_DIMS = [
  { key: 'skillMatch',          label: 'Skill Match',        color: '#10B981' },
  { key: 'seniorityFit',        label: 'Seniority Fit',      color: '#6366F1' },
  { key: 'domainOverlap',       label: 'Domain Overlap',     color: '#F59E0B' },
  { key: 'remoteCompatibility', label: 'Remote Compatibility',color: '#0EA5E9' },
  { key: 'growthPotential',     label: 'Growth Potential',   color: '#A855F7' },
] as const;

const REC_STYLES: Record<string, { bg: string; color: string; border: string; label: string; desc: string }> = {
  strong_apply: { bg: '#F0FDF4', color: '#065F46', border: '#6EE7B7', label: '⚡ Strong Apply', desc: 'Excellent match — apply confidently' },
  apply:        { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD', label: '✓ Apply',         desc: 'Good match — worth applying'         },
  consider:     { bg: '#FFFBEB', color: '#92400E', border: '#FCD34D', label: '◎ Consider',      desc: 'Partial match — review carefully'    },
  skip:         { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5', label: '✕ Skip',           desc: 'Poor match for your profile'         },
};

const STATUSES = ['new', 'reviewing', 'applied', 'responded', 'interview', 'offer', 'rejected', 'skipped'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 4) return '#10B981';
  if (s >= 3) return '#F59E0B';
  return '#EF4444';
}

function scoreBg(s: number) {
  if (s >= 4) return '#ECFDF5';
  if (s >= 3) return '#FFFBEB';
  return '#FEF2F2';
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
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

// ── Arc Score Gauge ───────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const R   = 42;
  const cx  = 60;
  const cy  = 60;
  const arcLen = Math.PI * R;              // semicircle length ≈ 131.9
  const pct    = Math.min(score / 5, 1);
  const offset = arcLen * (1 - pct);
  const color  = scoreColor(score);
  const bg     = scoreBg(score);

  const startX = cx - R;
  const endX   = cx + R;
  const d      = `M ${startX} ${cy} A ${R} ${R} 0 0 1 ${endX} ${cy}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="120" height="72" viewBox="0 0 120 72" style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={d} fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" />
        {/* Fill */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${arcLen}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
        {/* Score */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="800" fill={color} fontFamily="var(--font)">
          {score.toFixed(1)}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="var(--font)">
          out of 5
        </text>
      </svg>
    </div>
  );
}

// ── Props + Component ─────────────────────────────────────────────────────────

type Props = {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
};

export function JobDetailSheet({ job, open, onClose, onStatusChange, onDelete }: Props) {
  const [visible, setVisible]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [proceedOpen, setProceedOpen]     = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else { setVisible(false); setConfirmDelete(false); setProceedOpen(false); }
  }, [open]);

  if (!open && !visible) return null;
  if (!job) return null;

  const bd     = (job.score_breakdown ?? {}) as Record<string, unknown>;
  const score  = job.ai_score ?? job.rule_score ?? 0;
  const rec    = (bd.recommendation as string) ?? 'consider';
  const recSt  = REC_STYLES[rec] ?? REC_STYLES.consider;
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const color  = scoreColor(score);
  const bg     = scoreBg(score);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, height: '100%',
        width: 'min(680px, 100vw)',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-8px 0 40px rgba(15,23,42,0.12)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-default)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                {job.company ?? 'Unknown company'}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '10px' }}>
                {job.title ?? 'Untitled role'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {job.remote_type === 'remote'  && <Chip icon={<Wifi size={10} />}>Remote</Chip>}
                {job.remote_type === 'hybrid'  && <Chip icon={<Monitor size={10} />}>Hybrid</Chip>}
                {job.remote_type === 'onsite'  && <Chip icon={<MapPin size={10} />}>Onsite</Chip>}
                {job.location && <Chip icon={<MapPin size={10} />}>{job.location}</Chip>}
                {salary && <Chip>{salary}</Chip>}
                {job.discovered_at && <Chip icon={<Calendar size={10} />}>{timeAgo(job.discovered_at)}</Chip>}
                {job.jd_url && (
                  <a href={job.jd_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', padding: '3px 9px', borderRadius: '99px',
                    background: 'var(--accent-subtle)', color: 'var(--accent)',
                    border: '1px solid var(--accent-border)', textDecoration: 'none', fontWeight: 500,
                  }}>
                    <ExternalLink size={10} /> View posting
                  </a>
                )}
              </div>
            </div>
            <button onClick={onClose} style={iconBtnStyle}><X size={16} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Score card */}
          <div style={{
            borderRadius: 'var(--radius-xl)',
            border: `1px solid ${color}33`,
            background: `linear-gradient(135deg, ${bg} 0%, var(--bg-card) 100%)`,
            overflow: 'hidden',
          }}>
            {/* Score header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px 16px' }}>
              <ScoreArc score={score} />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: 600 }}>
                  AI Match Score
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '99px',
                  background: recSt.bg, border: `1px solid ${recSt.border}`,
                  marginBottom: '6px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: recSt.color }}>{recSt.label}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{recSt.desc}</div>
              </div>

              {/* Status selector */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>Status</div>
                <select
                  value={job.status}
                  onChange={(e) => onStatusChange(job.id, e.target.value)}
                  style={{
                    fontSize: '12px', padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer', outline: 'none', fontWeight: 500,
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breakdown bars */}
            <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {BREAKDOWN_DIMS.map(({ key, label, color: dimColor }) => {
                const val = (bd[key] as number) ?? 0;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '140px', fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0, fontWeight: 500 }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(val / 5) * 100}%`,
                        background: dimColor, borderRadius: '99px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ width: '32px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: dimColor, flexShrink: 0 }}>
                      {val.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Reasoning */}
            {bd.reasoning && (
              <div style={{
                margin: '0 24px 20px',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px', color: 'var(--text-secondary)',
                lineHeight: 1.65, fontStyle: 'italic',
              }}>
                {bd.reasoning as string}
              </div>
            )}
          </div>

          {/* Skills row */}
          {((bd.matchedSkills as string[])?.length > 0 || (bd.gaps as string[])?.length > 0) && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {(bd.matchedSkills as string[])?.length > 0 && (
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    <CheckCircle size={13} color="#10B981" /> Matched skills
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {(bd.matchedSkills as string[]).map((s) => (
                      <span key={s} style={{
                        padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                        background: '#F0FDF4', color: '#065F46', border: '1px solid #BBF7D0',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(bd.gaps as string[])?.length > 0 && (
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    <XCircle size={13} color="#F59E0B" /> Skill gaps
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {(bd.gaps as string[]).map((s) => (
                      <span key={s} style={{
                        padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                        background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job description */}
          {job.jd_text && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Job Description
              </div>
              <div style={{
                fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.75,
                background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px',
                maxHeight: '280px', overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {stripHtml(job.jd_text)}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border-default)',
          display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap',
          background: 'var(--bg-muted)',
        }}>
          <button
            onClick={() => setProceedOpen(true)}
            style={{ ...footerBtn, background: '#6366F1', border: 'none', color: '#fff', flex: 1 }}
          >
            <FileText size={13} /> Tailor Resume
          </button>
          {job.status !== 'applied' && (
            <button
              onClick={() => { onStatusChange(job.id, 'applied'); onClose(); }}
              style={{ ...footerBtn, background: 'var(--accent)', border: 'none', color: '#fff', flex: 1 }}
            >
              Mark Applied
            </button>
          )}
          {job.status !== 'skipped' && (
            <button
              onClick={() => { onStatusChange(job.id, 'skipped'); onClose(); }}
              style={{ ...footerBtn, background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', flex: 1 }}
            >
              Skip
            </button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ ...footerBtn, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', paddingInline: '14px' }}
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <button
              onClick={() => { onDelete(job.id); onClose(); }}
              style={{ ...footerBtn, background: '#EF4444', border: 'none', color: '#fff' }}
            >
              Confirm delete
            </button>
          )}
        </div>
      </div>

      {/* Tailor resume / cover letter sheet */}
      {proceedOpen && (
        <ProceedSheet
          job={{
            id: job.id,
            user_id: '',
            title: job.title,
            company: job.company,
            location: job.location,
            remote_type: job.remote_type,
            jd_text: job.jd_text,
            jd_url: job.jd_url,
            source: job.source ?? '',
            rule_score: job.rule_score ?? 0,
            matched_skills: [],
            missing_primary: [],
            status: 'pending',
            discovered_at: job.discovered_at,
          }}
          onClose={() => setProceedOpen(false)}
          onProceeded={() => { onStatusChange(job.id, 'applied'); setProceedOpen(false); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', padding: '3px 9px', borderRadius: '99px',
      background: 'var(--bg-muted)', border: '1px solid var(--border-strong)',
      color: 'var(--text-secondary)', fontWeight: 500,
    }}>
      {icon}{children}
    </span>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '30px', height: '30px', borderRadius: 'var(--radius-md)', flexShrink: 0,
  background: 'transparent', border: '1px solid var(--border-default)',
  color: 'var(--text-muted)', cursor: 'pointer',
};

const footerBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
  padding: '9px 16px', borderRadius: 'var(--radius-md)',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
};
