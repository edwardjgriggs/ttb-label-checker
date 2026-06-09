'use client';

import { useState } from 'react';
import type { Verdict } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ResultCard } from './ResultCard';

export interface BatchRow {
  fileName: string;
  state: 'pending' | 'done' | 'error';
  verdict?: Verdict;
  error?: string;
}

export function BatchTable({ rows }: { rows: BatchRow[] }) {
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);

  const doneCount = rows.filter((r) => r.state !== 'pending').length;
  const visible = rows
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => !problemsOnly || row.state === 'error' || (row.verdict && row.verdict.overall !== 'pass'));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xl font-semibold text-gray-700">
          {doneCount} of {rows.length} checked
        </p>
        <label className="flex cursor-pointer items-center gap-3 text-xl">
          <input
            type="checkbox"
            checked={problemsOnly}
            onChange={(e) => setProblemsOnly(e.target.checked)}
            className="h-6 w-6"
          />
          Show only problems
        </label>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-gray-300 text-xl text-gray-600">
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
              className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
              onClick={() => setOpenRow(openRow === i ? null : i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.key === ' ') e.preventDefault();
                  setOpenRow(openRow === i ? null : i);
                }
              }}
            >
              <td className="py-4 pr-4 text-xl font-medium text-gray-900">
                {row.fileName}
                {openRow === i && row.verdict && (
                  <div className="mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                    <ResultCard verdict={row.verdict} fileName={row.fileName} />
                  </div>
                )}
              </td>
              <td className="py-4 align-top">
                {row.state === 'pending' && <span className="text-xl text-gray-400">Checking…</span>}
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
