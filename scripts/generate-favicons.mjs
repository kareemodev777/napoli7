// Napoli 7 — favicon / app-icon generator.
//
// Source of truth is the brand crest at public/logo.png. Produces the
// Next.js App Router file-based icons under src/app/:
//   - favicon.ico  (16/32/48 px, PNG-encoded entries — replaces Next default)
//   - icon.png     (512 px, transparent — modern browsers / PWA)
//   - apple-icon.png (180 px, flattened on white — iOS home screen)
//
// Run: node scripts/generate-favicons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public", "logo.png");
const APP = path.join(ROOT, "src", "app");

// Assemble a valid .ico from PNG-encoded images (PNG-in-ICO, universally
// supported by modern browsers).
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  const datas = [];
  for (const { size, buffer } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image data size
    entry.writeUInt32LE(offset, 12); // image data offset
    entries.push(entry);
    datas.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

async function pngAt(size, { background } = {}) {
  let img = sharp(SRC).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (background) img = img.flatten({ background });
  return img.png().toBuffer();
}

async function main() {
  // favicon.ico — multi-resolution
  const icoSizes = [16, 32, 48];
  const icoImages = await Promise.all(
    icoSizes.map(async (size) => ({ size, buffer: await pngAt(size) }))
  );
  await writeFile(path.join(APP, "favicon.ico"), buildIco(icoImages));

  // icon.png — modern browsers / PWA (transparent)
  await writeFile(path.join(APP, "icon.png"), await pngAt(512));

  // apple-icon.png — iOS flattens transparency to black, so put it on white
  await writeFile(
    path.join(APP, "apple-icon.png"),
    await pngAt(180, { background: "#ffffff" })
  );

  console.log("Generated: favicon.ico (16/32/48), icon.png (512), apple-icon.png (180)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
