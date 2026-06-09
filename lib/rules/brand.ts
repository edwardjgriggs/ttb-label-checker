import type { CheckResult } from '@/lib/types';
import { normalizeLoose } from './normalize';

const BASE = { id: 'brand', label: 'Brand Name' };

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

export function checkBrandName(extracted: string | null, expected?: string): CheckResult {
  if (!extracted || !extracted.trim()) {
    return { ...BASE, status: 'fail', reason: 'No brand name found on the label.' };
  }
  if (!expected) {
    return { ...BASE, status: 'pass', reason: `Brand name present: "${extracted}".` };
  }
  const a = normalizeLoose(extracted);
  const b = normalizeLoose(expected);
  if (a === b) {
    return { ...BASE, status: 'pass', reason: `Brand name matches the application ("${extracted}").` };
  }
  if (levenshtein(a, b) <= 2) {
    return { ...BASE, status: 'review', reason: `Label shows "${extracted}", application says "${expected}" - very close, needs a human look.` };
  }
  return { ...BASE, status: 'fail', reason: `Label shows "${extracted}" but the application says "${expected}".` };
}
