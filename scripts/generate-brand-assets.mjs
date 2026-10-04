// Builds the small brand images from public/images/logo.png (the full portrait):
//   public/og-image.jpg        1200x630 link preview (kept under ~300 KB for WhatsApp)
//   public/favicon-32.png      browser tab
//   public/apple-touch-icon.png 180x180
//   public/icon-512.png        large icon (JSON-LD image)
//   public/images/logo-avatar.webp  the round avatar in the Career section
// Run with: node scripts/generate-brand-assets.mjs
import sharp from "sharp";

const SRC = "public/images/logo.png";
const BG = { r: 14, g: 17, b: 15 }; // the portrait's own background

// the face and the panther mark sit in the top ~60% of the portrait
const head = () =>
  sharp(SRC).extract({ left: 112, top: 100, width: 800, height: 800 });

await head().resize(32, 32).png({ compressionLevel: 9 }).toFile("public/favicon-32.png");
await head().resize(180, 180).png({ compressionLevel: 9 }).toFile("public/apple-touch-icon.png");
await head().resize(512, 512).png({ compressionLevel: 9, palette: true }).toFile("public/icon-512.png");

// shown at 72px (object-position: top), so 3x covers high-density screens
await sharp(SRC)
  .extract({ left: 0, top: 0, width: 1024, height: 1024 })
  .resize(216, 216)
  .webp({ quality: 82 })
  .toFile("public/images/logo-avatar.webp");

const portrait = await sharp(SRC)
  .resize({ height: 630 })
  .png()
  .toBuffer();
const pw = (await sharp(portrait).metadata()).width;

const text = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <style>
    .k { font: 600 30px sans-serif; fill: #ff6b6b; letter-spacing: 6px; }
    .n { font: 700 92px sans-serif; fill: #eae5ec; letter-spacing: 2px; }
    .r { font: 400 36px sans-serif; fill: #b9b2bd; }
    .u { font: 500 28px sans-serif; fill: #ff6b6b; letter-spacing: 1px; }
  </style>
  <text class="k" x="72" y="190">HELLO, I'M</text>
  <text class="n" x="68" y="290">ARPAN</text>
  <text class="n" x="68" y="388">KUMAR</text>
  <text class="r" x="72" y="456">Developer | Product Engineer</text>
  <text class="u" x="72" y="560">thearpanhq.in</text>
</svg>`);

await sharp({ create: { width: 1200, height: 630, channels: 3, background: BG } })
  .composite([
    { input: portrait, left: 1200 - pw - 40, top: 0 },
    { input: text, left: 0, top: 0 },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("public/og-image.jpg");
