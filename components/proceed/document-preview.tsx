'use client';

import { Printer } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ResumeBlock =
  | { kind: 'name';      text: string }
  | { kind: 'contact';   text: string }
  | { kind: 'section';   text: string }
  | { kind: 'entry';     text: string }
  | { kind: 'bullet';    text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'spacer' };

// ── Resume parser ──────────────────────────────────────────────────────────────

const RE_SECTION = /^[A-Z][A-Z\s\/&\-]{2,}$/;          // ALL CAPS lines
const RE_DATE    = /\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b/i;
const RE_BULLET  = /^[\u2022\u2013\-\*]\s+/;            // •, –, -, *
const RE_CONTACT = /[@|·\|]|linkedin|github|\+\d|\d{10}/i;

function parseResume(text: string): ResumeBlock[] {
  const lines = text.split('\n');
  const blocks: ResumeBlock[] = [];
  let sectionSeen = false;
  let headerLineCount = 0;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      blocks.push({ kind: 'spacer' });
      continue;
    }

    // Section header (ALL CAPS, short)
    if (RE_SECTION.test(line) && line.length < 45) {
      sectionSeen = true;
      blocks.push({ kind: 'section', text: line });
      continue;
    }

    // Header zone: first ~5 non-empty lines before any section
    if (!sectionSeen && headerLineCount < 5) {
      headerLineCount++;
      if (headerLineCount === 1) {
        blocks.push({ kind: 'name', text: line });
      } else {
        blocks.push({ kind: 'contact', text: line });
      }
      continue;
    }

    // Bullet points
    if (RE_BULLET.test(line)) {
      blocks.push({ kind: 'bullet', text: line.replace(RE_BULLET, '') });
      continue;
    }

    // Entry line (job/edu title — contains date or pipe separator)
    if (RE_DATE.test(line) || line.includes(' | ') || line.includes(' · ')) {
      blocks.push({ kind: 'entry', text: line });
      continue;
    }

    blocks.push({ kind: 'paragraph', text: line });
  }

  return blocks;
}

// ── PDF download via browser print ────────────────────────────────────────────

