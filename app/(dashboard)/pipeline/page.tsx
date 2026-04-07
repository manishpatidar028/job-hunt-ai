import { getJobs } from '@/lib/actions/jobs';
import { KanbanBoard } from '@/components/pipeline/kanban-board';

export default async function PipelinePage() {
  const jobs = await getJobs();

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Pipeline
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Drag jobs between columns to track your application progress.
        </p>
      </div>
      <KanbanBoard initialJobs={jobs} />
    </div>
  );
}
