const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
// Cleared by serverless instance recycling rather than explicit eviction; intentional for a prototype.
const hits = new Map<string, number[]>();

export function checkRateLimit(ip: string, now: number = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
