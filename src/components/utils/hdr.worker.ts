// Decodes a Radiance .hdr (RGBE, usually run-length encoded) into half floats,
// off the main thread. A 2000x1000 map is 2 million pixels; doing this on the
// main thread (as RGBELoader does) froze the page for a second or more in
// production and several seconds in development.
//
// The parser follows three-stdlib's RGBELoader, which is adapted from
// http://www.graphics.cornell.edu/~bjw/rgbe.html, with two differences:
//  - rows are written bottom-up, so the texture needs no `flipY` (browsers are
//    deprecating the upload-time flip for typed arrays)
//  - `saturation` below 1 pulls each colour towards its luminance

export type HdrRequest = { url: string; saturation: number };
export type HdrResponse =
  | { ok: true; width: number; height: number; data: Uint16Array }
  | { ok: false; error: string };

// Minimal typing for the worker global (the project only includes the DOM lib)
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<HdrRequest>) => void) | null;
  postMessage: (message: HdrResponse, transfer?: Transferable[]) => void;
};

const LUMA = [0.2126, 0.7152, 0.0722] as const;
const HALF_MAX = 65504;

// float32 -> float16 bits: the table method of three.js's DataUtils.toHalfFloat
// (http://www.fox-toolkit.org/ftp/fasthalffloatconversion.pdf), copied so the
// worker doesn't bundle three
const floatView = new Float32Array(1);
const uint32View = new Uint32Array(floatView.buffer);
const baseTable = new Uint32Array(512);
const shiftTable = new Uint32Array(512);
for (let i = 0; i < 256; ++i) {
  const e = i - 127;
  if (e < -27) {
    baseTable[i] = 0x0000;
    baseTable[i | 0x100] = 0x8000;
    shiftTable[i] = 24;
    shiftTable[i | 0x100] = 24;
  } else if (e < -14) {
    baseTable[i] = 0x0400 >> (-e - 14);
    baseTable[i | 0x100] = (0x0400 >> (-e - 14)) | 0x8000;
    shiftTable[i] = -e - 1;
    shiftTable[i | 0x100] = -e - 1;
  } else if (e <= 15) {
    baseTable[i] = (e + 15) << 10;
    baseTable[i | 0x100] = ((e + 15) << 10) | 0x8000;
    shiftTable[i] = 13;
    shiftTable[i | 0x100] = 13;
  } else if (e < 128) {
    baseTable[i] = 0x7c00;
    baseTable[i | 0x100] = 0xfc00;
    shiftTable[i] = 24;
    shiftTable[i | 0x100] = 24;
  } else {
    baseTable[i] = 0x7c00;
    baseTable[i | 0x100] = 0xfc00;
    shiftTable[i] = 13;
    shiftTable[i | 0x100] = 13;
  }
}
function toHalfFloat(value: number) {
  floatView[0] = Math.min(Math.max(value, -HALF_MAX), HALF_MAX);
  const f = uint32View[0];
  const e = (f >> 23) & 0x1ff;
  return baseTable[e] + ((f & 0x007fffff) >> shiftTable[e]);
}
const HALF_ONE = toHalfFloat(1);

function readHeader(bytes: Uint8Array) {
  let pos = 0;
  const line = () => {
    const start = pos;
    while (pos < bytes.length && bytes[pos] !== 0x0a) pos++;
    const text = String.fromCharCode(...bytes.subarray(start, pos));
    pos++; // past the newline
    return text;
  };

  if (!/^#\?\S+/.test(line())) throw new Error("not a Radiance HDR file");

  let format = "";
  while (pos < bytes.length) {
    const text = line();
    const fmt = text.match(/^\s*FORMAT=(\S+)\s*$/);
    if (fmt) format = fmt[1];
    const size = text.match(/^\s*-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/);
    if (size) {
      if (format !== "32-bit_rle_rgbe") throw new Error("unsupported format");
      return {
        height: parseInt(size[1], 10),
        width: parseInt(size[2], 10),
        offset: pos,
      };
    }
  }
  throw new Error("missing image size");
}

/** RGBE bytes, 4 per pixel, top row first */
function readPixels(bytes: Uint8Array, width: number, height: number) {
  // run-length encoding needs 8..32767 wide scanlines that start with 2, 2
  if (
    width < 8 ||
    width > 32767 ||
    bytes[0] !== 2 ||
    bytes[1] !== 2 ||
    bytes[2] & 0x80
  ) {
    return bytes; // stored flat
  }

  const rgbe = new Uint8Array(4 * width * height);
  const scanline = new Uint8Array(4 * width);
  let pos = 0;
  let out = 0;
  for (let y = 0; y < height; y++) {
    if (
      bytes[pos] !== 2 ||
      bytes[pos + 1] !== 2 ||
      ((bytes[pos + 2] << 8) | bytes[pos + 3]) !== width
    ) {
      throw new Error("bad scanline");
    }
    pos += 4;

    // the four channels are stored one after another, each run-length encoded
    let ptr = 0;
    while (ptr < scanline.length) {
      let count = bytes[pos++];
      const run = count > 128;
      if (run) count -= 128;
      if (count === 0 || ptr + count > scanline.length) {
        throw new Error("bad scanline data");
      }
      if (run) {
        scanline.fill(bytes[pos++], ptr, ptr + count);
      } else {
        scanline.set(bytes.subarray(pos, pos + count), ptr);
        pos += count;
      }
      ptr += count;
    }

    for (let x = 0; x < width; x++) {
      rgbe[out++] = scanline[x];
      rgbe[out++] = scanline[x + width];
      rgbe[out++] = scanline[x + 2 * width];
      rgbe[out++] = scanline[x + 3 * width];
    }
  }
  return rgbe;
}

function decode(buffer: ArrayBuffer, saturation: number) {
  const bytes = new Uint8Array(buffer);
  const { width, height, offset } = readHeader(bytes);
  const rgbe = readPixels(bytes.subarray(offset), width, height);
  const data = new Uint16Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const src = y * width * 4;
    const dst = (height - 1 - y) * width * 4; // bottom row first
    for (let x = 0; x < width * 4; x += 4) {
      const scale = Math.pow(2, rgbe[src + x + 3] - 128) / 255;
      let r = rgbe[src + x] * scale;
      let g = rgbe[src + x + 1] * scale;
      let b = rgbe[src + x + 2] * scale;
      if (saturation < 1) {
        const l = r * LUMA[0] + g * LUMA[1] + b * LUMA[2];
        r = l + (r - l) * saturation;
        g = l + (g - l) * saturation;
        b = l + (b - l) * saturation;
      }
      data[dst + x] = toHalfFloat(r);
      data[dst + x + 1] = toHalfFloat(g);
      data[dst + x + 2] = toHalfFloat(b);
      data[dst + x + 3] = HALF_ONE;
    }
  }
  return { width, height, data };
}

scope.onmessage = async (event) => {
  const { url, saturation } = event.data;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    const result = decode(await response.arrayBuffer(), saturation);
    scope.postMessage({ ok: true, ...result }, [result.data.buffer]);
  } catch (err) {
    scope.postMessage({ ok: false, error: String(err) });
  }
};
