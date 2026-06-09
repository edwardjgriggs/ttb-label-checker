import { NextResponse } from 'next/server';
import { OpenAIProvider } from '@/lib/extraction/openai';
import type { ExtractionProvider } from '@/lib/extraction/provider';
import { buildVerdict, makeReviewVerdict } from '@/lib/rules/verdict';
import { checkRateLimit } from '@/lib/server/rateLimit';
import type { ExpectedValues, ExtractedLabel } from '@/lib/types';

export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// Cached for the instance lifetime; a key revoked after construction won't be detected until instance recycle (accepted prototype trade-off).
let provider: ExtractionProvider | null = null;

export async function POST(req: Request) {
  // Prefer x-real-ip (platform-set); else the LAST x-forwarded-for entry, which is appended by
  // the proxy. The first XFF entry is client-controlled and spoofable for rate-limit cycling.
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? 'local';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests - please wait a moment and try again.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Request must be multipart form data with an image file.' }, { status: 400 });
  }
  const file = form.get('image');

  // FormDataEntryValue is string | File; File extends Blob, so instanceof File is the correct guard.
  if (!(file instanceof File) || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Please upload an image file (JPEG, PNG, WebP, or GIF).' }, { status: 400 });
  }

  const imageFile = file;

  if (imageFile.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is too large (max 6 MB).' }, { status: 413 });
  }

  let expected: ExpectedValues | undefined;
  const rawExpected = form.get('expected');
  if (typeof rawExpected === 'string' && rawExpected) {
    try {
      expected = JSON.parse(rawExpected) as ExpectedValues;
    } catch {
      return NextResponse.json({ error: 'Expected values were not valid JSON.' }, { status: 400 });
    }
  }

  try {
    provider ??= new OpenAIProvider();
  } catch {
    return NextResponse.json(
      { error: 'Verification service is not configured. Contact the administrator.' },
      { status: 503 },
    );
  }

  const imageBase64 = Buffer.from(await imageFile.arrayBuffer()).toString('base64');

  let extracted: ExtractedLabel | null = null;
  for (let attempt = 0; attempt < 2 && !extracted; attempt++) {
    try {
      extracted = await provider.extract(imageBase64, imageFile.type);
    } catch (err) {
      if (attempt === 1) {
        console.error('extraction failed after retry:', err);
        return NextResponse.json(
          makeReviewVerdict('We could not process this image right now - try again, or re-upload a clearer photo.'),
        );
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Safe: the loop either sets extracted or returns the review verdict on attempt 1.
  return NextResponse.json(buildVerdict(extracted!, expected));
}
