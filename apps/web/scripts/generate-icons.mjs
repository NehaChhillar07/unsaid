// one-shot icon generation: rasterizes the brand mark (speech bubble holding
// an ellipsis, from src/app/icon.svg) onto a full-bleed warm background so
// the 192/512 PNGs are maskable-safe. run: node scripts/generate-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

// full-bleed square; glyph occupies the central ~58% (maskable safe zone is 80%)
const fullBleedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#ECE5DC"/>
  <g transform="translate(217 217) scale(24.6)">
    <path d="M5 4h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4.5 3.5V16H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
      fill="#B06A48" fill-opacity="0.16" stroke="#B06A48" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="8" cy="10" r="1.15" fill="#B06A48"/>
    <circle cx="12" cy="10" r="1.15" fill="#B06A48"/>
    <circle cx="16" cy="10" r="1.15" fill="#B06A48"/>
  </g>
</svg>`;

const src = Buffer.from(fullBleedSvg);

await mkdir(publicDir, { recursive: true });

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  const png = await sharp(src).resize(size, size).png().toBuffer();
  await writeFile(join(publicDir, name), png);
  console.log(`wrote public/${name} (${size}x${size}, ${png.length} bytes)`);
}
