import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const outputDirectory = path.resolve("public/icons");
await mkdir(outputDirectory, { recursive: true });

const sources = {
  light: path.resolve("public/brand/monii-original.png"),
  dark: path.resolve("public/brand/monii-dark-original.png"),
};

async function roundedIcon(source, size, name) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="white"/></svg>`);
  await sharp(source).resize(size, size).ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png().toFile(path.join(outputDirectory, name));
}

async function maskableIcon(source, name) {
  // Android applies the rounding. Keep the mark inside its safe circle.
  const artwork = await sharp(source).resize(400, 400).png().toBuffer();
  const { data } = await sharp(source).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2], alpha: 1 };
  await sharp({ create: { width: 512, height: 512, channels: 4, background } })
    .composite([{ input: artwork, left: 56, top: 56 }])
    .png().toFile(path.join(outputDirectory, name));
}

for (const [theme, source] of Object.entries(sources)) {
  const suffix = theme === "dark" ? "-dark" : "";
  await Promise.all([192, 512, 32].map((size) =>
    roundedIcon(source, size, `icon${suffix}-${size}.png`),
  ));
  // Apple applies Home Screen rounding itself; use an opaque square.
  await sharp(source).resize(180, 180).png()
    .toFile(path.join(outputDirectory, `apple-touch-icon${suffix}.png`));
  await maskableIcon(source, `icon-maskable${suffix}-512.png`);
}

await sharp("public/brand/monii-symbol-original.png")
  .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 96, bottom: 96, left: 96, right: 96, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toFile(path.join(outputDirectory, "icon-monochrome-512.png"));

// ICO container with a PNG payload, replacing the starter favicon as well.
const favicon = await readFile(path.join(outputDirectory, "icon-32.png"));
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("src/app/favicon.ico", Buffer.concat([header, favicon]));

console.log("Monii light, dark, Apple, maskable and monochrome icons generated.");
