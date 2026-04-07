'use client';

import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { GripVertical, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import type { Job } from '@/lib/actions/jobs';
import { updateJobStatus } from '@/lib/actions/jobs';
import { JobDetailSheet } from '@/components/jobs/job-detail-sheet';

const COLUMNS = [
  { status: 'new',       label: 'New Matches', color: '#64748B' },
  { status: 'reviewing', label: 'Reviewing',   color: '#3B82F6' },
  { status: 'applied',   label: 'Applied',     color: '#6366F1' },
  { status: 'responded', label: 'Responded',   color: '#8B5CF6' },
  { status: 'interview', label: 'Interview',   color: '#F59E0B' },
  { status: 'offer',     label: 'Offer',       color: '#10B981' },
  { status: 'rejected',  label: 'Rejected',    color: '#EF4444', collapsedByDefault: true },
  { status: 'skipped',   label: 'Skipped',     color: '#94A3B8', collapsedByDefault: true },
];

const LOGO_PALETTES: [string, string][] = [
  ['#EFF6FF', '#3B82F6'], ['#F0FDF4', '#10B981'], ['#FDF4FF', '#A855F7'],
  ['#FFF7ED', '#F97316'], ['#FEF2F2', '#EF4444'], ['#F0FDFA', '#14B8A6'],
];
function companyPalette(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return LOGO_PALETTES[Math.abs(h) % LOGO_PALETTES.length];
}

function scoreColor(s: number) {
  if (s >= 4) return { color: '#065F46', bg: '#F0FDF4' };
  if (s >= 3) return { color: '#92400E', bg: '#FFFBEB' };
  return       { color: '#991B1B', bg: '#FEF2F2' };
}

function daysAgo(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return '1d';
  return `${d}d`;
}

// ── Card visual (shared between column card and DragOverlay) ─────────────
function KanbanCardVisual({ job, dimmed = false }: { job: Job; dimmed?: boolean }) {
  const [logoBg, logoColor] = companyPalette(job.company ?? 'X');
  const score = job.ai_score ?? job.rule_score ?? 0;
  const sc = scoreColor(score);

  return (
    <div style={{
      background: dimmed ? '#F1F5F9' : '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      padding: '10px 12px',
      opacity: dimmed ? 0.4 : 1,
      display: 'flex', flexDirection: 'column', gap: '6px',
      boxShadow: dimmed ? 'none' : 'var(--shadow-card)',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {/* Logo */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: logoBg, color: logoColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 700,
        }}>
          {(job.company ?? '??').slice(0, 2).toUpperCase()}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.company ?? 'Unknown'}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.title ?? 'Untitled'}
          </div>
        </div>
        {/* Score */}
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', flexShrink: 0,
          background: sc.bg, color: sc.color,
        }}>
          {score.toFixed(1)}
        </span>
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {daysAgo(job.discovered_at)}
        </span>
      </div>
    </div>
  );
}

// ── Draggable card ───────────────────────────────────────────────────────
function KanbanCard({ job, onOpen }: { job: Job; onOpen: (job: Job) => void }) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        transform: CSS.Translate.toString(transform),
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle */}
      {hovered && !isDragging && (
        <div
          {...listeners} {...attributes}
          style={{
            position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)',
            cursor: 'grab', color: 'var(--text-muted)', zIndex: 1,
            display: 'flex', alignItems: 'center',
          }}
        >
          <GripVertical size={12} />
        </div>
      )}
      <div onClick={() => !isDragging && onOpen(job)}>
        <KanbanCardVisual job={job} dimmed={isDragging} />
      </div>
    </div>
  );
}

