'use client';

import { StatCard } from '@/components/ui/stat-card';
import { JobCard } from '@/components/ui/job-card';
import { Briefcase, Send, MessageSquare, TrendingUp, Plus, Kanban, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Job } from '@/lib/actions/jobs';

type Stats = {
  totalJobs: number;
  strongMatches: number;
  applied: number;
  avgScore: string;
};

type Props = {
  stats: Stats;
  topMatches: Job[];
  showOnboarding: boolean;
};

export function DashboardClient({ stats, topMatches, showOnboarding }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Onboarding banner */}
      {showOnboarding && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
        }}>
          <AlertCircle size={16} color="var(--accent)" />
          <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>
            Finish setting up your profile for better job matches.
          </span>
          <Link href="/profile" style={{
            padding: '5px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', color: '#fff',
            fontSize: '12px', fontWeight: 500, textDecoration: 'none',
          }}>
            Complete profile →
          </Link>
        </div>
      )}

      {/* Stats */}
      <section>
        <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <StatCard label="Jobs Evaluated"  value={stats.totalJobs}     icon={Briefcase}      />
          <StatCard label="Strong Matches"  value={stats.strongMatches} delta="ai_score ≥ 4.0" icon={TrendingUp} />
          <StatCard label="Applied"         value={stats.applied}       icon={Send}           />
          <StatCard label="Avg Score"       value={stats.avgScore}      icon={MessageSquare}  />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          <QuickActionCard
            href="/jobs"
            iconBg="var(--accent-subtle)"
            icon={<Plus size={18} color="var(--accent)" />}
            title="Evaluate a job"
            subtitle="Paste JD or URL to score"
          />
          <QuickActionCard
            href="/pipeline"
            iconBg="#EFF6FF"
            icon={<Kanban size={18} color="#3B82F6" />}
            title="View pipeline"
            subtitle="Track application status"
          />
        </div>
      </section>

      {/* Top matches */}
      {topMatches.length > 0 && (
        <section>
          <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Top Matches
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topMatches.map((job) => (
              <JobCard
                key={job.id}
                company={job.company ?? 'Unknown'}
                role={job.title ?? 'Untitled'}
                score={job.ai_score ?? 0}
                status={job.status}
                location={job.location ?? undefined}
                isRemote={job.remote_type === 'remote'}
                salaryRange={job.salary_min ? { min: job.salary_min, max: job.salary_max ?? undefined } : undefined}
                currency={job.currency}
                discoveredAt={job.discovered_at}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {stats.totalJobs === 0 && (
        <div style={{
          background: '#fff', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', padding: '40px',
          textAlign: 'center', boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No jobs yet
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Paste a job description to get your first AI match score.
          </p>
          <Link href="/jobs" style={{
            padding: '8px 20px', background: 'var(--accent)', color: '#fff',
            borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, textDecoration: 'none',
          }}>
            Evaluate first job →
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ href, iconBg, icon, title, subtitle }: {
  href: string; iconBg: string; icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#fff', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)', padding: '16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: 'var(--shadow-card)', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
        }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</div>
        </div>
      </div>
    </Link>
  );
}
