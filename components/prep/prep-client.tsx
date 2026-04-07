'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { Job } from '@/lib/actions/jobs';
import {
  generateInterviewQuestions, type InterviewQuestion,
  generateStarStories, type StarStory,
  generateCompanyResearch, type CompanyResearch,
  generateNegotiationScript, type NegotiationScript,
} from '@/lib/actions/prep';

const TABS = [
  { key: 'questions',  label: 'Interview Questions' },
  { key: 'star',       label: 'STAR Stories' },
  { key: 'research',   label: 'Company Research' },
  { key: 'negotiation',label: 'Negotiation Script' },
] as const;

type TabKey = typeof TABS[number]['key'];

const TYPE_COLORS = {
  technical:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  behavioral:  { bg: '#F0FDF4', color: '#065F46', border: '#BBF7D0' },
  situational: { bg: '#FDF4FF', color: '#6B21A8', border: '#E9D5FF' },
};

function useCopy() {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return { copy, copied };
}

// ─── Interview Questions Tab ────────────────────────────────────────────
function QuestionsTab({ jobId, initial }: { jobId: string; initial: InterviewQuestion[] | null }) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(initial ?? []);
  const [practiced, setPracticed] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  async function generate(force = false) {
    setLoading(true);
    try {
      const result = await generateInterviewQuestions(jobId, force);
      setQuestions(result);
      setPracticed(new Set());
      setExpanded(new Set());
    } finally {
      setLoading(false);
    }
  }

  if (questions.length === 0) return <GeneratePrompt label="Generate interview questions" onGenerate={() => generate(false)} loading={loading} />;

  const progress = practiced.size;
  const total = questions.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {progress} / {total} practiced
          </div>
          <div style={{ height: '4px', background: 'var(--border-strong)', borderRadius: '99px', overflow: 'hidden', maxWidth: '200px' }}>
            <div style={{ height: '100%', width: `${(progress / total) * 100}%`, background: 'var(--accent)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
        <RegenerateBtn onRegenerate={() => generate(true)} loading={loading} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {questions.map((q, i) => {
          const tc = TYPE_COLORS[q.type] ?? TYPE_COLORS.behavioral;
          const isExpanded = expanded.has(i);
          const isPracticed = practiced.has(i);
          return (
            <div key={i} style={{
              background: '#fff', border: `1px solid ${isPracticed ? 'var(--accent-border)' : 'var(--border-default)'}`,
              borderRadius: '10px', overflow: 'hidden',
              transition: 'border-color 0.15s ease',
            }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer' }}
                onClick={() => setExpanded((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}
              >
                <input
                  type="checkbox"
                  checked={isPracticed}
                  onChange={(e) => { e.stopPropagation(); setPracticed((prev) => { const s = new Set(prev); e.target.checked ? s.add(i) : s.delete(i); return s; }); }}
                  style={{ width: '14px', height: '14px', accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {q.question}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '99px', flexShrink: 0,
                  background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                }}>
                  {q.type}
                </span>
                {isExpanded ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}
              </div>
              {isExpanded && (
                <div style={{
                  padding: '0 14px 12px 40px',
                  fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7,
                  fontStyle: 'italic',
                  borderTop: '1px solid var(--border-default)',
                  paddingTop: '10px',
                }}>
                  💡 {q.hint}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STAR Stories Tab ───────────────────────────────────────────────────
function StarTab({ jobId, initial }: { jobId: string; initial: StarStory[] | null }) {
  const [stories, setStories] = useState<StarStory[]>(initial ?? []);
  const [editingStory, setEditingStory] = useState<number | null>(null);
  const [edits, setEdits] = useState<Partial<StarStory>>({});
  const [loading, setLoading] = useState(false);
  const { copy, copied } = useCopy();

  async function generate(force = false) {
    setLoading(true);
    try {
      const result = await generateStarStories(jobId, force);
      setStories(result);
    } finally {
      setLoading(false);
    }
  }

  if (stories.length === 0) return <GeneratePrompt label="Generate STAR stories" onGenerate={() => generate(false)} loading={loading} />;

  const STAR_KEYS: { key: keyof StarStory; label: string; color: string }[] = [
    { key: 'situation',  label: 'Situation',  color: '#3B82F6' },
    { key: 'task',       label: 'Task',       color: '#8B5CF6' },
    { key: 'action',     label: 'Action',     color: '#F59E0B' },
    { key: 'result',     label: 'Result',     color: '#10B981' },
    { key: 'reflection', label: 'Reflection', color: '#6366F1' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <RegenerateBtn onRegenerate={() => generate(true)} loading={loading} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stories.map((story, i) => {
          const current = editingStory === i ? { ...story, ...edits } : story;
          const storyText = STAR_KEYS.map(({ key, label }) => `${label}: ${current[key]}`).join('\n\n');
          return (
            <div key={i} style={{
              background: '#fff', border: '1px solid var(--border-default)',
              borderRadius: '10px', padding: '16px',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: '99px',
                  background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
                  lineHeight: 1.4,
                }}>
                  {story.question}
                </span>
                <button
                  onClick={() => copy(storyText)}
                  style={{ ...smallBtn, flexShrink: 0 }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {STAR_KEYS.map(({ key, label, color }) => (
                  <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px',
                      background: `${color}18`, color, flexShrink: 0, marginTop: '2px', width: '70px', textAlign: 'center',
                    }}>
                      {label}
                    </span>
                    {editingStory === i ? (
                      <textarea
                        value={(current[key] as string) ?? ''}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                        style={{
                          flex: 1, fontSize: '12px', lineHeight: 1.6, padding: '4px 8px',
                          border: '1px solid var(--border-input)', borderRadius: '6px',
                          background: 'var(--bg-input)', color: 'var(--text-primary)',
                          resize: 'vertical', outline: 'none', minHeight: '56px',
                        }}
                      />
                    ) : (
                      <span
                        style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, cursor: 'text' }}
                        onClick={() => { setEditingStory(i); setEdits({}); }}
                      >
                        {current[key] as string}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {editingStory === i && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setStories((prev) => prev.map((s, idx) => idx === i ? { ...s, ...edits } : s)); setEditingStory(null); setEdits({}); }} style={{ ...smallBtn, background: 'var(--accent)', color: '#fff', border: 'none' }}>Save</button>
                  <button onClick={() => { setEditingStory(null); setEdits({}); }} style={smallBtn}>Cancel</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Company Research Tab ───────────────────────────────────────────────
function ResearchTab({ jobId, initial }: { jobId: string; initial: CompanyResearch | null }) {
  const [data, setData] = useState<CompanyResearch | null>(initial);
  const [loading, setLoading] = useState(false);
  const { copy, copied } = useCopy();

  async function generate(force = false) {
    setLoading(true);
    try { setData(await generateCompanyResearch(jobId, force)); }
    finally { setLoading(false); }
  }

  if (!data) return <GeneratePrompt label="Generate company research" onGenerate={() => generate(false)} loading={loading} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RegenerateBtn onRegenerate={() => generate(true)} loading={loading} />
      </div>

      <ResearchCard title="Mission">
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>
          "{data.mission}"
        </p>
      </ResearchCard>

      <ResearchCard title="Culture Signals">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {data.culture.map((c) => (
            <span key={c} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', background: '#F0FDF4', color: '#065F46', border: '1px solid #BBF7D0' }}>{c}</span>
          ))}
        </div>
      </ResearchCard>

      <ResearchCard title="Tech Stack">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {data.techStack.map((t) => (
            <span key={t} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{t}</span>
          ))}
        </div>
      </ResearchCard>

      <ResearchCard title="Recent News">
        <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {data.recentNews.map((n, i) => (
            <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{n}</li>
          ))}
        </ul>
      </ResearchCard>

      <ResearchCard title={`Glassdoor Sentiment: ${data.glassdoorSentiment}`}>
        <div style={{ height: '8px', background: 'var(--border-strong)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '72%', background: '#10B981', borderRadius: '99px' }} />
        </div>
      </ResearchCard>

      <ResearchCard title="Questions to Ask Them">
        <ol style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.questionsToAsk.map((q, i) => (
            <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <span style={{ cursor: 'pointer' }} onClick={() => copy(q)} title="Copy">
                {q}
              </span>
            </li>
          ))}
        </ol>
        {copied && <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '6px' }}>Copied!</div>}
      </ResearchCard>
    </div>
  );
}

// ─── Negotiation Script Tab ─────────────────────────────────────────────
function NegotiationTab({ jobId, initial }: { jobId: string; initial: NegotiationScript | null }) {
  const [script, setScript] = useState<NegotiationScript | null>(initial);
  const [loading, setLoading] = useState(false);
  const { copy, copied } = useCopy();

  async function generate(force = false) {
    setLoading(true);
    try { setScript(await generateNegotiationScript(jobId, force)); }
    finally { setLoading(false); }
  }

  if (!script) return <GeneratePrompt label="Generate negotiation script" onGenerate={() => generate(false)} loading={loading} />;

  const LINES = [
    { label: 'Opening',           text: script.openingLine },
    { label: 'Anchor',            text: script.anchorStatement },
    { label: 'If they push back', text: script.pushbackResponse },
    { label: 'Closing',           text: script.closingLine },
  ];

  const fullScript = LINES.map(l => `${l.label}:\n"${l.text}"`).join('\n\n')
    + '\n\nTips:\n' + script.tips.map(t => `• ${t}`).join('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <RegenerateBtn onRegenerate={() => generate(true)} loading={loading} />
        <button onClick={() => copy(fullScript)} style={smallBtn}>
          {copied ? <Check size={11} /> : <Copy size={11} />} Copy full script
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
        {LINES.map(({ label, text }) => (
          <div key={label} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {label}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.7, paddingLeft: '12px', borderLeft: '3px solid var(--accent)', fontStyle: 'italic' }}>
              "{text}"
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Tips</div>
        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {script.tips.map((tip, i) => (
            <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────
function GeneratePrompt({ label, onGenerate, loading }: { label: string; onGenerate: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        AI-generated prep content for this role.
      </p>
      <button onClick={onGenerate} disabled={loading} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '9px 20px', borderRadius: 'var(--radius-md)',
        background: loading ? 'var(--text-muted)' : 'var(--accent)',
        border: 'none', color: '#fff', fontSize: '13px', fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}>
        {loading && <Loader2 size={13} className="animate-spin" />}
        {loading ? 'Generating…' : label}
      </button>
    </div>
  );
}

function RegenerateBtn({ onRegenerate, loading }: { onRegenerate: () => void; loading: boolean }) {
  return (
    <button onClick={onRegenerate} disabled={loading} style={{ ...smallBtn, gap: '4px' }}>
      {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
      Regenerate
    </button>
  );
}

function ResearchCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '14px 16px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</div>
      {children}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '5px 10px', borderRadius: 'var(--radius-md)',
  background: 'transparent', border: '1px solid var(--border-default)',
  fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)',
  cursor: 'pointer',
};

// ─── Main component ──────────────────────────────────────────────────────
type PrepData = {
  questions: InterviewQuestion[] | null;
  starStories: StarStory[] | null;
  companyResearch: CompanyResearch | null;
  negotiation: NegotiationScript | null;
};

export function PrepClient({ jobs }: { jobs: Job[] }) {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('questions');

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const cache = (selectedJob?.prep_cache ?? {}) as PrepData;

  if (jobs.length === 0) {
    return (
      <div style={{ maxWidth: '520px', padding: '48px 32px', background: '#fff', borderRadius: '12px', border: '1px solid var(--border-default)', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          No jobs in Interview or Applied status yet.
        </p>
        <a href="/jobs" style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
          Evaluate jobs →
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Job selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
          Preparing for
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => { setSelectedJobId(e.target.value); setActiveTab('questions'); }}
          style={{
            width: '100%', padding: '9px 12px', fontSize: '13px',
            background: '#fff', border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
            boxShadow: 'var(--shadow-card)', cursor: 'pointer',
          }}
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.company ?? 'Unknown'} — {j.title ?? 'Untitled'} ({(j.ai_score ?? 0).toFixed(1)})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: '20px' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '10px 16px', fontSize: '12px', fontWeight: 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {selectedJob && (
        <div>
          {activeTab === 'questions' && (
            <QuestionsTab jobId={selectedJob.id} initial={cache.questions} />
          )}
          {activeTab === 'star' && (
            <StarTab jobId={selectedJob.id} initial={cache.starStories} />
          )}
          {activeTab === 'research' && (
            <ResearchTab jobId={selectedJob.id} initial={cache.companyResearch} />
          )}
          {activeTab === 'negotiation' && (
            <NegotiationTab jobId={selectedJob.id} initial={cache.negotiation} />
          )}
        </div>
      )}
    </div>
  );
}
