import type { CheckResult } from '@/lib/types';
import { normalizeLoose } from './normalize';

export function checkField(id: string, label: string, value: string | null, expected?: string): CheckResult {
  if (!value || !value.trim()) {
    return { id, label, status: 'fail', reason: `${label} not found on the label.` };
  }
  if (expected && normalizeLoose(value) !== normalizeLoose(expected)) {
    return { id, label, status: 'review', reason: `Label shows "${value}", application says "${expected}" - needs a human look.` };
  }
  return { id, label, status: 'pass', reason: `${label} present: "${value}".` };
}