function buildPrintHTML(content: string, type: 'resume' | 'cover-letter'): string {
  const isResume = type === 'resume';
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${isResume ? 'Resume' : 'Cover Letter'}</title>
<style>
  @page { size: A4; margin: 18mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1a1a1a;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
</style>
</head>
<body>
<pre>${escapedContent}</pre>
</body>
</html>`;
}

export function downloadAsPDF(content: string, type: 'resume' | 'cover-letter') {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Please allow popups to download the PDF.');
    return;
  }
  win.document.write(buildPrintHTML(content, type));
  win.document.close();
  win.focus();
  // Small delay so browser finishes rendering before print dialog opens
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

// ── Resume preview renderer ────────────────────────────────────────────────────

function ResumePreview({ content }: { content: string }) {
  const blocks = parseResume(content);

  return (
    <div style={docStyle}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'name':
            return (
              <div key={i} style={{ fontSize: '20px', fontWeight: 700, color: '#111', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: '2px' }}>
                {block.text}
              </div>
            );
          case 'contact':
            return (
              <div key={i} style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>
                {block.text}
              </div>
            );
          case 'section':
            return (
              <div key={i} style={{ marginTop: '16px', marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#1a56db', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {block.text}
                </div>
                <div style={{ height: '1.5px', background: '#1a56db', marginTop: '3px', opacity: 0.25 }} />
              </div>
            );
          case 'entry':
            return (
              <div key={i} style={{ fontSize: '12px', fontWeight: 600, color: '#222', marginTop: '8px', marginBottom: '2px' }}>
                {block.text}
              </div>
            );
          case 'bullet':
            return (
              <div key={i} style={{ display: 'flex', gap: '7px', fontSize: '11.5px', color: '#333', lineHeight: 1.55, marginBottom: '2px', paddingLeft: '4px' }}>
                <span style={{ flexShrink: 0, marginTop: '1px', color: '#1a56db' }}>•</span>
                <span>{block.text}</span>
              </div>
            );
          case 'paragraph':
            return (
              <div key={i} style={{ fontSize: '11.5px', color: '#333', lineHeight: 1.6, marginBottom: '3px' }}>
                {block.text}
              </div>
            );
          case 'spacer':
            return <div key={i} style={{ height: '6px' }} />;
        }
      })}
    </div>
  );
}

// ── Cover letter preview renderer ─────────────────────────────────────────────

function CoverLetterPreview({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div style={docStyle}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={i} style={{ height: '10px' }} />;

        // Date line (first non-empty line)
        const firstContentIdx = lines.findIndex((l) => l.trim());
        if (i === firstContentIdx) {
          return (
            <div key={i} style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>
              {trimmed}
            </div>
          );
        }

        // Salutation
        if (/^dear\b/i.test(trimmed)) {
          return (
            <div key={i} style={{ fontSize: '12px', fontWeight: 600, color: '#222', marginBottom: '10px' }}>
              {trimmed}
            </div>
          );
        }

        // Closing (Sincerely / Best regards / Yours)
        if (/^(sincerely|best regards|yours|kind regards|warm regards|respectfully)/i.test(trimmed)) {
          return (
            <div key={i} style={{ fontSize: '12px', color: '#333', marginTop: '16px', marginBottom: '2px' }}>
              {trimmed}
            </div>
          );
        }

        // Regular paragraph
        return (
          <div key={i} style={{ fontSize: '12px', color: '#333', lineHeight: 1.7, marginBottom: '4px' }}>
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function DocumentPreview({
  content,
  type,
}: {
  content: string;
  type: 'resume' | 'cover-letter';
}) {
  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={() => downloadAsPDF(content, type)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '5px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', background: '#fff',
            fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <Printer size={12} /> Download PDF
        </button>
      </div>

      {/* Document */}
      <div style={{
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        background: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        maxHeight: '420px',
        overflowY: 'auto',
      }}>
        {type === 'resume'
          ? <ResumePreview content={content} />
          : <CoverLetterPreview content={content} />}
      </div>
    </div>
  );
}

// ── Diff view ─────────────────────────────────────────────────────────────────

type DiffLine = { type: 'equal' | 'added' | 'removed'; text: string };

function diffLines(original: string, modified: string): DiffLine[] {
  const a = original.split('\n');
  const b = modified.split('\n');
  const m = a.length;
  const n = b.length;

  // Build LCS table (bottom-up)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const result: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      result.push({ type: 'equal', text: a[i] });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'added', text: b[j] });
      j++;
    } else {
      result.push({ type: 'removed', text: a[i] });
      i++;
    }
  }
  return result;
}

export function ResumeDiff({ original, modified }: { original: string; modified: string }) {
  const lines = diffLines(original, modified);
  const added   = lines.filter((l) => l.type === 'added').length;
  const removed = lines.filter((l) => l.type === 'removed').length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'center',
        marginBottom: '8px', fontSize: '11px', fontWeight: 600,
      }}>
        <span style={{ color: '#15803D' }}>+{added} added</span>
        <span style={{ color: '#B91C1C' }}>−{removed} removed</span>
        <span style={{ color: '#94A3B8', fontWeight: 400 }}>lines vs your original CV</span>
      </div>

      {/* Diff body */}
      <div style={{
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        background: '#fff',
        maxHeight: '420px',
        overflowY: 'auto',
        fontFamily: "'Inter', monospace",
        fontSize: '11.5px',
        lineHeight: 1.65,
      }}>
        {lines.map((line, i) => {
          const isAdded   = line.type === 'added';
          const isRemoved = line.type === 'removed';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                background: isAdded ? '#F0FDF4' : isRemoved ? '#FEF2F2' : 'transparent',
                borderLeft: `3px solid ${isAdded ? '#10B981' : isRemoved ? '#EF4444' : 'transparent'}`,
                padding: '1px 12px 1px 8px',
                minHeight: '20px',
              }}
            >
              <span style={{
                width: '16px', flexShrink: 0, fontWeight: 700,
                color: isAdded ? '#10B981' : isRemoved ? '#EF4444' : 'transparent',
                userSelect: 'none',
              }}>
                {isAdded ? '+' : isRemoved ? '−' : ' '}
              </span>
              <span style={{
                color: isAdded ? '#14532D' : isRemoved ? '#7F1D1D' : '#374151',
                textDecoration: isRemoved ? 'line-through' : 'none',
                opacity: isRemoved ? 0.7 : 1,
                wordBreak: 'break-word',
                flex: 1,
              }}>
                {line.text || '\u00A0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const docStyle: React.CSSProperties = {
  padding: '28px 32px',
  fontFamily: "'Inter', -apple-system, sans-serif",
  minHeight: '400px',
};
