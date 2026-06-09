import type { CheckResult } from '@/lib/types';

const BASE = { id: 'alcohol', label: 'Alcohol Content' };

// TTB-tolerated phrasings: "45% Alc./Vol.", "Alc. 45% by Vol.", "Alcohol 45% by Volume"
const PATTERNS = [
  /(\d+(?:\.\d+)?)\s*%\s*alc(?:ohol)?\.?\s*(?:\/|by)\s*vol(?:ume)?\.?/i,
  // Separator before "vol" is deliberately optional: real cans print "ALC. 8% VOL." with no "/" or "by".
  /alc(?:ohol)?\.?\s*(\d+(?:\.\d+)?)\s*%\s*(?:\/|by)?\s*vol(?:ume)?\.?/i,
];

export function parseAlcoholPercent(raw: string): number | null {
  for (const p of PATTERNS) {
    const m = raw.match(p);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

export function checkAlcoholContent(raw: string | null, expectedPercent?: number): CheckResult {
  if (!raw) {
    return { ...BASE, status: 'fail', reason: 'No alcohol content statement found on the label.' };
  }
  const pct = parseAlcoholPercent(raw);
  if (pct === null) {
    return { ...BASE, status: 'fail', reason: `"${raw}" is not a recognized alcohol content format (e.g. "45% Alc./Vol.").` };
  }
  // Guard against poisoned expected values (e.g. NaN from bad JSON): degrade to presence-check.
  const hasExpected = typeof expectedPercent === 'number' && !Number.isNaN(expectedPercent);
  if (hasExpected && Math.abs(pct - expectedPercent) > 0.001) {
    return { ...BASE, status: 'fail', reason: `Label shows ${pct}% but the application says ${expectedPercent}%.` };
  }
  return { ...BASE, status: 'pass', reason: `Alcohol content present: ${pct}% Alc./Vol.` };
}
