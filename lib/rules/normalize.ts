const PUNCT: Record<string, string> = {
  '‘': "'", '’': "'", '“': '"', '”': '"',
  '–': '-', '—': '-',
};

export function normalizeText(s: string): string {
  return s
    .replace(/[‘’“”–—]/g, (c) => PUNCT[c])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Loose key for human-equivalent comparison: case, punctuation, spacing ignored. */
export function normalizeLoose(s: string): string {
  return normalizeText(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}
