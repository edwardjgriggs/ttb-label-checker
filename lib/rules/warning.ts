import type { CheckResult, WarningExtraction } from '@/lib/types';
import { normalizeText } from './normalize';
import { WARNING_HEADER, WARNING_BODY } from './constants';

const BASE = { id: 'warning', label: 'Government Warning' };

export function checkGovernmentWarning(w: WarningExtraction): CheckResult {
  if (!w.present || !w.text) {
    return { ...BASE, status: 'fail', reason: 'The required government warning statement is missing from the label.' };
  }
  const text = normalizeText(w.text);

  if (!text.toUpperCase().startsWith(WARNING_HEADER)) {
    return { ...BASE, status: 'fail', reason: 'The statement must begin with "GOVERNMENT WARNING:" - the required header was not found.' };
  }
  if (!text.startsWith(WARNING_HEADER)) {
    return { ...BASE, status: 'fail', reason: 'The "GOVERNMENT WARNING:" header must be in all capital letters.' };
  }

  const body = text.slice(WARNING_HEADER.length).trim();
  if (body.toLowerCase() !== WARNING_BODY.toLowerCase()) {
    return { ...BASE, status: 'fail', reason: 'The warning text must match the required statement word-for-word, and it does not.' };
  }

  if (w.headerBold === false) {
    return { ...BASE, status: 'review', reason: 'Wording is correct, but the "GOVERNMENT WARNING:" header may not be in bold type - please verify visually.' };
  }
  return { ...BASE, status: 'pass', reason: 'Required warning present, word-for-word, header in caps.' };
}
