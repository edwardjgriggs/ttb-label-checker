import { describe, it, expect } from 'vitest';
import { checkField } from './presence';

describe('checkField', () => {
  it('fails when missing', () => {
    const r = checkField('netContents', 'Net Contents', null);
    expect(r.status).toBe('fail');
  });
  it('fails when whitespace-only', () => {
    const r = checkField('netContents', 'Net Contents', '   ');
    expect(r.status).toBe('fail');
  });
  it('passes presence-only', () => {
    expect(checkField('netContents', 'Net Contents', '750 mL').status).toBe('pass');
  });
  it('passes loose-equal expected', () => {
    expect(checkField('netContents', 'Net Contents', '750 ML', '750 mL').status).toBe('pass');
  });
  it('reviews mismatch vs expected (human judgment, not auto-fail)', () => {
    const r = checkField('classType', 'Class/Type', 'Straight Bourbon', 'Kentucky Straight Bourbon Whiskey');
    expect(r.status).toBe('review');
    expect(r.reason).toContain('Straight Bourbon');
  });
});
