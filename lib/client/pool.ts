/** Run worker over items with bounded concurrency. Worker errors are swallowed -
 *  per-item error handling belongs inside the worker (each batch row owns its own failure). */
export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        await worker(items[i], i);
      } catch {
        // worker is responsible for reporting its own failures
      }
    }
  });
  await Promise.all(lanes);
}
