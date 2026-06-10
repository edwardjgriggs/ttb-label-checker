'use client';

import { useState } from 'react';
import type { BatchRow } from '@/lib/types';
import { buildResultsCsv } from '@/lib/client/exportCsv';
import { StatusBadge } from './StatusBadge';
import { ResultCard } from './ResultCard';

// Re-export so existing imports from this module continue to work.
export type { BatchRow };

export function BatchTable({ rows }: { rows: BatchRow[] }) {
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);

  const visible = rows
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => !problemsOnly || row.state === 'error' || (row.verdict && row.verdict.overall !== 'pass'));

  // Derive summary counts from rows — no new state, updates mid-stream as rows land.
  const failCount = rows.filter((r) => r.verdict?.overall === 'fail').length;
  const reviewCount = rows.filter((r) => r.verdict?.overall === 'review').length;
  const passCount = rows.filter((r) => r.verdict?.overall === 'pass').length;
  const errorCount = rows.filter((r) => r.state === 'error').length;
  const pendingCount = rows.filter((r) => r.state === 'pending').length;

  const summarySegments: React.ReactNode[] = [];
  if (failCount > 0) summarySegments.push(<span key="fail" className="text-red-700 font-bold">{failCount} Fail</span>);
  if (reviewCount > 0) summarySegments.push(<span key="review" className="text-amber-600 font-bold">{reviewCount} Needs Review</span>);
  if (passCount > 0) summarySegments.push(<span key="pass" className="text-green-700 font-bold">{passCount} Pass</span>);
  if (errorCount > 0) summarySegments.push(<span key="error" className="text-bark font-bold">{errorCount} Errors</span>);
  if (pendingCount > 0) summarySegments.push(<span key="pending" className="text-bark">{pendingCount} still checking</span>);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xl text-ink">
          {summarySegments.reduce<React.ReactNode[]>((acc, seg, idx) => {
            if (idx > 0) acc.push(<span key={`dot-${idx}`} className="mx-2 text-bark">&middot;</span>);
            acc.push(seg);
            return acc;
          }, [])}
        </p>
        <div className="flex items-center gap-4">
          <button
            disabled={rows.some((r) => r.state === 'pending')}
            onClick={() => {
              const csv = buildResultsCsv(rows);
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = 'label-check-results.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-bark bg-white px-4 py-2 text-lg text-bark hover:bg-parchment disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
          >
            Download results CSV
          </button>
          <label className="flex cursor-pointer items-center gap-3 text-xl text-ink">
            <input
              type="checkbox"
              checked={problemsOnly}
              onChange={(e) => setProblemsOnly(e.target.checked)}
              className="h-6 w-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
            />
            Show only problems
          </label>
        </div>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-bark/30 text-xl text-bark">
            <th className="py-3 pr-4">Label</th>
            <th className="py-3">Result</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ row, i }) => (
            <tr
              key={row.fileName + i}
              tabIndex={0}
              role="button"
              aria-expanded={openRow === i}
              className="cursor-pointer border-b border-bark/20 hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-inset"
              onClick={() => setOpenRow(openRow === i ? null : i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.key === ' ') e.preventDefault();
                  setOpenRow(openRow === i ? null : i);
                }
              }}
            >
              <td className="py-4 pr-4 text-xl font-medium text-ink">
                <span className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs are not supported by next/image */}
                  {row.previewUrl && <img src={row.previewUrl} alt="" className="mr-3 inline-block h-12 w-12 rounded border border-bark/20 bg-white object-contain align-middle" />}
                  {row.fileName}
                </span>
                {openRow === i && row.verdict && (
                  <div className="mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                    <ResultCard verdict={row.verdict} fileName={row.fileName} previewUrl={row.previewUrl} />
                  </div>
                )}
              </td>
              <td className="py-4 align-top">
                {row.state === 'pending' && <span className="text-xl text-bark">Checking…</span>}
                {row.state === 'error' && <span className="text-xl font-semibold text-red-700">{row.error}</span>}
                {row.state === 'done' && row.verdict && <StatusBadge status={row.verdict.overall} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
