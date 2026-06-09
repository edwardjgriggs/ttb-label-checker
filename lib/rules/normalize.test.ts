import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeLoose } from './normalize';

describe('normalizeText', () => {
  it('converts curly quotes and collapses whitespace', () => {
    expect(normalizeText('“Surgeon’s”  General\n test'))
      .toBe('"Surgeon\'s" General test');
  });
  it('converts en/em dashes to hyphens', () => {
    expect(normalizeText('risk — of – defects')).toBe('risk - of - defects');
  });
});

describe('normalizeLoose', () => {
  it('matches possessive/case/punctuation variants', () => {
    expect(normalizeLoose("STONE'S THROW")).toBe(normalizeLoose("Stone's Throw"));
    expect(normalizeLoose('Old  Tom. Distillery')).toBe(normalizeLoose('old tom distillery'));
  });
});