// ── Droppable column ─────────────────────────────────────────────────────
function KanbanColumn({
  col, jobs, collapsed, onToggleCollapse, onOpen,
}: {
  col: typeof COLUMNS[0];
  jobs: Job[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpen: (job: Job) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.status });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '260px', flexShrink: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '10px 12px', marginBottom: '8px',
        background: '#fff', borderRadius: '8px',
        borderLeft: `4px solid ${col.color}`,
        border: `1px solid var(--border-default)`,
        borderLeftWidth: '4px',
      }}>
        <button onClick={onToggleCollapse} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {col.label}
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '99px',
          background: `${col.color}18`, color: col.color, border: `1px solid ${col.color}30`,
        }}>
          {jobs.length}
        </span>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        }} title={`Add to ${col.label}`}>
          <Plus size={12} />
        </button>
      </div>

      {/* Drop zone */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          style={{
            flex: 1, minHeight: '400px',
            padding: '8px',
            borderRadius: '8px',
            border: isOver ? `2px dashed ${col.color}` : '2px dashed transparent',
            background: isOver ? `${col.color}08` : 'transparent',
            transition: 'all 0.15s ease',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}
        >
          {jobs.map((job) => (
            <KanbanCard key={job.id} job={job} onOpen={onOpen} />
          ))}
          {jobs.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic',
              minHeight: '80px',
            }}>
              Drop here
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stats bar ────────────────────────────────────────────────────────────
function StatsBar({ jobs }: { jobs: Job[] }) {
  const total = jobs.length;
  const applied = jobs.filter((j) => ['applied', 'responded', 'interview', 'offer'].includes(j.status)).length;
  const interviews = jobs.filter((j) => j.status === 'interview').length;
  const offers = jobs.filter((j) => j.status === 'offer').length;

  const FUNNEL = [
    { label: 'New',       count: jobs.filter(j => j.status === 'new').length,                   color: '#64748B' },
    { label: 'Reviewing', count: jobs.filter(j => j.status === 'reviewing').length,              color: '#3B82F6' },
    { label: 'Applied',   count: jobs.filter(j => j.status === 'applied').length,                color: '#6366F1' },
    { label: 'Interview', count: jobs.filter(j => j.status === 'interview').length,              color: '#F59E0B' },
    { label: 'Offer',     count: jobs.filter(j => j.status === 'offer').length,                  color: '#10B981' },
  ].filter(s => s.count > 0);

  const maxCount = Math.max(...FUNNEL.map(s => s.count), 1);

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border-default)',
      borderRadius: '10px', padding: '14px 20px', marginBottom: '20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Stat pills */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: total, color: 'var(--text-primary)' },
          { label: 'Applied', value: applied, color: '#6366F1' },
          { label: 'Interviews', value: interviews, color: '#F59E0B' },
          { label: 'Offers', value: offers, color: '#10B981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Funnel bars */}
      {FUNNEL.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {FUNNEL.map(({ label, count, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '60px', flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: '6px', background: 'var(--border-default)', borderRadius: '99px', overflow: 'hidden', maxWidth: '200px' }}>
                <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '10px', color, fontWeight: 600, width: '16px' }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main board ───────────────────────────────────────────────────────────
export function KanbanBoard({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    Object.fromEntries(COLUMNS.filter(c => c.collapsedByDefault).map(c => [c.status, true]))
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const jobsByStatus = Object.fromEntries(
    COLUMNS.map((col) => [col.status, jobs.filter((j) => j.status === col.status)])
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveJob(jobs.find((j) => j.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;
    const jobId = active.id as string;
    const newStatus = over.id as string;
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;

    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
    updateJobStatus(jobId, newStatus);
  }

  function handleStatusChange(id: string, status: string) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status } : j));
    if (selectedJob?.id === id) setSelectedJob((prev) => prev ? { ...prev, status } : prev);
    updateJobStatus(id, status);
  }

  function handleDelete(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setSheetOpen(false);
  }

  return (
    <>
      <StatsBar jobs={jobs} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                col={col}
                jobs={jobsByStatus[col.status] ?? []}
                collapsed={!!collapsed[col.status]}
                onToggleCollapse={() => setCollapsed((prev) => ({ ...prev, [col.status]: !prev[col.status] }))}
                onOpen={(job) => { setSelectedJob(job); setSheetOpen(true); }}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeJob && (
            <div style={{ width: '260px', transform: 'rotate(2deg)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <KanbanCardVisual job={activeJob} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
