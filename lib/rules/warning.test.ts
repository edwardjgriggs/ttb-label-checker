import { describe, it, expect } from 'vitest';
import { checkGovernmentWarning } from './warning';
import { WARNING_HEADER, WARNING_BODY } from './constants';
import type { WarningExtraction } from '@/lib/types';

const good = (over: Partial<WarningExtraction> = {}): WarningExtraction => ({
  present: true,
  text: `${WARNING_HEADER} ${WARNING_BODY}`,
  headerBold: true,
  ...over,
});

describe('checkGovernmentWarning', () => {
  it('passes exact warning', () => {
    expect(checkGovernmentWarning(good()).status).toBe('pass');
  });
  it('fails when missing', () => {
    const r = checkGovernmentWarning(good({ present: false, text: null }));
    expect(r.status).toBe('fail');
    expect(r.reason).toMatch(/missing/i);
  });
  it('fails title-case header (the Jenny catch)', () => {
    const r = checkGovernmentWarning(good({ text: `Government Warning: ${WARNING_BODY}` }));
    expect(r.status).toBe('fail');
    expect(r.reason).toMatch(/capital/i);
  });
  it('fails wrong wording', () => {
    const r = checkGovernmentWarning(good({
      text: `${WARNING_HEADER} ${WARNING_BODY.replace('birth defects', 'health issues')}`,
    }));
    expect(r.status).toBe('fail');
    expect(r.reason).toMatch(/word-for-word/i);
  });
  it('tolerates curly apostrophes and line breaks (no false fail)', () => {
    const curly = `${WARNING_HEADER}\n${WARNING_BODY}`.replace(/'/g, '’');
    expect(checkGovernmentWarning(good({ text: curly })).status).toBe('pass');
  });
  it('downgrades to review when bold reported false', () => {
    const r = checkGovernmentWarning(good({ headerBold: false }));
    expect(r.status).toBe('review');
    expect(r.reason).toMatch(/bold/i);
  });
  it('passes when bold is unknown (null)', () => {
    expect(checkGovernmentWarning(good({ headerBold: null })).status).toBe('pass');
  });
});
