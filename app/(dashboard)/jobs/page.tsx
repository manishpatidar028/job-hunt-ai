export const dynamic = 'force-dynamic';

import { getJobs } from '@/lib/actions/jobs';
import { JobsClient } from '@/components/jobs/jobs-client';

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.02em', marginBottom: '4px',
        }}>
          Find Jobs
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Paste a job description or URL to get an AI match score against your skills.
        </p>
      </div>

      <JobsClient initialJobs={jobs} />
    </div>
  );
}
