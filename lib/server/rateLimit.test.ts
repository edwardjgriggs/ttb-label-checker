import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rateLimit';

describe('checkRateLimit', () => {
  it('allows up to 30 requests per minute then blocks', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 30; i++) expect(checkRateLimit('1.2.3.4', t0 + i)).toBe(true);
    expect(checkRateLimit('1.2.3.4', t0 + 31)).toBe(false);
  });
  it('window slides - old hits expire', () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 30; i++) checkRateLimit('5.6.7.8', t0);
    expect(checkRateLimit('5.6.7.8', t0 + 61_000)).toBe(true);
  });
  it('IPs are independent', () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 30; i++) checkRateLimit('a', t0);
    expect(checkRateLimit('b', t0)).toBe(true);
  });
});
