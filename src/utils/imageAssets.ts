/**
 * Image import helpers: turn any RGBA image into the TGA sizes HOI4 needs (flags in three sizes, focus icons)
 * and emit the matching .gfx. Pure functions on RGBA buffers so they can be tested; the browser UI feeds them
 * from a canvas.
 */

export interface Rgba {
  width: number;
  height: number;
  /** width * height * 4 bytes, RGBA, row-major, top row first. */
  data: Uint8Array;
}

const NL = String.fromCharCode(10);
const T = String.fromCharCode(9);

/** Area-averaging resize (box filter): good quality for the strong downscales flags need. */
export function resizeRgba(src: Rgba, width: number, height: number): Rgba {
  const out = new Uint8Array(width * height * 4);
  const xRatio = src.width / width;
  const yRatio = src.height / height;
  for (let y = 0; y < height; y++) {
    const y0 = y * yRatio;
    const y1 = Math.min(src.height, (y + 1) * yRatio);
    for (let x = 0; x < width; x++) {
      const x0 = x * xRatio;
      const x1 = Math.min(src.width, (x + 1) * xRatio);
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          const w = wx * wy;
          const i = (sy * src.width + sx) * 4;
          const alpha = src.data[i + 3];
          // premultiplied accumulation so transparent pixels do not bleed colour
          r += src.data[i] * alpha * w;
          g += src.data[i + 1] * alpha * w;
          b += src.data[i + 2] * alpha * w;
          a += alpha * w;
          wsum += w;
        }
      }
      const o = (y * width + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = wsum > 0 ? Math.round(a / wsum) : 0;
    }
  }
  return { width, height, data: out };
}

/** Uncompressed 32-bit TGA (BGRA, top-left origin), the format HOI4 flags use. */
export function encodeTga32(img: Rgba): Uint8Array {
  const header = new Uint8Array(18);
  header[2] = 2;
  header[12] = img.width & 0xff;
  header[13] = (img.width >> 8) & 0xff;
  header[14] = img.height & 0xff;
  header[15] = (img.height >> 8) & 0xff;
  header[16] = 32;
  header[17] = 0x28;
  const out = new Uint8Array(18 + img.width * img.height * 4);
  out.set(header, 0);
  for (let i = 0; i < img.width * img.height; i++) {
    const s = i * 4;
    const d = 18 + i * 4;
    out[d] = img.data[s + 2];
    out[d + 1] = img.data[s + 1];
    out[d + 2] = img.data[s];
    out[d + 3] = img.data[s + 3];
  }
  return out;
}

export const FLAG_SIZES = [
  { folder: 'gfx/flags/', width: 82, height: 52 },
  { folder: 'gfx/flags/medium/', width: 41, height: 26 },
  { folder: 'gfx/flags/small/', width: 10, height: 7 },
] as const;

export const FLAG_IDEOLOGIES = ['', 'democratic', 'communism', 'fascism', 'neutrality'] as const;

/**
 * One source image -> every flag file a country needs. `perIdeology` lets you supply a different image for an
 * ideology; ideologies without one reuse the default image.
 */
export function flagFilesFromImage(
  tag: string,
  image: Rgba,
  perIdeology: Partial<Record<(typeof FLAG_IDEOLOGIES)[number], Rgba>> = {}
): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  for (const ideology of FLAG_IDEOLOGIES) {
    const source = perIdeology[ideology] ?? image;
    const name = ideology ? `${tag}_${ideology}.tga` : `${tag}.tga`;
    for (const size of FLAG_SIZES) {
      files[`${size.folder}${name}`] = encodeTga32(resizeRgba(source, size.width, size.height));
    }
  }
  return files;
}

export const FOCUS_ICON_SIZE = { width: 93, height: 93 } as const;

export interface IconImport {
  /** Sprite name without the GFX_ prefix, e.g. "my_focus_icon". */
  id: string;
  image: Rgba;
}

/** Focus icons as TGAs plus the interface/*.gfx that defines them. */
export function focusIconFiles(prefix: string, icons: IconImport[]): Record<string, Uint8Array | string> {
  const files: Record<string, Uint8Array | string> = {};
  const sprites: string[] = ['spriteTypes = {'];
  for (const icon of icons) {
    const path = `gfx/interface/goals/${prefix}_${icon.id}.tga`;
    files[path] = encodeTga32(resizeRgba(icon.image, FOCUS_ICON_SIZE.width, FOCUS_ICON_SIZE.height));
    sprites.push(`${T}spriteType = {`, `${T}${T}name = "GFX_goal_${prefix}_${icon.id}"`, `${T}${T}texturefile = "${path}"`, `${T}}`);
  }
  sprites.push('}');
  files[`interface/${prefix}_goals.gfx`] = sprites.join(NL) + NL;
  return files;
}

/** Generic sprite manager output: any image, any size, named sprite. */
export function spriteFiles(prefix: string, sprites: { id: string; image: Rgba; width?: number; height?: number; folder?: string }[]): Record<string, Uint8Array | string> {
  const files: Record<string, Uint8Array | string> = {};
  const lines: string[] = ['spriteTypes = {'];
  for (const s of sprites) {
    const path = `${s.folder ?? 'gfx/interface'}/${prefix}_${s.id}.tga`;
    const img = s.width && s.height ? resizeRgba(s.image, s.width, s.height) : s.image;
    files[path] = encodeTga32(img);
    lines.push(`${T}spriteType = {`, `${T}${T}name = "GFX_${prefix}_${s.id}"`, `${T}${T}texturefile = "${path}"`, `${T}}`);
  }
  lines.push('}');
  files[`interface/${prefix}_sprites.gfx`] = lines.join(NL) + NL;
  return files;
}

/** Decode a browser image into RGBA through a canvas. Only usable in the browser. */
export async function decodeImageFile(file: Blob): Promise<Rgba> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available.');
  ctx.drawImage(bitmap, 0, 0);
  const d = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { width: d.width, height: d.height, data: new Uint8Array(d.data.buffer.slice(0)) };
}
