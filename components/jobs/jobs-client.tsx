'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Loader2, Briefcase, Search, Link2, AlignLeft } from 'lucide-react';
import type { Job } from '@/lib/actions/jobs';
import { updateJobStatus, deleteJob } from '@/lib/actions/jobs';
import { JobCardFull } from './job-card-full';
import { JobDetailSheet } from './job-detail-sheet';

type Props = { initialJobs: Job[] };

const STATUS_FILTERS = ['all', 'new', 'reviewing', 'applied'] as const;
const SORT_OPTS = [
  { value: 'score',   label: 'Highest score' },
  { value: 'newest',  label: 'Newest' },
  { value: 'company', label: 'Company A-Z' },
] as const;

export function JobsClient({ initialJobs }: Props) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Ingestion panel
  const [panelOpen, setPanelOpen] = useState(initialJobs.length === 0);
  const [jdTab, setJdTab] = useState<'paste' | 'url'>('paste');
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'newest' | 'company'>('score');

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...jobs];
    if (statusFilter !== 'all') list = list.filter((j) => j.status === statusFilter);
    if (minScore > 0) list = list.filter((j) => (j.ai_score ?? 0) >= minScore);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'score')   return (b.ai_score ?? 0) - (a.ai_score ?? 0);
      if (sortBy === 'newest')  return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime();
      if (sortBy === 'company') return (a.company ?? '').localeCompare(b.company ?? '');
      return 0;
    });
    return list;
  }, [jobs, statusFilter, minScore, search, sortBy]);

  async function handleEvaluate() {
    const payload = jdTab === 'paste' ? { jdText } : { jdUrl };
    const val = jdTab === 'paste' ? jdText.trim() : jdUrl.trim();
    if (!val) return;

    setScoring(true);
    setScoreError('');
    try {
      const res = await fetch('/api/jobs/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setScoreError(data.error ?? 'Scoring failed'); return; }
      setJobs((prev) => [data, ...prev]);
      setJdText('');
      setJdUrl('');
      setPanelOpen(false);
    } catch {
      setScoreError('Network error — please try again.');
    } finally {
      setScoring(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status } : j));
    if (selectedJob?.id === id) setSelectedJob((prev) => prev ? { ...prev, status } : prev);
    await updateJobStatus(id, status);
  }

  async function handleDelete(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setSheetOpen(false);
    await deleteJob(id);
  }

  function handleViewDetails(job: Job) {
    setSelectedJob(job);
    setSheetOpen(true);
  }

  return (
    <>
      <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Ingestion panel */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Evaluate a new job
            </span>
            {panelOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </button>

          {panelOpen && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-default)' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0', marginBottom: '16px', marginTop: '16px' }}>
                {([['paste', 'Paste job description', <AlignLeft size={12} key="p" />], ['url', 'Paste URL', <Link2 size={12} key="u" />]] as const).map(([tab, label, icon]) => (
                  <button
                    key={tab}
                    onClick={() => setJdTab(tab)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '7px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      border: '1px solid var(--border-default)',
                      background: jdTab === tab ? 'var(--accent-subtle)' : 'var(--bg-muted)',
                      color: jdTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                      borderRadius: tab === 'paste' ? 'var(--radius-md) 0 0 var(--radius-md)' : '0 var(--radius-md) var(--radius-md) 0',
                      borderRight: tab === 'paste' ? 'none' : undefined,
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {jdTab === 'paste' ? (
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  style={{
                    width: '100%', height: '140px', padding: '10px 12px', fontSize: '13px',
                    background: 'var(--bg-input)', border: '1px solid var(--border-input)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    resize: 'vertical', outline: 'none', fontFamily: 'var(--font)', lineHeight: 1.6,
                    marginBottom: '10px',
                  }}
                />
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  <input
                    value={jdUrl}
                    onChange={(e) => setJdUrl(e.target.value)}
                    placeholder="https://..."
                    type="url"
                    style={{
                      width: '100%', padding: '9px 12px', fontSize: '13px',
                      background: 'var(--bg-input)', border: '1px solid var(--border-input)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    We'll fetch and parse the job page automatically.
                  </p>
                </div>
              )}

              {scoreError && (
                <div style={{
                  marginBottom: '10px', padding: '8px 12px', fontSize: '12px',
                  background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--danger)',
                }}>
                  {scoreError}
                </div>
              )}

              <button
                onClick={handleEvaluate}
                disabled={scoring || !(jdTab === 'paste' ? jdText.trim() : jdUrl.trim())}
                style={{
                  width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                  background: scoring ? 'var(--text-muted)' : 'var(--accent)',
                  border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: scoring ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.15s ease',
                }}
              >
                {scoring && <Loader2 size={14} className="animate-spin" />}
                {scoring ? 'Scoring with AI…' : 'Evaluate job'}
              </button>
            </div>
          )}
        </div>

        {/* Filters bar */}
        {jobs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)', padding: '12px 16px',
            boxShadow: 'var(--shadow-card)',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
              {filtered.length} job{filtered.length !== 1 ? 's' : ''}
            </span>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                    cursor: 'pointer', border: '1px solid',
                    background: statusFilter === s ? 'var(--accent)' : 'transparent',
                    borderColor: statusFilter === s ? 'var(--accent)' : 'var(--border-default)',
                    color: statusFilter === s ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Min score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Score ≥ {minScore.toFixed(1)}
              </span>
              <input
                type="range" min={0} max={5} step={0.1}
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                style={{ width: '70px', cursor: 'pointer' }}
              />
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company or role…"
                style={{
                  width: '100%', padding: '5px 8px 5px 24px', fontSize: '12px',
                  background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                }}
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                padding: '5px 8px', fontSize: '11px',
                background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                cursor: 'pointer', outline: 'none', flexShrink: 0,
              }}
            >
              {SORT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Job list */}
        {jobs.length === 0 ? (
          <EmptyState onOpenPanel={() => setPanelOpen(true)} />
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '48px 24px', textAlign: 'center',
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-default)',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No jobs match your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((job) => (
              <JobCardFull
                key={job.id}
                job={job}
                onViewDetails={handleViewDetails}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      <JobDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </>
  );
}

function EmptyState({ onOpenPanel }: { onOpenPanel: () => void }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', padding: '56px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: 'var(--radius-xl)',
        background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Briefcase size={24} color="var(--accent)" />
      </div>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          No jobs evaluated yet
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Paste a job description above to get your first match score.
        </p>
      </div>
      <button onClick={onOpenPanel} style={{
        padding: '8px 20px', borderRadius: 'var(--radius-md)',
        background: 'var(--accent)', border: 'none',
        color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
      }}>
        Evaluate a job
      </button>
    </div>
  );
}
