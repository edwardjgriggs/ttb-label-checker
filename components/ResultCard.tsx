import type { Verdict } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

function ExtractedPanel({ verdict }: { verdict: Verdict }) {
  const e = verdict.extracted;
  if (!e) return null;

  const notFound = <span className="text-bark/50 italic">not found</span>;

  const headerBoldLabel =
    e.warning.headerBold === true
      ? 'yes'
      : e.warning.headerBold === false
        ? 'no'
        : 'could not tell';

  return (
    <details className="mt-4 rounded-lg border border-bark/20 p-4">
      <summary className="cursor-pointer text-lg text-bark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2">What the AI read</summary>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
        <dt className="font-semibold text-ink">Brand name</dt>
        <dd className="text-bark">{e.brandName ?? notFound}</dd>

        <dt className="font-semibold text-ink">Class &amp; type</dt>
        <dd className="text-bark">{e.classType ?? notFound}</dd>

        <dt className="font-semibold text-ink">Alcohol content</dt>
        <dd className="text-bark">{e.alcoholContent ?? notFound}</dd>

        <dt className="font-semibold text-ink">Net contents</dt>
        <dd className="text-bark">{e.netContents ?? notFound}</dd>
      </dl>

      <div className="mt-3">
        <p className="text-base font-semibold text-ink">Government warning</p>
        {e.warning.present && e.warning.text
          ? <p className="text-base text-bark italic">{e.warning.text}</p>
          : <p className="text-base text-bark/50 italic">not present</p>}
        <p className="mt-1 text-base text-bark">
          Header bold: {headerBoldLabel}
        </p>
      </div>
    </details>
  );
}

export function ResultCard({ verdict, fileName, previewUrl }: { verdict: Verdict; fileName: string; previewUrl?: string }) {
  return (
    <div className="rounded-xl border-2 border-bark/20 bg-white p-6 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs are not supported by next/image */}
      {previewUrl && <img src={previewUrl} alt={'Label image: ' + fileName} className="mb-4 max-h-64 w-full rounded-lg border border-bark/20 bg-white object-contain" />}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          className="truncate text-2xl font-bold text-ink"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {fileName}
        </h2>
        <StatusBadge status={verdict.overall} />
      </div>
      <ul className="divide-y divide-bark/10">
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
              <p className="text-lg font-semibold text-ink">{c.label}</p>
              <p className="text-lg text-bark">{c.reason}</p>
            </div>
          </li>
        ))}
      </ul>
      <ExtractedPanel verdict={verdict} />
    </div>
  );
}
