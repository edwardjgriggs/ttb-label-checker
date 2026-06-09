/** Downscale to maxEdge px and re-encode as JPEG. Keeps requests fast, cheap,
 *  and far under the 4.5MB Vercel body limit. Falls back to the original file on any failure. */
export async function downscaleImage(file: File, maxEdge = 1500): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_000_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85),
    );
  } catch {
    return file;
  }
}
