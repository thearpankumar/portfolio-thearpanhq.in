import type { StrokeData } from "../../data/greetingStrokes";

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type Timed = {
  points: number[][];
  lengths: number[]; // cumulative length at each point
  length: number;
  start: number; // seconds
  duration: number; // seconds
  dot: boolean;
};

const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep: a hand speeds up and slows down

/**
 * Draws lettering as a pen would write it: strokes appear one after another,
 * each growing along its centerline with a round cap, easing in and out. Used
 * from a Web Worker (OffscreenCanvas) so it stays smooth while the main thread
 * is busy, with the same code as a main-thread fallback.
 */
export function createWriter(
  ctx: Ctx2D,
  data: StrokeData,
  options: { color: string; scale: number; seconds: number }
) {
  const { color, scale, seconds } = options;
  const lineWidth = data.thickness * scale * 1.05;

  // measure every stroke
  const strokes: Timed[] = data.strokes.map((points) => {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      lengths.push(
        lengths[i - 1] +
          Math.hypot(
            points[i][0] - points[i - 1][0],
            points[i][1] - points[i - 1][1]
          )
      );
    }
    const length = lengths[lengths.length - 1];
    return { points, lengths, length, start: 0, duration: 0, dot: length < 1 };
  });

  // schedule: pen speed is constant across the word; dots are quick taps
  const DOT_TIME = 0.16;
  const LIFT = 0.07; // pause while the pen moves to the next stroke
  const penLength = strokes.reduce((n, s) => n + (s.dot ? 0 : s.length), 0);
  const dotCount = strokes.filter((s) => s.dot).length;
  const writing = Math.max(seconds - dotCount * (DOT_TIME + LIFT) - strokes.length * LIFT, 0.5);
  let clock = 0;
  for (const s of strokes) {
    s.start = clock;
    s.duration = s.dot ? DOT_TIME : (s.length / penLength) * writing;
    clock += s.duration + LIFT;
  }
  const total = clock;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  /** returns true once everything has been written */
  function draw(t: number, clear: () => void) {
    clear();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    for (const s of strokes) {
      if (t < s.start) break;
      const p = Math.min((t - s.start) / s.duration, 1);
      if (s.dot) {
        ctx.beginPath();
        ctx.arc(
          s.points[0][0] * scale,
          s.points[0][1] * scale,
          ((lineWidth * 0.5) * (0.4 + 0.6 * ease(p))) * 1.35,
          0,
          Math.PI * 2
        );
        ctx.fill();
        continue;
      }
      const target = ease(p) * s.length;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] * scale, s.points[0][1] * scale);
      for (let i = 1; i < s.points.length; i++) {
        if (s.lengths[i] <= target) {
          ctx.lineTo(s.points[i][0] * scale, s.points[i][1] * scale);
        } else {
          const seg = s.lengths[i] - s.lengths[i - 1] || 1;
          const f = (target - s.lengths[i - 1]) / seg;
          ctx.lineTo(
            (s.points[i - 1][0] + (s.points[i][0] - s.points[i - 1][0]) * f) * scale,
            (s.points[i - 1][1] + (s.points[i][1] - s.points[i - 1][1]) * f) * scale
          );
          break;
        }
      }
      ctx.stroke();
    }
    return t >= total;
  }

  return { draw, total };
}
