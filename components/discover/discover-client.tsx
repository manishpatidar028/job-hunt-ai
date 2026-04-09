'use client';

import { useState, useCallback } from 'react';
import { Search, Zap, ExternalLink, CheckSquare, Square, RefreshCw, Building2, ChevronDown, ChevronUp, RotateCcw, Settings2, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { stripHtml } from '@/lib/utils/html';
import type { DiscoveredJob } from '@/app/api/discover/search/route';
import type { EvaluateResult } from '@/app/api/discover/evaluate/route';

type Props = {
  initialQuery: string;
  hasAdzuna: boolean;
  watchedCompanies: string[];
  jobMarket: string;
  userYearsExperience: number;
};

const TIMEFRAMES = [
  { label: 'Any time', days: null },
  { label: '24h',      days: 1 },
  { label: '7 days',   days: 7 },
  { label: '30 days',  days: 30 },
  { label: '3 months', days: 90 },
];

const SCORE_COLOR = (s: number) =>
  s >= 4 ? '#10B981' : s >= 3 ? '#3B82F6' : s >= 2 ? '#F59E0B' : '#94A3B8';

const POPULAR_COMPANIES = [
  'Stripe', 'Figma', 'Notion', 'Shopify', 'Browserstack',
  'Postman', 'Freshworks', 'Razorpay', 'Chargebee', 'Cloudflare',
];

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  expert:   { bg: '#F0FDF4', text: '#15803D' },
  strong:   { bg: '#EFF6FF', text: '#1D4ED8' },
  familiar: { bg: '#FFFBEB', text: '#B45309' },
  learning: { bg: '#F8FAFC', text: '#64748B' },
};

