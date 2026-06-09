import { describe, it, expect } from 'vitest';
import { checkBrandName, levenshtein } from './brand';

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });
});

describe('checkBrandName', () => {
  it('fails when absent', () => {
    expect(checkBrandName(null).status).toBe('fail');
  });
  it('fails when whitespace-only', () => {
    expect(checkBrandName('   ').status).toBe('fail');
  });
  it('passes presence-only when no expected value', () => {
    expect(checkBrandName('OLD TOM DISTILLERY').status).toBe('pass');
  });
  it('passes the Dave Morrison case (caps/possessive)', () => {
    expect(checkBrandName("STONE'S THROW", "Stone's Throw").status).toBe('pass');
  });
  it('reviews near-miss (1-2 edits)', () => {
    const r = checkBrandName('OLD TOM DISTILERY', 'Old Tom Distillery');
    expect(r.status).toBe('review');
  });
  it('fails clear mismatch', () => {
    const r = checkBrandName('RIVERBEND', 'Old Tom Distillery');
    expect(r.status).toBe('fail');
    expect(r.reason).toContain('RIVERBEND');
  });
});
