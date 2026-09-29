import { createWriter } from "./strokeWriter";
import { greetingStrokes } from "../../data/greetingStrokes";

type Init = {
  canvas: OffscreenCanvas;
  scale: number;
  color: string;
  seconds: number;
  instant: boolean;
};

// Minimal typing for the worker global (the project only includes the DOM lib)
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<Init>) => void) | null;
  postMessage: (message: unknown) => void;
  requestAnimationFrame?: (cb: () => void) => number;
};

// The lettering is drawn here, on an OffscreenCanvas, so the animation keeps
// its frame rate while the main thread is busy loading the page.
scope.onmessage = (event) => {
  const { canvas, scale, color, seconds, instant } = event.data;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const writer = createWriter(ctx, greetingStrokes, { color, scale, seconds });
  const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  const schedule = (cb: () => void) =>
    scope.requestAnimationFrame
      ? scope.requestAnimationFrame(cb)
      : setTimeout(cb, 16);

  const begin = performance.now();
  const frame = () => {
    const t = instant ? writer.total : (performance.now() - begin) / 1000;
    if (writer.draw(t, clear)) {
      scope.postMessage({ type: "done" });
    } else {
      schedule(frame);
    }
  };
  frame();
};
