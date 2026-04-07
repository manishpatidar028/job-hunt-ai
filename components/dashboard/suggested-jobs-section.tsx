'use client';

import { useState } from 'react';
import { Sparkles, X, ChevronRight, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import type { SuggestedJob } from '@/lib/actions/suggestions';
import { dismissSuggestion, markProceeded } from '@/lib/actions/suggestions';
import { ProceedSheet } from '@/components/proceed/proceed-sheet';
import { stripHtml } from '@/lib/utils/html';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  expert:   { bg: '#F0FDF4', text: '#15803D' },
  strong:   { bg: '#EFF6FF', text: '#1D4ED8' },
  familiar: { bg: '#FFFBEB', text: '#B45309' },
  learning: { bg: '#F8FAFC', text: '#64748B' },
};

const SCORE_COLOR = (s: number) =>
  s >= 4 ? '#10B981' : s >= 3 ? '#3B82F6' : s >= 2 ? '#F59E0B' : '#94A3B8';

const COMPANY_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

type Props = { initialJobs: SuggestedJob[] };

export function SuggestedJobsSection({ initialJobs }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [proceedJob, setProceedJob] = useState<SuggestedJob | null>(null);

  if (jobs.length === 0) return null;

  async function handleDismiss(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await dismissSuggestion(id);
  }

  async function handleProceeded(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setProceedJob(null);
    await markProceeded(id);
  }

  return (
    <>
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Sparkles size={13} color="var(--accent)" />
          <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            New Matches · Discovered Overnight
          </h2>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 7px',
            background: 'var(--accent)', color: '#fff', borderRadius: '100px',
          }}>{jobs.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {jobs.map((job) => (
            <SuggestionCard
              key={job.id}
              job={job}
              onDismiss={() => handleDismiss(job.id)}
              onProceed={() => setProceedJob(job)}
            />
          ))}
        </div>
      </section>

      {proceedJob && (
        <ProceedSheet
          job={proceedJob}
          onClose={() => setProceedJob(null)}
          onProceeded={handleProceeded}
        />
      )}
    </>
  );
}

function SuggestionCard({
  job, onDismiss, onProceed,
}: {
  job: SuggestedJob;
  onDismiss: () => void;
  onProceed: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = SCORE_COLOR(job.rule_score);
  const cleanJd = job.jd_text ? stripHtml(job.jd_text) : '';

  const sourceLabel: Record<string, string> = {
    cron_adzuna: 'Adzuna',
    cron_greenhouse: 'Greenhouse',
    cron_lever: 'Lever',
  };

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)', background: '#fff',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-card)', overflow: 'hidden',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
        {/* Logo */}
        <div style={{
          width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
          background: companyColor(job.company ?? ''), color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, flexShrink: 0,
        }}>
          {(job.company?.[0] ?? '?').toUpperCase()}
        </div>

        {/* Info */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{job.company}</span>
            {job.location && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {job.location}</span>}
            {job.remote_type && (
              <span style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '100px',
                background: job.remote_type === 'remote' ? '#F0FDF4' : '#EFF6FF',
                color: job.remote_type === 'remote' ? '#15803D' : '#1D4ED8', fontWeight: 500,
              }}>{job.remote_type}</span>
            )}
            {job.source && sourceLabel[job.source] && (
              <span style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '100px',
                background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                <Building2 size={9} />{sourceLabel[job.source]}
              </span>
            )}
          </div>
        </div>

        {/* Right: score + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 700, color: scoreColor,
            background: `${scoreColor}15`, padding: '2px 9px', borderRadius: 'var(--radius-md)',
          }}>
            {job.rule_score.toFixed(1)}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={onProceed}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent)', color: '#fff',
                fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              Proceed <ChevronRight size={11} />
            </button>
            <button
              onClick={onDismiss}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-placeholder)', padding: '2px',
              }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-default)', padding: '14px 16px', background: '#FAFBFC', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Criteria */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Your Criteria Match
            </div>
            {job.matched_skills.length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>✓ Matched  </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {job.matched_skills.map((s) => {
                    const c = LEVEL_COLORS[s.level] ?? LEVEL_COLORS.learning;
                    return (
                      <span key={s.name} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: c.bg, color: c.text, fontWeight: s.isPrimary ? 700 : 400 }}>
                        {s.isPrimary && '★ '}{s.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {job.missing_primary.length > 0 && (
              <div>
                <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>⚠ Not mentioned  </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {job.missing_primary.map((name) => (
                    <span key={name} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: '#FFFBEB', color: '#B45309' }}>{name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* JD snippet */}
          {cleanJd && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {cleanJd.slice(0, 400)}{cleanJd.length > 400 ? '…' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
