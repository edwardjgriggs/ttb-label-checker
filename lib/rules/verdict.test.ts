import { describe, it, expect } from 'vitest';
import { composeOverall, buildVerdict, makeReviewVerdict } from './verdict';
import { WARNING_HEADER, WARNING_BODY } from './constants';
import type { ExtractedLabel } from '@/lib/types';

const goodLabel = (over: Partial<ExtractedLabel> = {}): ExtractedLabel => ({
  legible: true,
  brandName: 'OLD TOM DISTILLERY',
  classType: 'Kentucky Straight Bourbon Whiskey',
  alcoholContent: '45% Alc./Vol. (90 Proof)',
  netContents: '750 mL',
  warning: { present: true, text: `${WARNING_HEADER} ${WARNING_BODY}`, headerBold: true },
  ...over,
});

describe('composeOverall', () => {
  const c = (status: 'pass' | 'fail' | 'review') => ({ id: 'x', label: 'X', status, reason: '' });
  it('fail beats review beats pass', () => {
    expect(composeOverall([c('pass'), c('review'), c('fail')])).toBe('fail');
    expect(composeOverall([c('pass'), c('review')])).toBe('review');
    expect(composeOverall([c('pass'), c('pass')])).toBe('pass');
  });
  it('returns review for empty checks (zero evaluated checks is not a pass)', () => {
    expect(composeOverall([])).toBe('review');
  });
});

describe('buildVerdict', () => {
  it('passes a fully valid label with no expected values', () => {
    const v = buildVerdict(goodLabel());
    expect(v.overall).toBe('pass');
    expect(v.checks).toHaveLength(5);
  });
  it('fails when warning missing', () => {
    const v = buildVerdict(goodLabel({ warning: { present: false, text: null, headerBold: null } }));
    expect(v.overall).toBe('fail');
  });
  it('applies expected values', () => {
    const v = buildVerdict(goodLabel(), { brandName: 'Different Brand Co', alcoholPercent: 45 });
    expect(v.checks.find((c) => c.id === 'brand')?.status).toBe('fail');
  });
  it('returns all-review when not legible', () => {
    const v = buildVerdict(goodLabel({ legible: false }));
    expect(v.overall).toBe('review');
    expect(v.checks[0].reason).toMatch(/read/i);
  });
});

describe('makeReviewVerdict', () => {
  it('builds a review verdict with null extraction', () => {
    const v = makeReviewVerdict('Could not process.');
    expect(v.overall).toBe('review');
    expect(v.extracted).toBeNull();
  });
});
