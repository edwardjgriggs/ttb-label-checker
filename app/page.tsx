'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpectedValues, Verdict } from '@/lib/types';
import { downscaleImage } from '@/lib/client/downscale';
import { runPool } from '@/lib/client/pool';
import { parseExpectedCsv } from '@/lib/client/csv';
import { ResultCard } from '@/components/ResultCard';
import { BatchTable, type BatchRow } from '@/components/BatchTable';

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
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (!images.length || busy) return;
      setBusy(true);

      // Revoke previous batch's URLs before creating new ones.
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      const newPreviewUrls = images.map((f) => URL.createObjectURL(f));
      previewUrlsRef.current = newPreviewUrls;

      setRows(images.map((f, idx) => ({ fileName: f.name, state: 'pending' as const, previewUrl: newPreviewUrls[idx] })));

      const expectedFor = (f: File): ExpectedValues | undefined =>
        images.length === 1
          ? Object.values(singleExpected).some((v) => v !== undefined) ? singleExpected : undefined
          : csvMap?.get(f.name.toLowerCase());

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
      <h1 className="mb-2 text-4xl font-bold text-gray-900">Label Checker</h1>
      <p className="mb-8 text-xl text-gray-600">
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
        className={`mb-6 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-4 border-dashed p-8 text-center transition ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'
        }`}
      >
        <p className="text-2xl font-semibold text-gray-800">
          {busy ? 'Checking…' : 'Drop label photos here'}
        </p>
        <p className="mt-2 text-xl text-gray-500">or click to choose files - one label or hundreds</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { handleFiles([...(e.target.files ?? [])]); e.target.value = ''; }}
        />
      </div>

      <details className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <summary className="cursor-pointer text-xl font-semibold text-gray-700">
          Optional: check against application values
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-lg text-gray-600">
            For a single label, type the application values. For a batch, upload a CSV with columns:
            <code className="mx-1 rounded bg-gray-100 px-1">filename, brand_name, class_type, alcohol_percent, net_contents</code>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-gray-300 p-3 text-lg"
              placeholder="Brand name"
              onChange={(e) => setSingleExpected((s) => ({ ...s, brandName: e.target.value || undefined }))}
            />
            <input
              className="rounded-lg border border-gray-300 p-3 text-lg"
              placeholder="Alcohol % (e.g. 45)"
              inputMode="decimal"
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setSingleExpected((s) => ({ ...s, alcoholPercent: Number.isNaN(n) ? undefined : n }));
              }}
            />
            <input
              className="rounded-lg border border-gray-300 p-3 text-lg"
              placeholder="Class/type"
              onChange={(e) => setSingleExpected((s) => ({ ...s, classType: e.target.value || undefined }))}
            />
            <input
              className="rounded-lg border border-gray-300 p-3 text-lg"
              placeholder="Net contents (e.g. 750 mL)"
              onChange={(e) => setSingleExpected((s) => ({ ...s, netContents: e.target.value || undefined }))}
            />
          </div>
          <label className="block text-lg text-gray-700">
            Batch CSV:{' '}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
              className="text-lg"
            />
            {csvMap && <span className="ml-2 font-semibold text-green-700">{csvMap.size} rows loaded</span>}
          </label>
        </div>
      </details>

      {single?.state === 'pending' && (
        <p className="text-2xl font-semibold text-gray-500">Reading the label…</p>
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
