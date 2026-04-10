export const dynamic = 'force-dynamic';

import { getJobs } from '@/lib/actions/jobs';
import { JobsClient } from '@/components/jobs/jobs-client';

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.02em', marginBottom: '4px',
          }}>
            Evaluate Job
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Paste a job description or URL — get an AI match score against your profile.
          </p>
        </div>
        <div style={{
          fontSize: '11px', color: 'var(--text-muted)',
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '4px 10px', alignSelf: 'center',
        }}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} evaluated
        </div>
      </div>

      <JobsClient initialJobs={jobs} />
    </div>
  );
}
