import { CanvasTexture, NearestFilter } from 'three';

/**
 * Convert an array of pixel-art frames into a single horizontal sprite-sheet
 * CanvasTexture. Each frame is an array of rows of characters; each character
 * is looked up in the palette to get its CSS color. `.` and space are always
 * transparent.
 *
 * Rows shorter than `frames[0][0].length` are right-padded with transparent
 * pixels — a forgiving authoring experience for hand-drawn sprite arrays.
 *
 * This is a core Zero-Loading primitive: the texture is generated in-memory
 * at boot from TypeScript data, so no PNG/JPG/GIF ever leaves the bundle.
 */
export function makePixelTexture(
  frames: readonly (readonly string[])[],
  palette: Readonly<Record<string, string>>,
): CanvasTexture {
  if (frames.length === 0) throw new Error('[pixelGen] no frames');
  const first = frames[0]!;
  if (first.length === 0) throw new Error('[pixelGen] empty frame');

  const frameH = first.length;
  const frameW = first[0]!.length;
  const count = frames.length;

  const canvas = document.createElement('canvas');
  canvas.width = frameW * count;
  canvas.height = frameH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[pixelGen] no 2d context');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let f = 0; f < count; f++) {
    const frame = frames[f]!;
    const offsetX = f * frameW;
    for (let y = 0; y < frameH; y++) {
      const row = frame[y] ?? '';
      for (let x = 0; x < frameW; x++) {
        const ch = row[x];
        if (!ch || ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x, y, 1, 1);
      }
    }
  }

  const tex = new CanvasTexture(canvas);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
