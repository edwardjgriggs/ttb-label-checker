import type { ExpectedValues } from '@/lib/types';

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  // Trimming quoted fields deviates from RFC 4180 intentionally: these CSVs are
  // hand-curated, so stray padding is more likely than meaningful whitespace.
  return out.map((s) => s.trim());
}

/** Header: filename,brand_name,class_type,alcohol_percent,net_contents */
export function parseExpectedCsv(text: string): Map<string, ExpectedValues> {
  // Quoted cells containing literal newlines are a known unsupported edge:
  // the affected row degrades, other rows are unaffected.
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const map = new Map<string, ExpectedValues>();
  for (const line of lines.slice(1)) {
    const [filename, brand, classType, abv, net] = splitLine(line);
    if (!filename) continue;
    const expected: ExpectedValues = {};
    if (brand) expected.brandName = brand;
    if (classType) expected.classType = classType;
    if (abv && !Number.isNaN(parseFloat(abv))) expected.alcoholPercent = parseFloat(abv);
    if (net) expected.netContents = net;
    map.set(filename.toLowerCase(), expected);
  }
  return map;
}
