import type { BatchRow } from '@/lib/types';

/** Wrap a value in double quotes, escaping inner double quotes by doubling them.
 *  Prefixes with a single quote if the value starts with a formula-trigger character
 *  (=, +, -, @, tab, CR) to prevent CSV formula injection in Excel/Sheets (OWASP). */
function q(value: string): string {
  // CSV formula injection guard: neutralize leading formula trigger characters
  const sanitized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from batch results.
 *
 * Columns: filename, overall, brand_name, class_type, alcohol_content,
 *          net_contents, government_warning, details
 *
 * - Error rows: overall="error", details=error message, check columns empty.
 * - Pending rows: overall="pending", all other columns empty.
 * - Done rows: per-check status by check id, details = semicolon-joined
 *   reasons of non-pass checks (or "all checks passed").
 */
export function buildResultsCsv(rows: BatchRow[]): string {
  const header = [
    'filename',
    'overall',
    'brand_name',
    'class_type',
    'alcohol_content',
    'net_contents',
    'government_warning',
    'details',
  ]
    .map(q)
    .join(',');

  const dataRows = rows.map((row) => {
    if (row.state === 'error') {
      return [q(row.fileName), q('error'), q(''), q(''), q(''), q(''), q(''), q(row.error ?? '')].join(',');
    }
    if (row.state === 'pending' || !row.verdict) {
      return [q(row.fileName), q('pending'), q(''), q(''), q(''), q(''), q(''), q('')].join(',');
    }

    const { verdict } = row;
    const byId = Object.fromEntries(verdict.checks.map((c) => [c.id, c]));

    const brandName = byId['brand_name']?.status ?? '';
    const classType = byId['class_type']?.status ?? '';
    const alcoholContent = byId['alcohol_content']?.status ?? '';
    const netContents = byId['net_contents']?.status ?? '';
    const govWarning = byId['government_warning']?.status ?? '';

    const nonPassReasons = verdict.checks
      .filter((c) => c.status !== 'pass')
      .map((c) => c.reason);
    const details = nonPassReasons.length > 0 ? nonPassReasons.join('; ') : 'all checks passed';

    return [
      q(row.fileName),
      q(verdict.overall),
      q(brandName),
      q(classType),
      q(alcoholContent),
      q(netContents),
      q(govWarning),
      q(details),
    ].join(',');
  });

  return [header, ...dataRows].join('\n');
}
