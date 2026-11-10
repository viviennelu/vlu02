/**
 * Turns a user-supplied file into a displayable, canvas-safe data URL.
 *
 * Strategy:
 * 1. Ask the browser to decode the file as-is. JPEG / PNG / WebP everywhere,
 *    and HEIC in Safari 17+. When this works the original bytes are kept, so
 *    quality is untouched and the browser applies EXIF orientation itself
 *    (both for <img> and for canvas drawImage, which the extractor uses).
 * 2. If native decoding fails and the file is HEIC/HEIF (by MIME, extension or
 *    magic bytes), convert it client-side with libheif (heic-to), loaded on
 *    demand. libheif applies the container's rotation/mirror transforms
 *    (irot/imir), which is where HEIC stores orientation.
 * 3. Anything else gets a clear, user-facing error.
 */

export const ACCEPTED_IMAGE_INPUT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const HEIC_MIME = /^image\/hei[cf](-sequence)?$/i;
const HEIC_EXT = /\.(heic|heif)$/i;
const KNOWN_IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp)$/i;
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

export class ImageDecodeError extends Error {}

export interface DecodedImage {
  src: string;
  width: number;
  height: number;
}

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function decodeNatively(blob: Blob): Promise<DecodedImage> {
  const src = await readAsDataURL(blob);
  const img = new Image();
  img.src = src;
  await img.decode();
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('Empty image');
  return { src, width: img.naturalWidth, height: img.naturalHeight };
}

async function hasHeicSignature(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = String.fromCharCode(...head);
    return ascii.slice(4, 8) === 'ftyp' && HEIC_BRANDS.has(ascii.slice(8, 12));
  } catch {
    return false;
  }
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const heicSignature = await hasHeicSignature(file);
  const looksLikeImage = file.type.startsWith('image/') || KNOWN_IMAGE_EXT.test(file.name) || heicSignature;
  if (!looksLikeImage) {
    throw new ImageDecodeError(`"${file.name}" isn't an image. Try a JPG, PNG, WebP or HEIC photo.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageDecodeError(`"${file.name}" is larger than 50 MB.`);
  }

  try {
    return await decodeNatively(file);
  } catch {
    // Fall through to conversion
  }

  const isHeic = HEIC_MIME.test(file.type) || HEIC_EXT.test(file.name) || heicSignature;
  if (!isHeic) {
    throw new ImageDecodeError(`This browser can't read "${file.name}". Try saving it as JPG or PNG.`);
  }

  try {
    const { heicTo } = await import('heic-to');
    const converted = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });
    return await decodeNatively(converted);
  } catch (err) {
    console.error('HEIC conversion failed', err);
    throw new ImageDecodeError(`Couldn't convert "${file.name}". The HEIC file may be damaged or unsupported.`);
  }
}

/**
 * Downscaled JPEG copy of an image, for places where the full photo would
 * blow the localStorage quota (journal thumbnails, session restore).
 */
export async function createDownscaledCopy(src: string, maxEdge: number, quality = 0.88): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
