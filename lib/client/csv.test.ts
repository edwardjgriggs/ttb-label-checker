import { describe, it, expect } from 'vitest';
import { parseExpectedCsv } from './csv';

const CSV = `filename,brand_name,class_type,alcohol_percent,net_contents
valid.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45,750 mL
"comma, brand.png","Quoted, Name Co.",,40,
abv-mismatch.png,Riverbend,,38.5,375 mL`;

describe('parseExpectedCsv', () => {
  it('parses rows keyed by lowercase filename', () => {
    const m = parseExpectedCsv(CSV);
    expect(m.get('valid.png')).toEqual({
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholPercent: 45,
      netContents: '750 mL',
    });
  });
  it('handles quoted cells with commas and empty cells', () => {
    const row = parseExpectedCsv(CSV).get('comma, brand.png');
    expect(row?.brandName).toBe('Quoted, Name Co.');
    expect(row?.classType).toBeUndefined();
    expect(row?.alcoholPercent).toBe(40);
  });
  it('parses decimal ABV', () => {
    expect(parseExpectedCsv(CSV).get('abv-mismatch.png')?.alcoholPercent).toBe(38.5);
  });
  it('unescapes "" inside a quoted cell to a literal double quote', () => {
    const text =
      'filename,brand_name,class_type,alcohol_percent,net_contents\nq.png,"Say ""Cheers"" Co.",,,';
    expect(parseExpectedCsv(text).get('q.png')?.brandName).toBe('Say "Cheers" Co.');
  });
  it('parses CRLF input identically to LF', () => {
    const m = parseExpectedCsv(CSV.replace(/\n/g, '\r\n'));
    expect(m.size).toBe(3);
    expect(m.get('valid.png')).toEqual({
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholPercent: 45,
      netContents: '750 mL',
    });
  });
  it('keys uppercase filenames by their lowercase form', () => {
    const text =
      'filename,brand_name,class_type,alcohol_percent,net_contents\nLABEL.PNG,Riverbend,,,';
    expect(parseExpectedCsv(text).get('label.png')?.brandName).toBe('Riverbend');
  });
});
