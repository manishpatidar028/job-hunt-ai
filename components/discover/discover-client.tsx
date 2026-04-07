'use client';

import { useState, useCallback } from 'react';
import { Search, Zap, ExternalLink, CheckSquare, Square, RefreshCw, Building2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'; // eslint-disable-line
import { stripHtml } from '@/lib/utils/html';
import type { DiscoveredJob } from '@/app/api/discover/search/route';
import type { EvaluateResult } from '@/app/api/discover/evaluate/route';

type Props = {
  initialQuery: string;
  hasAdzuna: boolean;
};

const SCORE_COLOR = (s: number) =>
  s >= 4 ? '#10B981' : s >= 3 ? '#3B82F6' : s >= 2 ? '#F59E0B' : '#94A3B8';

const POPULAR_COMPANIES = [
  'Google', 'Microsoft', 'Stripe', 'Figma', 'Notion',
  'Shopify', 'Atlassian', 'Canva', 'Razorpay', 'Zepto',
];

export function DiscoverClient({ initialQuery, hasAdzuna }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('in');
  const [companiesText, setCompaniesText] = useState('');
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [evalResults, setEvalResults] = useState<EvaluateResult[]>([]);
  const [evalError, setEvalError] = useState('');

  const handleSearch = useCallback(async () => {
    setSearchError('');
    setEvalResults([]);
    setSelected(new Set());
    setSearching(true);
    try {
      const companies = companiesText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await fetch('/api/discover/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, country, companies }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? 'Search failed');
        return;
      }
      setJobs(data.jobs ?? []);
      if ((data.jobs ?? []).length === 0) setSearchError('No jobs found. Try different keywords or add company names.');
    } catch {
      setSearchError('Network error — please try again.');
    } finally {
      setSearching(false);
    }
  }, [query, location, country, companiesText]);

  const toggleJob = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(jobs.map((j) => j.externalId)));
  const deselectAll = () => setSelected(new Set());

  const handleEvaluate = useCallback(async () => {
    const toEval = jobs.filter((j) => selected.has(j.externalId)).slice(0, 15);
    if (toEval.length === 0) return;

    setEvalError('');
    setEvalResults([]);
    setEvaluating(true);
    try {
      const res = await fetch('/api/discover/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: toEval }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEvalError(data.error ?? 'Evaluation failed');
        return;
      }
      setEvalResults(data.results ?? []);

      // Remove successfully evaluated jobs from the list
      const successIds = new Set(
        (data.results as EvaluateResult[])
          .filter((r) => r.status === 'ok')
          .map((r) => r.externalId)
      );
      setJobs((prev) => prev.filter((j) => !successIds.has(j.externalId)));
      setSelected((prev) => {
        const next = new Set(prev);
        successIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch {
      setEvalError('Network error during evaluation.');
    } finally {
      setEvaluating(false);
    }
  }, [jobs, selected]);

  const okCount = evalResults.filter((r) => r.status === 'ok').length;
  const errCount = evalResults.filter((r) => r.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Search form */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>

        {/* Row 1: keyword + location + country */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Keywords / Role
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="React TypeScript Node.js…"
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', fontSize: '13px',
                color: 'var(--text-primary)', outline: 'none', background: '#fff',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Location
            </span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bangalore / Remote"
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', fontSize: '13px',
                color: 'var(--text-primary)', outline: 'none', background: '#fff',
                width: '140px',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Market
            </span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', fontSize: '13px',
                color: 'var(--text-primary)', background: '#fff', cursor: 'pointer',
                height: '36px',
              }}
            >
              <option value="in">🇮🇳 India</option>
              <option value="gb">🇬🇧 UK</option>
              <option value="us">🇺🇸 USA</option>
              <option value="au">🇦🇺 Australia</option>
              <option value="ca">🇨🇦 Canada</option>
              <option value="sg">🇸🇬 Singapore</option>
            </select>
          </label>
        </div>

        {/* Row 2: company portals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Company Portals (Greenhouse + Lever) — comma separated
          </span>
          <input
            value={companiesText}
            onChange={(e) => setCompaniesText(e.target.value)}
            placeholder="Stripe, Figma, Notion, Razorpay…"
            style={{
              padding: '8px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)', fontSize: '13px',
              color: 'var(--text-primary)', outline: 'none', background: '#fff',
            }}
          />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {POPULAR_COMPANIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  const current = companiesText.split(',').map((x) => x.trim()).filter(Boolean);
                  if (!current.includes(c)) {
                    setCompaniesText([...current, c].join(', '));
                  }
                }}
                style={{
                  padding: '3px 10px', borderRadius: '100px',
                  border: '1px solid var(--border-default)', background: '#F8FAFC',
                  fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {!hasAdzuna && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
            fontSize: '12px', color: 'var(--text-secondary)',
          }}>
            <AlertCircle size={13} color="var(--accent)" />
            <span>
              Add <strong>ADZUNA_APP_ID</strong> + <strong>ADZUNA_APP_KEY</strong> to .env.local for broad keyword search (free 250 req/day at adzuna.com/api).
              Without it, only company portal search works.
            </span>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={searching || (!query.trim() && !companiesText.trim())}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '9px 20px', borderRadius: 'var(--radius-md)',
            background: searching ? 'var(--text-muted)' : 'var(--accent)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            border: 'none', cursor: searching ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {searching ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scanning portals…</>
          ) : (
            <><Search size={14} /> Search Jobs</>
          )}
        </button>

        {searchError && (
          <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{searchError}</p>
        )}
      </div>

      {/* Results */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {jobs.length} Jobs Found — {selected.size} selected
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={selectAll} style={linkBtnStyle}>Select all</button>
              <span style={{ color: 'var(--border-default)' }}>·</span>
              <button onClick={deselectAll} style={linkBtnStyle}>Clear</button>
              <button
                onClick={handleEvaluate}
                disabled={selected.size === 0 || evaluating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', borderRadius: 'var(--radius-md)',
                  background: selected.size === 0 || evaluating ? '#E2E8F0' : 'var(--accent)',
                  color: selected.size === 0 || evaluating ? 'var(--text-muted)' : '#fff',
                  fontSize: '12px', fontWeight: 600, border: 'none',
                  cursor: selected.size === 0 || evaluating ? 'not-allowed' : 'pointer',
                }}
              >
                {evaluating ? (
                  <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating {selected.size}…</>
                ) : (
                  <><Zap size={12} /> Evaluate {selected.size > 0 ? selected.size : ''} with AI</>
                )}
              </button>
            </div>
          </div>

          {evalError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#EF4444' }}>
              {evalError}
            </div>
          )}

          {evalResults.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '13px', color: '#15803D' }}>
              ✓ {okCount} job{okCount !== 1 ? 's' : ''} evaluated and saved to your pipeline.
              {errCount > 0 && ` ${errCount} failed.`} Check Find Jobs to review AI scores.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs.map((job) => (
              <DiscoverJobRow
                key={job.externalId}
                job={job}
                checked={selected.has(job.externalId)}
                onToggle={() => toggleJob(job.externalId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  expert:   { bg: '#F0FDF4', text: '#15803D' },
  strong:   { bg: '#EFF6FF', text: '#1D4ED8' },
  familiar: { bg: '#FFFBEB', text: '#B45309' },
  learning: { bg: '#F8FAFC', text: '#64748B' },
};

function DiscoverJobRow({
  job,
  checked,
  onToggle,
}: {
  job: DiscoveredJob;
  checked: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = SCORE_COLOR(job.ruleScore);
  const sourceLabels: Record<string, string> = {
    adzuna: 'Adzuna',
    greenhouse: 'Greenhouse',
    lever: 'Lever',
  };
  const cleanJd = job.jdText ? stripHtml(job.jdText) : '';

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      background: '#fff',
      border: `1px solid ${checked ? 'var(--accent-border)' : 'var(--border-default)'}`,
      boxShadow: checked ? '0 0 0 2px var(--accent-subtle)' : 'var(--shadow-card)',
      overflow: 'hidden',
      transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>

        {/* Checkbox — click only toggles selection */}
        <div
          onClick={onToggle}
          style={{ paddingTop: '2px', flexShrink: 0, color: checked ? 'var(--accent)' : 'var(--text-placeholder)', cursor: 'pointer' }}
        >
          {checked ? <CheckSquare size={16} /> : <Square size={16} />}
        </div>

        {/* Company logo */}
        <div style={{
          width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
          background: companyColor(job.company), color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, flexShrink: 0,
        }}>
          {(job.company?.[0] ?? '?').toUpperCase()}
        </div>

        {/* Info — click to expand */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{job.company}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
            {job.location && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.location}</span>
            )}
            {job.remoteType && (
              <span style={{
                fontSize: '10px', padding: '1px 7px', borderRadius: '100px',
                background: job.remoteType === 'remote' ? '#F0FDF4' : '#EFF6FF',
                color: job.remoteType === 'remote' ? '#15803D' : '#1D4ED8',
                fontWeight: 500,
              }}>
                {job.remoteType}
              </span>
            )}
            <span style={{
              fontSize: '10px', padding: '1px 7px', borderRadius: '100px',
              background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border-default)',
              display: 'flex', alignItems: 'center', gap: '3px',
            }}>
              <Building2 size={9} /> {sourceLabels[job.source] ?? job.source}
            </span>
          </div>
          {!expanded && cleanJd && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {cleanJd.slice(0, 200)}…
            </p>
          )}
        </div>

        {/* Score + expand toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <div style={{
            fontSize: '14px', fontWeight: 700, color: scoreColor,
            background: `${scoreColor}15`, padding: '3px 10px',
            borderRadius: 'var(--radius-md)',
          }}>
            {job.ruleScore.toFixed(1)}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-placeholder)' }}>rule score</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {job.jdUrl && (
              <a
                href={job.jdUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
              >
                <ExternalLink size={10} /> View
              </a>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border-default)',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          background: '#FAFBFC',
        }}>
          {/* Criteria check */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Your Criteria Match
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {job.matchedSkills.length > 0 && (
                <div>
                  <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>✓ Matched skills</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                    {job.matchedSkills.map((s) => {
                      const c = LEVEL_COLORS[s.level] ?? LEVEL_COLORS.learning;
                      return (
                        <span key={s.name} style={{
                          fontSize: '11px', padding: '2px 9px', borderRadius: '100px',
                          background: c.bg, color: c.text, fontWeight: s.isPrimary ? 700 : 400,
                          border: s.isPrimary ? `1px solid ${c.text}30` : 'none',
                        }}>
                          {s.isPrimary && '★ '}{s.name}
                          <span style={{ opacity: 0.6, marginLeft: '3px' }}>{s.level}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {job.missingPrimary.length > 0 && (
                <div>
                  <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>⚠ Primary skills not mentioned</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                    {job.missingPrimary.map((name) => (
                      <span key={name} style={{
                        fontSize: '11px', padding: '2px 9px', borderRadius: '100px',
                        background: '#FFFBEB', color: '#B45309',
                      }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.matchedSkills.length === 0 && job.missingPrimary.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  No skills profile found. Add skills on the My Skills page to see matches.
                </p>
              )}
            </div>
          </div>

          {/* JD text */}
          {cleanJd && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Job Description
              </div>
              <pre style={{
                fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7,
                background: '#fff', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '12px',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: '300px', overflowY: 'auto',
                fontFamily: 'var(--font)', margin: 0,
              }}>
                {cleanJd}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const COMPANY_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--accent)',
  fontSize: '12px', cursor: 'pointer', padding: 0,
};
