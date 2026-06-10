'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BatchRow, ExpectedValues, Verdict } from '@/lib/types';
import { downscaleImage } from '@/lib/client/downscale';
import { runPool } from '@/lib/client/pool';
import { parseExpectedCsv } from '@/lib/client/csv';
import { ResultCard } from '@/components/ResultCard';
import { BatchTable } from '@/components/BatchTable';

async function verifyOne(file: File, expected?: ExpectedValues): Promise<Verdict> {
  const image = await downscaleImage(file);
  const form = new FormData();
  form.append('image', image, file.name);
  if (expected && Object.keys(expected).length) form.append('expected', JSON.stringify(expected));
  const res = await fetch('/api/verify', { method: 'POST', body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as Verdict;
}

export default function Home() {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [csvMap, setCsvMap] = useState<Map<string, ExpectedValues> | null>(null);
  const [singleExpected, setSingleExpected] = useState<ExpectedValues>({});
  const [sampleError, setSampleError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks blob URLs for the active batch so they can be revoked on next batch or unmount.
  const previewUrlsRef = useRef<string[]>([]);

  // Revoke all active preview URLs on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFiles = useCallback(
    async (files: File[], csvOverride?: Map<string, ExpectedValues>) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (!images.length || busy) return;
      setBusy(true);

      // Revoke previous batch's URLs before creating new ones.
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      const newPreviewUrls = images.map((f) => URL.createObjectURL(f));
      previewUrlsRef.current = newPreviewUrls;

      setRows(images.map((f, idx) => ({ fileName: f.name, state: 'pending' as const, previewUrl: newPreviewUrls[idx] })));

      // Use csvOverride when provided (e.g. from sample buttons) to avoid the
      // stale-closure problem: calling setCsvMap then handleFiles in the same
      // tick would read the old csvMap from this callback's closure.
      const map = csvOverride ?? csvMap;

      const expectedFor = (f: File): ExpectedValues | undefined =>
        images.length === 1
          ? Object.values(singleExpected).some((v) => v !== undefined) ? singleExpected : undefined
          : map?.get(f.name.toLowerCase());

      await runPool(images, 5, async (file, i) => {
        try {
          const verdict = await verifyOne(file, expectedFor(file));
          setRows((rs) => rs.map((r, j) => (j === i ? { ...r, state: 'done', verdict } : r)));
        } catch (err) {
          setRows((rs) =>
            rs.map((r, j) => (j === i ? { ...r, state: 'error', error: (err as Error).message } : r)),
          );
        }
      });
      setBusy(false);
    },
    [busy, csvMap, singleExpected],
  );

  const onCsv = async (file: File) => setCsvMap(parseExpectedCsv(await file.text()));

  const single = rows.length === 1 ? rows[0] : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="mb-8 text-xl text-bark">
        Drop a label photo below. We check the brand name, alcohol content, net contents, and the
        government warning - and tell you exactly what passed and what didn&apos;t.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload label images"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (e.key === ' ') e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles([...e.dataTransfer.files]); }}
        className={`mb-6 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-4 border-dashed p-8 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2 ${
          dragOver
            ? 'border-bark bg-parchment'
            : 'border-bark/40 bg-white hover:border-bark hover:bg-parchment'
        }`}
      >
        <p className="text-2xl font-semibold text-ink">
          {busy ? 'Checking…' : 'Drop label photos here'}
        </p>
        <p className="mt-2 text-xl text-bark">or click to choose files - one label or hundreds</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { handleFiles([...(e.target.files ?? [])]); e.target.value = ''; }}
        />
      </div>

      {!busy && (
        <div className="mb-6">
          <p className="mb-2 text-base text-bark">No files handy? Run a built-in sample:</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                setSampleError(null);
                try {
                  const blob = await fetch('/samples/valid.png').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); });
                  await handleFiles([new File([blob], 'valid.png', { type: 'image/png' })]);
                } catch (err) {
                  setSampleError((err as Error).message);
                }
              }}
              disabled={busy}
              className="rounded-lg border border-bark bg-white px-5 py-3 text-lg text-bark hover:bg-parchment disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
            >
              Try a clean label
            </button>
            <button
              onClick={async () => {
                setSampleError(null);
                try {
                  const blob = await fetch('/samples/titlecase-warning.png').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); });
                  await handleFiles([new File([blob], 'titlecase-warning.png', { type: 'image/png' })]);
                } catch (err) {
                  setSampleError((err as Error).message);
                }
              }}
              disabled={busy}
              className="rounded-lg border border-bark bg-white px-5 py-3 text-lg text-bark hover:bg-parchment disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
            >
              Try a problem label
            </button>
            <button
              onClick={async () => {
                setSampleError(null);
                try {
                  const names = ['valid.png', 'titlecase-warning.png', 'missing-warning.png', 'wrong-wording.png', 'no-abv.png', 'riverbend.png'];
                  const [csvText, ...blobs] = await Promise.all([
                    fetch('/samples/batch.csv').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }),
                    ...names.map((n) => fetch(`/samples/${n}`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })),
                  ]);
                  const parsedMap = parseExpectedCsv(csvText as string);
                  setCsvMap(parsedMap);
                  const files = (blobs as Blob[]).map((b, i) => new File([b], names[i], { type: 'image/png' }));
                  await handleFiles(files, parsedMap);
                } catch (err) {
                  setSampleError((err as Error).message);
                }
              }}
              disabled={busy}
              className="rounded-lg border border-bark bg-white px-5 py-3 text-lg text-bark hover:bg-parchment disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
            >
              Try a batch of 6
            </button>
          </div>
          {sampleError && (
            <p className="mt-2 text-base font-semibold text-red-700">{sampleError}</p>
          )}
        </div>
      )}

      <details className="mb-8 rounded-xl border border-bark/20 bg-white p-5">
        <summary className="cursor-pointer text-xl font-semibold text-bark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2">
          Optional: check against application values
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-lg text-bark">
            For a single label, type the application values. For a batch, upload a CSV with columns:
            <code className="mx-1 rounded bg-parchment px-1">filename, brand_name, class_type, alcohol_percent, net_contents</code>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-bark/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
              placeholder="Brand name"
              onChange={(e) => setSingleExpected((s) => ({ ...s, brandName: e.target.value || undefined }))}
            />
            <input
              className="rounded-lg border border-bark/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
              placeholder="Alcohol % (e.g. 45)"
              inputMode="decimal"
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setSingleExpected((s) => ({ ...s, alcoholPercent: Number.isNaN(n) ? undefined : n }));
              }}
            />
            <input
              className="rounded-lg border border-bark/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
              placeholder="Class/type"
              onChange={(e) => setSingleExpected((s) => ({ ...s, classType: e.target.value || undefined }))}
            />
            <input
              className="rounded-lg border border-bark/40 p-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
              placeholder="Net contents (e.g. 750 mL)"
              onChange={(e) => setSingleExpected((s) => ({ ...s, netContents: e.target.value || undefined }))}
            />
          </div>
          <label className="block text-lg text-ink">
            Batch CSV:{' '}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
              className="text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2"
            />
            {csvMap && <span className="ml-2 font-semibold text-green-700">{csvMap.size} rows loaded</span>}
          </label>
        </div>
      </details>

      {single?.state === 'pending' && (
        <p className="text-2xl font-semibold text-bark">Reading the label…</p>
      )}
      {single?.state === 'error' && (
        <p className="rounded-xl bg-red-50 p-5 text-xl font-semibold text-red-800">{single.error}</p>
      )}
      {single?.state === 'done' && single.verdict && (
        <ResultCard verdict={single.verdict} fileName={single.fileName} previewUrl={single.previewUrl} />
      )}
      {rows.length > 1 && <BatchTable rows={rows} />}
    </main>
  );
}
