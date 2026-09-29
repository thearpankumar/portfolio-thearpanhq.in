import { useEffect, useRef, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/useLoading";
import { greetingStrokes } from "../data/greetingStrokes";
import { createWriter } from "./utils/strokeWriter";

const COLOR = "#ff2d2d";
const WRITE_SECONDS = 3.6;
const EXIT_MS = 1200;

// Apple-style "hello" preloader (adapted from references/personalBlog): the
// greeting is written stroke by stroke like a pen, then the whole screen slides
// up. Apple's own hello lettering only exists for "hello", so "Bonjour, mon
// ami !" is a monoline script traced into pen strokes (see data/greetingStrokes).
//
// The screen only leaves once the writing has finished AND the 3D scene has
// reported that it is loaded. The writing runs on an OffscreenCanvas in a Web
// Worker, so it stays smooth while the main thread decodes the 3D model.
const Loading = ({ percent }: { percent: number }) => {
  const { setIsLoading } = useLoading();
  const holderRef = useRef<HTMLDivElement>(null);
  const [written, setWritten] = useState(false);
  const [exiting, setExiting] = useState(false);
  const exitStarted = useRef(false);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = holder.clientWidth || 800;

    // A canvas can be handed to a worker only once, so create it here (and remove
    // it on cleanup) instead of in JSX: React runs effects twice in development.
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(
      (canvas.width * greetingStrokes.height) / greetingStrokes.width
    );
    canvas.className = "hello-canvas";
    holder.appendChild(canvas);
    const scale = canvas.width / greetingStrokes.width;

    let worker: Worker | undefined;
    let raf = 0;
    let doneTimer = 0;
    const finished = () => {
      doneTimer = window.setTimeout(() => setWritten(true), 350);
    };

    // (older browsers lack it, even though the DOM typings always declare it)
    if (typeof canvas.transferControlToOffscreen === "function") {
      const offscreen = canvas.transferControlToOffscreen();
      worker = new Worker(new URL("./utils/hello.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (e) => {
        if (e.data?.type === "done") finished();
      };
      worker.postMessage(
        { canvas: offscreen, scale, color: COLOR, seconds: WRITE_SECONDS, instant: reduced },
        [offscreen]
      );
    } else {
      // older browsers: same drawing code on the main thread
      const ctx = canvas.getContext("2d")!;
      const writer = createWriter(ctx, greetingStrokes, {
        color: COLOR,
        scale,
        seconds: WRITE_SECONDS,
      });
      const begin = performance.now();
      const frame = () => {
        const t = reduced ? writer.total : (performance.now() - begin) / 1000;
        if (writer.draw(t, () => ctx.clearRect(0, 0, canvas.width, canvas.height))) {
          finished();
        } else {
          raf = requestAnimationFrame(frame);
        }
      };
      frame();
    }

    return () => {
      worker?.terminate();
      cancelAnimationFrame(raf);
      window.clearTimeout(doneTimer);
      canvas.remove();
    };
  }, []);

  // Curtain up once written and loaded; the site's intro animation starts
  // while it rises and the loader is removed when it has left.
  useEffect(() => {
    if (exitStarted.current || !written || percent < 100) return;
    exitStarted.current = true;
    setExiting(true);
    window.setTimeout(() => {
      import("./utils/initialFX").then((module) => module.initialFX());
    }, 500);
    window.setTimeout(() => setIsLoading(false), EXIT_MS);
  }, [written, percent, setIsLoading]);

  return (
    <div
      className={`loading-screen ${exiting ? "loading-exit" : ""}`}
      role="status"
      aria-label="Bonjour, mon ami !"
    >
      <div className="loading-content">
        <div className="hello-holder" ref={holderRef} />
      </div>
      <div className="loading-dot" />
    </div>
  );
};

export default Loading;
