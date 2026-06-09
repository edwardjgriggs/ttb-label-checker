import { describe, it, expect } from 'vitest';
import { parseAlcoholPercent, checkAlcoholContent } from './alcohol';

describe('parseAlcoholPercent', () => {
  it.each([
    ['45% Alc./Vol. (90 Proof)', 45],
    ['45% ALC/VOL', 45],
    ['Alc. 13.5% by Vol.', 13.5],
    ['Alcohol 40% by Volume', 40],
    ['ALC 5.0% / VOL', 5],
    ['ALC 5.0% VOL', 5],
  ])('parses %s -> %d', (raw, want) => {
    expect(parseAlcoholPercent(raw)).toBe(want);
  });
  it('returns null for junk', () => {
    expect(parseAlcoholPercent('90 Proof only')).toBeNull();
  });
});

describe('checkAlcoholContent', () => {
  it('fails when absent', () => {
    expect(checkAlcoholContent(null).status).toBe('fail');
  });
  it('fails malformed', () => {
    const r = checkAlcoholContent('forty-five percent');
    expect(r.status).toBe('fail');
    expect(r.reason).toMatch(/format/i);
  });
  it('passes well-formed without expected', () => {
    expect(checkAlcoholContent('45% Alc./Vol.').status).toBe('pass');
  });
  it('fails numeric mismatch vs application', () => {
    const r = checkAlcoholContent('40% Alc./Vol.', 45);
    expect(r.status).toBe('fail');
    expect(r.reason).toContain('40');
    expect(r.reason).toContain('45');
  });
  it('passes numeric match vs application', () => {
    expect(checkAlcoholContent('45% Alc./Vol. (90 Proof)', 45).status).toBe('pass');
  });
  it('degrades to presence-check when expected is NaN (poisoned input)', () => {
    expect(checkAlcoholContent('45% Alc./Vol.', NaN as unknown as number).status).toBe('pass');
  });
});
