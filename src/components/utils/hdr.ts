import {
  DataTexture,
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  RGBAFormat,
} from "three";
import type { HdrRequest, HdrResponse } from "./hdr.worker";

// Loads an .hdr as an equirectangular environment map. The file is decoded in a
// worker (hdr.worker.ts), so the page never stalls on it, and each decode is
// shared: the character and the tech stack use the same file, and React's
// StrictMode mounts each of them twice in development.

type Decoded = { width: number; height: number; data: Uint16Array };

const decoded = new Map<string, Promise<Decoded>>();

function decode(url: string, saturation: number): Promise<Decoded> {
  const key = `${url}|${saturation}`;
  let pending = decoded.get(key);
  if (!pending) {
    pending = new Promise<Decoded>((resolve, reject) => {
      const worker = new Worker(new URL("./hdr.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<HdrResponse>) => {
        worker.terminate();
        const result = event.data;
        if (result.ok) resolve(result);
        else reject(new Error(result.error));
      };
      worker.onerror = (event) => {
        worker.terminate();
        reject(new Error(event.message));
      };
      worker.postMessage({ url, saturation } satisfies HdrRequest);
    });
    // a failed decode may be retried
    pending.catch(() => decoded.delete(key));
    decoded.set(key, pending);
  }
  return pending;
}

type LoadOptions = {
  /** 1 keeps the map's colours, 0 is greyscale */
  saturation?: number;
};

/** A new texture each call (the caller owns and disposes it); the pixels are shared. */
export async function loadHdr(
  url: string,
  { saturation = 1 }: LoadOptions = {}
): Promise<DataTexture> {
  const { width, height, data } = await decode(url, saturation);
  // the same settings RGBELoader gives a half-float map, except flipY: the
  // worker already stored the rows bottom-up
  const texture = new DataTexture(
    data,
    width,
    height,
    RGBAFormat,
    HalfFloatType
  );
  texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}
