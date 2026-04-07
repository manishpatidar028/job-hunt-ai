'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Trash2, ExternalLink } from 'lucide-react';
import { stripHtml } from '@/lib/utils/html';
import type { Job } from '@/lib/actions/jobs';

const BREAKDOWN_DIMS = [
  { key: 'skillMatch',           label: 'Skill Match' },
  { key: 'seniorityFit',         label: 'Seniority Fit' },
  { key: 'domainOverlap',        label: 'Domain Overlap' },
  { key: 'remoteCompatibility',  label: 'Remote Compat.' },
  { key: 'growthPotential',      label: 'Growth Potential' },
] as const;

const DIM_COLORS = ['#10B981', '#6366F1', '#F59E0B', '#0EA5E9', '#A855F7'];

const RECOMMENDATION_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  strong_apply: { bg: '#F0FDF4', color: '#065F46', border: '#BBF7D0', label: 'Strong Apply' },
  apply:        { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Apply' },
  consider:     { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Consider' },
  skip:         { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: 'Skip' },
};

function scoreColor(s: number) {
  if (s >= 4) return '#10B981';
  if (s >= 3) return '#F59E0B';
  return '#EF4444';
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
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
};

const STATUSES = ['new', 'reviewing', 'applied', 'responded', 'interview', 'offer', 'rejected', 'skipped'];

export function JobDetailSheet({ job, open, onClose, onStatusChange, onDelete }: Props) {
  const [visible, setVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else { setVisible(false); setConfirmDelete(false); }
  }, [open]);

  if (!open && !visible) return null;
  if (!job) return null;

  const bd = job.score_breakdown ?? {};
  const score = job.ai_score ?? job.rule_score ?? 0;
  const rec = bd.recommendation ?? 'consider';
  const recStyle = RECOMMENDATION_STYLES[rec] ?? RECOMMENDATION_STYLES.consider;
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

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
        position: 'absolute', right: 0, top: 0, height: '100%', width: 'min(480px, 100vw)',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-4px 0 32px rgba(15,23,42,0.1)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-default)', flexShrink: 0, gap: '12px',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              {job.company ?? 'Unknown company'}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {job.title ?? 'Untitled role'}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {job.remote_type && (
                <Tag>{job.remote_type.charAt(0).toUpperCase() + job.remote_type.slice(1)}</Tag>
              )}
              {job.location && <Tag>{job.location}</Tag>}
              {salary && <Tag>{salary}</Tag>}
              {job.jd_url && (
                <a href={job.jd_url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  fontSize: '11px', color: 'var(--accent)', textDecoration: 'none',
                  padding: '2px 7px', borderRadius: '99px',
                  background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
                }}>
                  <ExternalLink size={9} /> Source
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={iconBtn}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Score card */}
          <div style={{
            background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)',
            padding: '20px', border: '1px solid var(--border-default)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>AI Match Score</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>
                  {score.toFixed(1)}
                  <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>/5</span>
                </div>
              </div>
              <span style={{
                padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                background: recStyle.bg, color: recStyle.color, border: `1px solid ${recStyle.border}`,
              }}>
                {recStyle.label}
              </span>
            </div>

            {/* Breakdown bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {BREAKDOWN_DIMS.map(({ key, label }, i) => {
                const val = (bd as Record<string, number>)[key] ?? 0;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '110px', flexShrink: 0 }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: '5px', background: 'var(--border-strong)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(val / 5) * 100}%`,
                        background: DIM_COLORS[i], borderRadius: '99px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: DIM_COLORS[i], width: '24px', textAlign: 'right', flexShrink: 0 }}>
                      {val.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>

            {bd.reasoning && (
              <p style={{
                marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)',
                lineHeight: 1.6, padding: '10px 12px',
                background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                fontStyle: 'italic',
              }}>
                {bd.reasoning}
              </p>
            )}
          </div>

          {/* Matched skills */}
          {(bd.matchedSkills?.length ?? 0) > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={13} color="#10B981" /> Matched skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {bd.matchedSkills!.map((s) => (
                  <span key={s} style={{
                    padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                    background: '#F0FDF4', color: '#065F46', border: '1px solid #BBF7D0',
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          {(bd.gaps?.length ?? 0) > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={13} color="#F59E0B" /> Skill gaps
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {bd.gaps!.map((s) => (
                  <span key={s} style={{
                    padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                    background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* JD text */}
          {job.jd_text && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Job Description
              </div>
              <pre style={{
                fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7,
                background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '12px', overflowX: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: '240px', overflowY: 'auto',
                fontFamily: 'var(--font)',
              }}>
                {stripHtml(job.jd_text)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-default)',
          display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap',
        }}>
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
              style={{ ...footerBtn, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <button
              onClick={() => { onDelete(job.id); onClose(); }}
              style={{ ...footerBtn, background: 'var(--danger)', border: 'none', color: '#fff' }}
            >
              Confirm delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
      background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)',
    }}>
      {children}
    </span>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '28px', height: '28px', borderRadius: 'var(--radius-md)', flexShrink: 0,
  background: 'transparent', border: '1px solid var(--border-default)',
  color: 'var(--text-muted)', cursor: 'pointer',
};

const footerBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
  padding: '8px 14px', borderRadius: 'var(--radius-md)',
  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
};
