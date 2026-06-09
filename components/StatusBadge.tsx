import type { CheckStatus } from '@/lib/types';

const STYLES: Record<CheckStatus, { cls: string; label: string; icon: string }> = {
  pass: { cls: 'bg-green-100 text-green-800 border-green-300', label: 'Pass', icon: '✓' },
  fail: { cls: 'bg-red-100 text-red-800 border-red-300', label: 'Fail', icon: '✕' },
  review: { cls: 'bg-amber-100 text-amber-900 border-amber-300', label: 'Needs Review', icon: '!' },
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-lg font-semibold ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
