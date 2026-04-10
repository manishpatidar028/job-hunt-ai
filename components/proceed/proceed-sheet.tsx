'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Mail, ExternalLink, Copy, Check, RefreshCw, Sparkles, ChevronRight, Eye, EyeOff, Info } from 'lucide-react';
import type { SuggestedJob } from '@/lib/actions/suggestions';
import { stripHtml } from '@/lib/utils/html';
import { DocumentPreview, ResumeDiff, downloadAsPDF } from './document-preview';

type Tab = 'resume' | 'cover-letter' | 'apply';

type Props = {
  job: SuggestedJob;
  onClose: () => void;
  onProceeded: (id: string) => void;
};

type UsageStat = { used: number; limit: number; remaining: number };
type UsageMap  = Record<string, UsageStat>;

export function ProceedSheet({ job, onClose, onProceeded }: Props) {
  const [tab, setTab] = useState<Tab>('resume');
  const [usage, setUsage] = useState<UsageMap>({});
  const [resume, setResume] = useState('');
  const [originalCv, setOriginalCv] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [coverError, setCoverError] = useState('');
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [resumeView, setResumeView] = useState<'preview' | 'diff' | 'raw'>('preview');
  const [previewCover, setPreviewCover] = useState(false);

  const cleanJd = job.jd_text ? stripHtml(job.jd_text) : '';

  useEffect(() => {
    fetch('/api/usage/status')
      .then((r) => r.json())
      .then((d) => setUsage(d))
      .catch(() => {});
  }, []);

  const tailorStat  = usage.resume_tailor;
  const coverStat   = usage.cover_letter;
  const tailorBlocked = tailorStat?.remaining === 0;
  const coverBlocked  = coverStat?.remaining === 0;

  async function generateResume() {
    setLoadingResume(true);
    setResumeError('');
    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: cleanJd, title: job.title, company: job.company }),
      });
      const data = await res.json();
      if (!res.ok) { setResumeError(data.error ?? 'Failed'); return; }
      setResume(data.tailoredResume);
      if (data.originalCv) setOriginalCv(data.originalCv);
    } catch { setResumeError('Network error'); }
    finally { setLoadingResume(false); }
  }

  async function generateCoverLetter() {
    setLoadingCover(true);
    setCoverError('');
    try {
      const res = await fetch('/api/resume/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: cleanJd, title: job.title, company: job.company }),
      });
      const data = await res.json();
      if (!res.ok) { setCoverError(data.error ?? 'Failed'); return; }
      setCoverLetter(data.coverLetter);
    } catch { setCoverError('Network error'); }
    finally { setLoadingCover(false); }
  }

  function copy(text: string, which: 'resume' | 'cover') {
    navigator.clipboard.writeText(text);
    if (which === 'resume') { setCopiedResume(true); setTimeout(() => setCopiedResume(false), 2000); }
    else { setCopiedCover(true); setTimeout(() => setCopiedCover(false), 2000); }
  }

  const readyToApply = resume && coverLetter;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(680px, 95vw)', background: '#fff',
        zIndex: 51, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-default)',
          display: 'flex', gap: '12px', alignItems: 'flex-start', flexShrink: 0,
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
            background: companyColor(job.company ?? ''), color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, flexShrink: 0,
          }}>
            {(job.company?.[0] ?? '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{job.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {job.company}{job.location ? ` · ${job.location}` : ''}
              {job.remote_type && (
                <span style={{ marginLeft: '6px', fontSize: '11px', padding: '1px 6px', borderRadius: '100px', background: '#F0FDF4', color: '#15803D' }}>
                  {job.remote_type}
                </span>
              )}
            </div>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '10px', alignItems: 'center' }}>
              {(['resume', 'cover-letter', 'apply'] as Tab[]).map((t, i) => {
                const labels = { resume: 'Resume', 'cover-letter': 'Cover Letter', apply: 'Apply' };
                const done = (t === 'resume' && !!resume) || (t === 'cover-letter' && !!coverLetter);
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setTab(t)}
                      style={{
                        padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
                        border: tab === t ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                        background: tab === t ? 'var(--accent-subtle)' : done ? '#F0FDF4' : '#fff',
                        color: tab === t ? 'var(--accent)' : done ? '#15803D' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {done ? '✓ ' : ''}{labels[t]}
                    </button>
                    {i < 2 && <ChevronRight size={10} color="var(--text-placeholder)" />}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── Resume Tab ── */}
          {tab === 'resume' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  AI-Tailored Resume
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Your CV rewritten to highlight experience relevant to this role. No facts are changed — only emphasis and ordering.
                </p>
              </div>

              {!resume ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={generateResume}
                      disabled={loadingResume || tailorBlocked}
                      style={primaryBtnStyle(loadingResume || tailorBlocked)}
                    >
                      {loadingResume
                        ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Tailoring resume…</>
                        : <><Sparkles size={13} /> Generate Tailored Resume</>}
                    </button>
                    {tailorStat && (
                      <UsagePill stat={tailorStat} action="resume_tailor" />
                    )}
                  </div>
                  {resumeError && <p style={{ fontSize: '12px', color: '#EF4444' }}>{resumeError}</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    {/* View mode toggle */}
                    <div style={{ display: 'flex', gap: '0' }}>
                      {(['preview', 'diff', 'raw'] as const).map((mode, idx) => {
                        const labels = { preview: 'Preview', diff: 'Changes', raw: 'Raw' };
                        const icons  = { preview: <Eye size={11} />, diff: <span style={{ fontSize: '13px', lineHeight: 1 }}>±</span>, raw: <EyeOff size={11} /> };
                        const active = resumeView === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => setResumeView(mode)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              border: '1px solid var(--border-default)',
                              background: active ? (mode === 'diff' ? '#FEF9C3' : 'var(--accent-subtle)') : '#fff',
                              color: active ? (mode === 'diff' ? '#854D0E' : 'var(--accent)') : 'var(--text-muted)',
                              borderRadius: idx === 0 ? 'var(--radius-md) 0 0 var(--radius-md)' : idx === 2 ? '0 var(--radius-md) var(--radius-md) 0' : '0',
                              borderRight: idx < 2 ? 'none' : undefined,
                            }}
                          >
                            {icons[mode]} {labels[mode]}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => copy(resume, 'resume')} style={iconBtnStyle}>
                        {copiedResume ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                      <button onClick={() => downloadAsPDF(resume, 'resume')} style={iconBtnStyle}>
                        <FileText size={12} /> PDF
                      </button>
                      <button onClick={generateResume} disabled={loadingResume} style={iconBtnStyle}>
                        {loadingResume ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> …</> : <><RefreshCw size={12} /> Redo</>}
                      </button>
                    </div>
                  </div>
                  {resumeView === 'preview' && <DocumentPreview content={resume} type="resume" />}
                  {resumeView === 'diff'    && <ResumeDiff original={originalCv} modified={resume} />}
                  {resumeView === 'raw'     && <pre style={preStyle}>{resume}</pre>}
                  <button
                    onClick={() => setTab('cover-letter')}
                    style={{ ...primaryBtnStyle(false), width: '100%', justifyContent: 'center' }}
                  >
                    Next: Generate Cover Letter <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Cover Letter Tab ── */}
          {tab === 'cover-letter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Cover Letter
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Personalised to this role and company, referencing your actual experience.
                </p>
              </div>

              {!coverLetter ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={generateCoverLetter}
                      disabled={loadingCover || coverBlocked}
                      style={primaryBtnStyle(loadingCover || coverBlocked)}
                    >
                      {loadingCover
                        ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Writing cover letter…</>
                        : <><Sparkles size={13} /> Generate Cover Letter</>}
                    </button>
                    {coverStat && (
                      <UsagePill stat={coverStat} action="cover_letter" />
                    )}
                  </div>
                  {coverError && <p style={{ fontSize: '12px', color: '#EF4444' }}>{coverError}</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setPreviewCover((v) => !v)} style={iconBtnStyle}>
                      {previewCover ? <><EyeOff size={12} /> Raw text</> : <><Eye size={12} /> Preview</>}
                    </button>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => copy(coverLetter, 'cover')} style={iconBtnStyle}>
                        {copiedCover ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                      <button onClick={() => downloadAsPDF(coverLetter, 'cover-letter')} style={iconBtnStyle}>
                        <Mail size={12} /> PDF
                      </button>
                      <button onClick={generateCoverLetter} disabled={loadingCover} style={iconBtnStyle}>
                        {loadingCover ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> …</> : <><RefreshCw size={12} /> Redo</>}
                      </button>
                    </div>
                  </div>
                  {previewCover
                    ? <DocumentPreview content={coverLetter} type="cover-letter" />
                    : <pre style={preStyle}>{coverLetter}</pre>}
                  <button
                    onClick={() => setTab('apply')}
                    style={{ ...primaryBtnStyle(false), width: '100%', justifyContent: 'center' }}
                  >
                    Next: Apply <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Apply Tab ── */}
          {tab === 'apply' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Ready to Apply
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Your application materials are prepared. Follow the checklist below.
                </p>
              </div>

              {/* Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <ChecklistItem done={!!resume} label="Tailored resume generated" action={resume ? () => copy(resume, 'resume') : generateResume} actionLabel={resume ? (copiedResume ? 'Copied!' : 'Copy') : 'Generate'} />
                <ChecklistItem done={!!coverLetter} label="Cover letter generated" action={coverLetter ? () => copy(coverLetter, 'cover') : generateCoverLetter} actionLabel={coverLetter ? (copiedCover ? 'Copied!' : 'Copy') : 'Generate'} />
              </div>

              {/* Apply button */}
              {job.jd_url ? (
                <a
                  href={job.jd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onProceeded(job.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px 20px', borderRadius: 'var(--radius-md)',
                    background: readyToApply ? 'var(--accent)' : '#94A3B8',
                    color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} />
                  Open Application Form
                </a>
              ) : (
                <div style={{ padding: '12px', background: '#FFFBEB', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#B45309' }}>
                  No direct application URL available. Search for this role on the company's career page.
                </div>
              )}

              {!readyToApply && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Generate both materials first for the best chance of success
                </p>
              )}

              {/* JD preview */}
              {cleanJd && (
                <details>
                  <summary style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                    View job description
                  </summary>
                  <pre style={{ ...preStyle, marginTop: '8px', maxHeight: '200px' }}>{cleanJd}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function UsagePill({ stat, action }: { stat: UsageStat; action: string }) {
  const [open, setOpen] = useState(false);
  const isBlocked = stat.remaining === 0;
  const actionLabel = action === 'resume_tailor' ? 'Resume tailoring' : 'Cover letter';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {/* Usage badge */}
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px',
        background: isBlocked ? '#FEF2F2' : '#F0FDF4',
        color: isBlocked ? '#B91C1C' : '#15803D',
        border: `1px solid ${isBlocked ? '#FECACA' : '#BBF7D0'}`,
        whiteSpace: 'nowrap',
      }}>
        {isBlocked ? 'Limit reached' : `${stat.remaining} left`}
      </span>

      {/* Info icon */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: isBlocked ? '#B91C1C' : '#94A3B8',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Info size={13} />
      </button>

      {/* Callout */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 11,
            width: '220px', padding: '10px 12px',
            background: '#fff', borderRadius: 'var(--radius-md)',
            border: `1px solid ${isBlocked ? '#FECACA' : 'var(--border-default)'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)',
          }}>
            <div style={{ fontWeight: 700, color: isBlocked ? '#B91C1C' : 'var(--text-primary)', marginBottom: '4px' }}>
              {isBlocked ? 'Daily limit reached' : 'Daily usage'}
            </div>
            <div>
              {actionLabel}: <strong>{stat.used}/{stat.limit}</strong> used today
            </div>
            {isBlocked && (
              <div style={{ marginTop: '6px', color: '#B91C1C', fontSize: '11px' }}>
                Resets at midnight. Come back tomorrow to generate more.
              </div>
            )}
            {!isBlocked && (
              <div style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                {stat.remaining} generation{stat.remaining !== 1 ? 's' : ''} remaining today.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChecklistItem({
  done, label, action, actionLabel,
}: {
  done: boolean; label: string; action: () => void; actionLabel: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: done ? '#F0FDF4' : '#F8FAFC',
      border: `1px solid ${done ? '#BBF7D0' : 'var(--border-default)'}`,
    }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
        background: done ? '#10B981' : 'var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', color: '#fff', fontWeight: 700,
      }}>
        {done ? '✓' : ''}
      </div>
      <span style={{ flex: 1, fontSize: '12px', color: done ? '#15803D' : 'var(--text-secondary)', fontWeight: done ? 500 : 400 }}>
        {label}
      </span>
      <button
        onClick={action}
        style={{
          padding: '3px 10px', borderRadius: 'var(--radius-md)', fontSize: '11px', fontWeight: 600,
          border: '1px solid var(--border-default)', background: '#fff',
          color: 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

const COMPANY_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', borderRadius: 'var(--radius-md)',
    background: disabled ? 'var(--text-muted)' : 'var(--accent)',
    color: '#fff', fontSize: '13px', fontWeight: 600,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 10px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', background: '#fff',
  fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer',
};

const preStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7,
  background: '#F8FAFC', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)', padding: '14px',
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  maxHeight: '380px', overflowY: 'auto',
  fontFamily: 'var(--font)', margin: 0,
};
