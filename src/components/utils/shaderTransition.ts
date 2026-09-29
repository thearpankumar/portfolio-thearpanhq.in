// Shared scroll-driven progress (0 = idle, 0.5 = fully covered, 1 = done) for
// the shader transition overlay. Plain module state so scroll triggers can write
// to it without going through React.
let value = 0;
const listeners = new Set<(v: number) => void>();

export const shaderTransition = {
  get value() {
    return value;
  },
  set(next: number) {
    if (next === value) return;
    value = next;
    listeners.forEach((fn) => fn(value));
  },
  subscribe(fn: (v: number) => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

// ScrollTrigger ids for the seam triggers
export const SEAM_ID_PREFIX = "seam-";

// The sweep starts this much scroll (% of viewport height) before its seam
// reaches the screen, spreading it over more scrolling. Sections that hold before
// a seam (Work) add this on top of their hold so the sweep starts after it.
export const SWEEP_LEAD = 80;
