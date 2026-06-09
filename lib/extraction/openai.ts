import OpenAI from 'openai';
import type { ExtractedLabel } from '@/lib/types';
import type { ExtractionProvider } from './provider';
import { EXTRACTION_PROMPT, EXTRACTION_SCHEMA } from './prompt';

export class OpenAIProvider implements ExtractionProvider {
  private client: OpenAI;

  constructor(apiKey: string | undefined = process.env.OPENAI_API_KEY) {
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    this.client = new OpenAI({ apiKey });
  }

  async extract(imageBase64: string, mimeType: string): Promise<ExtractedLabel> {
    const res = await this.client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'label_extraction', strict: true, schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown> },
      },
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } }],
        },
      ],
    });
    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error('Empty extraction response from model');
    return JSON.parse(content) as ExtractedLabel;
  }
}
