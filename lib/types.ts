export interface ExpectedValues {
  brandName?: string;
  classType?: string;
  alcoholPercent?: number;
  netContents?: string;
}

export interface WarningExtraction {
  present: boolean;
  text: string | null;        // verbatim incl. header, capitalization preserved
  headerBold: boolean | null; // null = model can't tell
}

export interface ExtractedLabel {
  legible: boolean;
  brandName: string | null;
  classType: string | null;
  alcoholContent: string | null; // verbatim, e.g. "45% Alc./Vol. (90 Proof)"
  netContents: string | null;
  warning: WarningExtraction;
}

export type CheckStatus = 'pass' | 'fail' | 'review';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  reason: string;
}

export interface Verdict {
  overall: CheckStatus;
  checks: CheckResult[];
  extracted: ExtractedLabel | null;
}
