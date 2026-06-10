import { describe, it, expect } from 'vitest';
import { buildResultsCsv } from './exportCsv';
import type { BatchRow } from '@/lib/types';

// Helpers
function parseRow(line: string): string[] {
  // Simple CSV parser: handles double-quoted fields with escaped inner quotes.
  const cells: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function parseCSV(csv: string): string[][] {
  return csv.split('\n').map(parseRow);
}

const PASS_ROW: BatchRow = {
  fileName: 'valid.png',
  state: 'done',
  verdict: {
    overall: 'pass',
    extracted: null,
    checks: [
      { id: 'brand_name',        label: 'Brand name',         status: 'pass', reason: 'Matches' },
      { id: 'class_type',        label: 'Class & type',       status: 'pass', reason: 'Matches' },
      { id: 'alcohol_content',   label: 'Alcohol content',    status: 'pass', reason: 'Present' },
      { id: 'net_contents',      label: 'Net contents',       status: 'pass', reason: 'Present' },
      { id: 'government_warning',label: 'Government warning', status: 'pass', reason: 'Correct' },
    ],
  },
};

const FAIL_ROW: BatchRow = {
  fileName: 'bad.png',
  state: 'done',
  verdict: {
    overall: 'fail',
    extracted: null,
    checks: [
      { id: 'brand_name',        label: 'Brand name',         status: 'pass',   reason: 'Matches' },
      { id: 'class_type',        label: 'Class & type',       status: 'fail',   reason: 'Mismatch' },
      { id: 'alcohol_content',   label: 'Alcohol content',    status: 'pass',   reason: 'Present' },
      { id: 'net_contents',      label: 'Net contents',       status: 'review', reason: 'Could not read' },
      { id: 'government_warning',label: 'Government warning', status: 'pass',   reason: 'Correct' },
    ],
  },
};

const ERROR_ROW: BatchRow = {
  fileName: 'broken.png',
  state: 'error',
  error: 'Network timeout',
};

describe('buildResultsCsv', () => {
  it('produces a header row with 8 columns', () => {
    const csv = buildResultsCsv([PASS_ROW]);
    const [header] = parseCSV(csv);
    expect(header).toEqual([
      'filename', 'overall', 'brand_name', 'class_type',
      'alcohol_content', 'net_contents', 'government_warning', 'details',
    ]);
  });

  it('pass row: overall=pass, all check columns=pass, details="all checks passed"', () => {
    const csv = buildResultsCsv([PASS_ROW]);
    const [, data] = parseCSV(csv);
    expect(data[0]).toBe('valid.png');
    expect(data[1]).toBe('pass');
    expect(data[2]).toBe('pass'); // brand_name
    expect(data[6]).toBe('pass'); // government_warning
    expect(data[7]).toBe('all checks passed');
  });

  it('fail row: details contains semicolon-joined reasons for non-pass checks', () => {
    const csv = buildResultsCsv([FAIL_ROW]);
    const [, data] = parseCSV(csv);
    expect(data[0]).toBe('bad.png');
    expect(data[1]).toBe('fail');
    expect(data[3]).toBe('fail');   // class_type
    expect(data[5]).toBe('review'); // net_contents
    expect(data[7]).toBe('Mismatch; Could not read');
  });

  it('error row: overall=error, check columns empty, details=error message', () => {
    const csv = buildResultsCsv([ERROR_ROW]);
    const [, data] = parseCSV(csv);
    expect(data[0]).toBe('broken.png');
    expect(data[1]).toBe('error');
    expect(data[2]).toBe(''); // brand_name empty
    expect(data[7]).toBe('Network timeout');
  });

  it('wraps every cell in double quotes', () => {
    const csv = buildResultsCsv([PASS_ROW]);
    const rawLines = csv.split('\n');
    for (const line of rawLines) {
      // Every cell must start and end with a quote
      for (const cell of line.split(/(?<="),(?=")/)) {
        expect(cell.startsWith('"')).toBe(true);
        expect(cell.endsWith('"')).toBe(true);
      }
    }
  });

  it('escapes double quotes inside a cell by doubling them', () => {
    const rowWithQuote: BatchRow = {
      fileName: 'say-"cheers".png',
      state: 'error',
      error: 'Failed: "unexpected" response',
    };
    const csv = buildResultsCsv([rowWithQuote]);
    const [, data] = parseCSV(csv);
    expect(data[0]).toBe('say-"cheers".png');
    expect(data[7]).toBe('Failed: "unexpected" response');
  });

  it('handles multiple rows in order', () => {
    const csv = buildResultsCsv([PASS_ROW, ERROR_ROW, FAIL_ROW]);
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(4); // header + 3 data rows
    expect(rows[1][0]).toBe('valid.png');
    expect(rows[2][0]).toBe('broken.png');
    expect(rows[3][0]).toBe('bad.png');
  });
});
