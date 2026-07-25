import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const outputDirectory = path.resolve("public/icons");
await mkdir(outputDirectory, { recursive: true });

function iconSvg(size, padding) {
  const contentSize = size - padding * 2;
  const strokeWidth = Math.round(size * 0.055);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#176b4d"/>
      <g transform="translate(${padding} ${padding})" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 0 ${contentSize * 0.88} H ${contentSize}"/>
        <path d="M ${contentSize * 0.18} ${contentSize * 0.72} V ${contentSize * 0.38}"/>
        <path d="M ${contentSize * 0.48} ${contentSize * 0.72} V ${contentSize * 0.18}"/>
        <path d="M ${contentSize * 0.78} ${contentSize * 0.72} V ${contentSize * 0.5}"/>
      </g>
    </svg>
  `);
}

const icons = [
  { size: 192, name: "icon-192.png", padding: 38 },
  { size: 512, name: "icon-512.png", padding: 102 },
  { size: 512, name: "icon-maskable-512.png", padding: 128 },
  { size: 180, name: "apple-touch-icon.png", padding: 36 },
];

await Promise.all(
  icons.map(({ size, name, padding }) =>
    sharp(iconSvg(size, padding))
      .png()
      .toFile(path.join(outputDirectory, name)),
  ),
);

console.log("PWA icons generated.");
