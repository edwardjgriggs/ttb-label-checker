import type { ExtractedLabel } from '@/lib/types';

export interface ExtractionProvider {
  extract(imageBase64: string, mimeType: string): Promise<ExtractedLabel>;
}
