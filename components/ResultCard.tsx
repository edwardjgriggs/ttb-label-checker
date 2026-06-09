import type { Verdict } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function ResultCard({ verdict, fileName, previewUrl }: { verdict: Verdict; fileName: string; previewUrl?: string }) {
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs are not supported by next/image */}
      {previewUrl && <img src={previewUrl} alt={'Label image: ' + fileName} className="mb-4 max-h-64 w-full rounded-lg border border-gray-200 bg-white object-contain" />}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="truncate text-2xl font-bold text-gray-900">{fileName}</h2>
        <StatusBadge status={verdict.overall} />
      </div>
      <ul className="divide-y divide-gray-100">
        {verdict.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-4 py-3">
            <span
              aria-hidden
              className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${
                c.status === 'pass' ? 'bg-green-600' : c.status === 'fail' ? 'bg-red-600' : 'bg-amber-500'
              }`}
            >
              {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✕' : '!'}
            </span>
            <div>
              <p className="text-lg font-semibold text-gray-900">{c.label}</p>
              <p className="text-lg text-gray-600">{c.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
