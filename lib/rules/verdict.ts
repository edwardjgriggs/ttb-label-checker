import type { CheckResult, CheckStatus, ExpectedValues, ExtractedLabel, Verdict } from '@/lib/types';
import { checkGovernmentWarning } from './warning';
import { checkAlcoholContent } from './alcohol';
import { checkBrandName } from './brand';
import { checkField } from './presence';

export function composeOverall(checks: CheckResult[]): CheckStatus {
  if (checks.length === 0) return 'review'; // defensive: zero evaluated checks is not a passing label
  if (checks.some((c) => c.status === 'fail')) return 'fail';
  if (checks.some((c) => c.status === 'review')) return 'review';
  return 'pass';
}

export function buildVerdict(extracted: ExtractedLabel, expected?: ExpectedValues): Verdict {
  if (!extracted.legible) {
    return {
      overall: 'review',
      checks: [{
        id: 'legibility', label: 'Image Quality', status: 'review',
        reason: "Couldn't read the label clearly - please re-upload a sharper, better-lit photo.",
      }],
      extracted,
    };
  }
  const checks: CheckResult[] = [
    checkBrandName(extracted.brandName, expected?.brandName),
    checkField('classType', 'Class/Type', extracted.classType, expected?.classType),
    checkAlcoholContent(extracted.alcoholContent, expected?.alcoholPercent),
    checkField('netContents', 'Net Contents', extracted.netContents, expected?.netContents),
    checkGovernmentWarning(extracted.warning),
  ];
  return { overall: composeOverall(checks), checks, extracted };
}

export function makeReviewVerdict(reason: string): Verdict {
  return {
    overall: 'review',
    checks: [{ id: 'processing', label: 'Processing', status: 'review', reason }],
    extracted: null,
  };
}
