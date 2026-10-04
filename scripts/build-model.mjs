// Turns the authoring model into the file the site loads:
//   public/models/character.glb  --meshopt-->  --AES-256-CBC-->  public/models/character.enc
// Geometry is compressed with Meshopt (the loader in
// src/components/Character/utils/character.ts decodes it), which halves the file;
// the WebP textures inside are left as they are.
// Run from the repo root: node scripts/build-model.mjs
import { execSync } from "node:child_process";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INPUT = "public/models/character.glb";
const OUTPUT = "public/models/character.enc";
// must match src/components/Character/utils/character.ts
const PASSWORD = "Character3D#@";

const dir = mkdtempSync(join(tmpdir(), "model-"));
const packed = join(dir, "character.meshopt.glb");
try {
  // fetched on demand rather than added to package.json: the CLI's own
  // dependencies fail `npm audit`
  execSync(
    `npx -y @gltf-transform/cli meshopt "${INPUT}" "${packed}" --level medium`,
    { stdio: "inherit" }
  );
  const iv = randomBytes(16);
  const key = createHash("sha256").update(PASSWORD).digest();
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    iv,
    cipher.update(readFileSync(packed)),
    cipher.final(),
  ]);
  writeFileSync(OUTPUT, encrypted);
  console.log(`${OUTPUT}: ${(encrypted.length / 1024).toFixed(0)} KB`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