export function DiscoverClient({ initialQuery, hasAdzuna, watchedCompanies, jobMarket, userYearsExperience }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [country, setCountry] = useState(jobMarket);
  const [daysBack, setDaysBack] = useState<number | null>(null);
  const [companiesText, setCompaniesText] = useState(watchedCompanies.join(', '));
  const [showCompanies, setShowCompanies] = useState(false);
  const [minYears, setMinYears] = useState<string>(userYearsExperience > 0 ? String(userYearsExperience) : '');
  const [maxYears, setMaxYears] = useState<string>('');

  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [evalResults, setEvalResults] = useState<EvaluateResult[]>([]);
  const [evalError, setEvalError] = useState('');
  const [panelJob, setPanelJob] = useState<DiscoveredJob | null>(null);

  const addLocation = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !locations.includes(trimmed)) {
      setLocations((prev) => [...prev, trimmed]);
    }
    setLocationInput('');
  };

  const removeLocation = (loc: string) => setLocations((prev) => prev.filter((l) => l !== loc));

  const handleSearch = useCallback(async () => {
    setSearchError('');
    setEvalResults([]);
    setSelected(new Set());
    setPanelJob(null);
    setSearching(true);
    try {
      const companies = companiesText.split(',').map((c) => c.trim()).filter(Boolean);
      const res = await fetch('/api/discover/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query, locations, country, companies,
          ...(daysBack ? { daysBack } : {}),
          ...(minYears ? { minYears: parseInt(minYears) } : {}),
          ...(maxYears ? { maxYears: parseInt(maxYears) } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error ?? 'Search failed'); return; }
      setJobs(data.jobs ?? []);
      if ((data.jobs ?? []).length === 0)
        setSearchError('No matching jobs found. Try different keywords or a wider timeframe.');
    } catch {
      setSearchError('Network error — please try again.');
    } finally {
      setSearching(false);
    }
  }, [query, locations, country, companiesText, daysBack, minYears, maxYears]);

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
      if (!res.ok) { setEvalError(data.error ?? 'Evaluation failed'); return; }
      setEvalResults(data.results ?? []);
      const successIds = new Set(
        (data.results as EvaluateResult[]).filter((r) => r.status === 'ok').map((r) => r.externalId)
      );
      setJobs((prev) => prev.filter((j) => !successIds.has(j.externalId)));
      setSelected((prev) => { const next = new Set(prev); successIds.forEach((id) => next.delete(id)); return next; });
      if (panelJob && successIds.has(panelJob.externalId)) setPanelJob(null);
    } catch {
      setEvalError('Network error during evaluation.');
    } finally {
      setEvaluating(false);
    }
  }, [jobs, selected, panelJob]);

  const okCount = evalResults.filter((r) => r.status === 'ok').length;
  const errCount = evalResults.filter((r) => r.status === 'error').length;
  const canSearch = query.trim().length > 0;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Search panel */}
        <div style={{
          background: '#fff', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', padding: '20px',
          boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={labelStyle}>Keywords / Role</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {query !== initialQuery && initialQuery && (
                  <button onClick={() => setQuery(initialQuery)} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)', padding: 0 }}>
                    <RotateCcw size={10} /> Reset to skills
                  </button>
                )}
                <Link href="/skills" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                  <Settings2 size={10} /> Edit skills
                </Link>
              </div>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="e.g. React TypeScript Node.js" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 200px' }}>
              <span style={labelStyle}>Locations</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '6px 10px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: '#fff', minHeight: '38px', alignItems: 'center' }}>
                {locations.map((loc) => (
                  <span key={loc} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '12px', fontWeight: 500, border: '1px solid var(--accent-border)' }}>
                    {loc}
                    <button onClick={() => removeLocation(loc)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--accent)', lineHeight: 1 }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addLocation(locationInput); }
                    if (e.key === 'Backspace' && !locationInput && locations.length > 0) removeLocation(locations[locations.length - 1]);
                  }}
                  onBlur={() => { if (locationInput.trim()) addLocation(locationInput); }}
                  placeholder={locations.length === 0 ? 'Ahmedabad, Bangalore, Remote…' : 'Add more…'}
                  style={{ border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', background: 'transparent', minWidth: '120px', flex: 1, padding: 0 }}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Press Enter or comma to add · Leave empty for all locations</span>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={labelStyle}>Market</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
                <option value="in">🇮🇳 India</option>
                <option value="gb">🇬🇧 UK</option>
                <option value="us">🇺🇸 USA</option>
                <option value="au">🇦🇺 Australia</option>
                <option value="ca">🇨🇦 Canada</option>
                <option value="sg">🇸🇬 Singapore</option>
              </select>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={labelStyle}>Posted within</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {TIMEFRAMES.map((tf) => (
                  <button key={String(tf.days)} onClick={() => setDaysBack(tf.days)} style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 500,
                    border: `1px solid ${daysBack === tf.days ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: daysBack === tf.days ? 'var(--accent)' : '#fff',
                    color: daysBack === tf.days ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Experience year range */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={labelStyle}>My experience (yrs)</span>
              <input
                type="number" min={0} max={30} placeholder="e.g. 4"
                value={minYears} onChange={(e) => setMinYears(e.target.value)}
                style={{ ...inputStyle, width: '100px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={labelStyle}>Max required (yrs)</span>
              <input
                type="number" min={0} max={30} placeholder="e.g. 8"
                value={maxYears} onChange={(e) => setMaxYears(e.target.value)}
                style={{ ...inputStyle, width: '100px' }}
              />
            </label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
              Jobs requiring more experience than yours will be filtered out
            </p>
          </div>

          <div>
            <button onClick={() => setShowCompanies((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              <SlidersHorizontal size={12} />
              Add specific company portals
              {companiesText.trim() && <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>· {companiesText.split(',').filter((c) => c.trim()).length} added</span>}
              {showCompanies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showCompanies && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={companiesText} onChange={(e) => setCompaniesText(e.target.value)} placeholder="Stripe, Figma, Notion, Razorpay…" style={inputStyle} />
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {POPULAR_COMPANIES.map((c) => {
                    const current = companiesText.split(',').map((x) => x.trim()).filter(Boolean);
                    const active = current.includes(c);
                    return (
                      <button key={c} onClick={() => setCompaniesText(active ? current.filter((x) => x !== c).join(', ') : [...current, c].join(', '))} style={{
                        padding: '3px 10px', borderRadius: '100px', fontSize: '11px', cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                        background: active ? 'var(--accent-subtle)' : '#F8FAFC',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400,
                      }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  Already scanning 30+ companies (Stripe, Figma, Browserstack, Freshworks…) by default
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSearch} disabled={searching || !canSearch} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 22px', borderRadius: 'var(--radius-md)',
              background: searching || !canSearch ? 'var(--text-muted)' : 'var(--accent)',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              border: 'none', cursor: searching || !canSearch ? 'not-allowed' : 'pointer',
            }}>
              {searching ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning…</> : <><Search size={14} /> Search Jobs</>}
            </button>
            {!canSearch && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enter keywords or <Link href="/skills" style={{ color: 'var(--accent)' }}>add skills</Link> to your profile</span>}
            {canSearch && !searching && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RemoteOK · Remotive · Greenhouse · Lever{hasAdzuna ? ' · Adzuna' : ''}</span>}
          </div>

          {searchError && <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{searchError}</p>}
        </div>

        {/* Results */}
        {jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                {jobs.length} jobs found — {selected.size} selected
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={selectAll} style={linkBtnStyle}>Select all</button>
                <span style={{ color: 'var(--border-default)' }}>·</span>
                <button onClick={deselectAll} style={linkBtnStyle}>Clear</button>
                <button onClick={handleEvaluate} disabled={selected.size === 0 || evaluating} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', borderRadius: 'var(--radius-md)',
                  background: selected.size === 0 || evaluating ? '#E2E8F0' : 'var(--accent)',
                  color: selected.size === 0 || evaluating ? 'var(--text-muted)' : '#fff',
                  fontSize: '12px', fontWeight: 600, border: 'none',
                  cursor: selected.size === 0 || evaluating ? 'not-allowed' : 'pointer',
                }}>
                  {evaluating ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating {selected.size}…</> : <><Zap size={12} /> Evaluate {selected.size > 0 ? selected.size : ''} with AI</>}
                </button>
              </div>
            </div>

            {evalError && <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#EF4444' }}>{evalError}</div>}

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
                  active={panelJob?.externalId === job.externalId}
                  onToggle={() => toggleJob(job.externalId)}
                  onOpen={() => setPanelJob(panelJob?.externalId === job.externalId ? null : job)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {panelJob && (
        <>
          <div onClick={() => setPanelJob(null)} style={{ position: 'fixed', inset: 0, zIndex: 34, background: 'rgba(15,23,42,0.15)' }} />
          <div style={{
            position: 'fixed',
            top: 'var(--topbar-height)',
            right: 0,
            bottom: 0,
            width: '440px',
            background: '#fff',
            borderLeft: '1px solid var(--border-default)',
            boxShadow: '-8px 0 32px rgba(15,23,42,0.08)',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInPanel 0.22s ease',
          }}>
            <JobDetailPanel job={panelJob} onClose={() => setPanelJob(null)} />
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInPanel { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}

function DiscoverJobRow({ job, checked, active, onToggle, onOpen }: {
  job: DiscoveredJob;
  checked: boolean;
  active: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const sourceLabels: Record<string, string> = {
    adzuna: 'Adzuna', greenhouse: 'Greenhouse', lever: 'Lever',
    remoteok: 'RemoteOK', remotive: 'Remotive',
  };
  const cleanJd = job.jdText ? stripHtml(job.jdText) : '';
  const isHighlit = active || hovered;

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 'var(--radius-lg)',
        background: isHighlit && !active ? '#FAFBFC' : '#fff',
        cursor: 'pointer',
        border: `1px solid ${active ? 'var(--accent)' : hovered ? 'var(--border-strong)' : checked ? 'var(--accent-border)' : 'var(--border-default)'}`,
        boxShadow: active ? '0 0 0 2px var(--accent-subtle)' : hovered ? 'var(--shadow-card-hover)' : checked ? '0 0 0 2px var(--accent-subtle)' : 'var(--shadow-card)',
        overflow: 'hidden',
        transition: 'all 0.12s ease',
        transform: hovered && !active ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
        <div onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{ paddingTop: '2px', flexShrink: 0, color: checked ? 'var(--accent)' : 'var(--text-placeholder)', cursor: 'pointer' }}>
          {checked ? <CheckSquare size={16} /> : <Square size={16} />}
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: companyColor(job.company), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
          {(job.company?.[0] ?? '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{job.company}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
            {job.location && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.location}</span>}
            {job.remoteType && (
              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: job.remoteType === 'remote' ? '#F0FDF4' : '#EFF6FF', color: job.remoteType === 'remote' ? '#15803D' : '#1D4ED8', fontWeight: 500 }}>
                {job.remoteType}
              </span>
            )}
            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Building2 size={9} /> {sourceLabels[job.source] ?? job.source}
            </span>
            {job.requiredYears && (
              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: '#FDF4FF', color: '#A855F7', fontWeight: 500 }}>
                {job.requiredYears.max ? `${job.requiredYears.min}–${job.requiredYears.max} yrs` : `${job.requiredYears.min}+ yrs`}
              </span>
            )}
          </div>
          {cleanJd && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {cleanJd.slice(0, 200)}…
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: 'var(--radius-md)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
              background: active ? 'var(--accent-subtle)' : '#fff',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '11px', fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.12s ease', whiteSpace: 'nowrap',
            }}
          >
            {active ? 'Close' : 'View details'}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobDetailPanel({ job, onClose }: { job: DiscoveredJob; onClose: () => void }) {
  const cleanJd = job.jdText ? stripHtml(job.jdText) : '';
  const sourceLabels: Record<string, string> = {
    adzuna: 'Adzuna', greenhouse: 'Greenhouse', lever: 'Lever',
    remoteok: 'RemoteOK', remotive: 'Remotive',
  };

  return (
    <>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'flex-start', gap: '12px', flexShrink: 0 }}>
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: companyColor(job.company), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
          {(job.company?.[0] ?? '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{job.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{job.company}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {job.location && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.location}</span>}
            {job.remoteType && (
              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: job.remoteType === 'remote' ? '#F0FDF4' : '#EFF6FF', color: job.remoteType === 'remote' ? '#15803D' : '#1D4ED8', fontWeight: 500 }}>
                {job.remoteType}
              </span>
            )}
            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: '#F8FAFC', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
              {sourceLabels[job.source] ?? job.source}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', borderRadius: 'var(--radius-sm)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Skills match */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Your Skills Match
          </div>
          {job.matchedSkills.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, marginBottom: '6px' }}>✓ Matched</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {job.matchedSkills.map((s) => {
                  const c = LEVEL_COLORS[s.level] ?? LEVEL_COLORS.learning;
                  return (
                    <span key={s.name} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', background: c.bg, color: c.text, fontWeight: s.isPrimary ? 700 : 400, border: s.isPrimary ? `1px solid ${c.text}30` : 'none' }}>
                      {s.isPrimary && '★ '}{s.name} <span style={{ opacity: 0.6, marginLeft: '3px' }}>{s.level}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {job.missingPrimary.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600, marginBottom: '6px' }}>⚠ Primary skills not mentioned</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {job.missingPrimary.map((name) => (
                  <span key={name} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', background: '#FFFBEB', color: '#B45309' }}>{name}</span>
                ))}
              </div>
            </div>
          )}
          {job.matchedSkills.length === 0 && job.missingPrimary.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              No skills profile found. <Link href="/skills" style={{ color: 'var(--accent)' }}>Add skills</Link> to see match details.
            </p>
          )}
        </div>

        {/* JD */}
        {cleanJd && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Job Description
            </div>
            <pre style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, background: '#FAFBFC', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font)', margin: 0 }}>
              {cleanJd}
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '10px', flexShrink: 0 }}>
        {job.jdUrl && (
          <a
            href={job.jdUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: '#fff',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <ExternalLink size={12} />
            Apply on {sourceLabel(job.source)}
          </a>
        )}
      </div>
    </>
  );
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    adzuna: 'Adzuna', greenhouse: 'Greenhouse', lever: 'Lever',
    remoteok: 'RemoteOK', remotive: 'Remotive',
  };
  return map[source] ?? 'Portal';
}

const COMPANY_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name?.length ?? 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', fontSize: '13px',
  color: 'var(--text-primary)', outline: 'none', background: '#fff', width: '100%',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--accent)',
  fontSize: '12px', cursor: 'pointer', padding: 0,
};
