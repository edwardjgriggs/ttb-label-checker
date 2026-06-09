import { describe, it, expect, vi } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: class { chat = { completions: { create } }; constructor(_: unknown) {} },
}));

import { OpenAIProvider } from './openai';
import { EXTRACTION_PROMPT } from './prompt';

describe('OpenAIProvider', () => {
  it('throws without api key', () => {
    expect(() => new OpenAIProvider('')).toThrow(/OPENAI_API_KEY/);
  });
  it('parses a valid extraction response', async () => {
    const payload = {
      legible: true, brandName: 'X', classType: 'Y', alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      warning: { present: true, text: 'GOVERNMENT WARNING: ...', headerBold: null },
    };
    create.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(payload) } }] });
    const p = new OpenAIProvider('sk-test');
    await expect(p.extract('aGVsbG8=', 'image/jpeg')).resolves.toEqual(payload);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o',
      temperature: 0,
      response_format: expect.objectContaining({
        type: 'json_schema',
        json_schema: expect.objectContaining({ strict: true }),
      }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system', content: EXTRACTION_PROMPT }),
      ]),
    }));
  });
  it('throws on empty response', async () => {
    create.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });
    const p = new OpenAIProvider('sk-test');
    await expect(p.extract('aGVsbG8=', 'image/jpeg')).rejects.toThrow(/empty/i);
  });
});
