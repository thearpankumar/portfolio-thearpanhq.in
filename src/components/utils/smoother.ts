import type { ScrollSmoother } from "gsap/ScrollSmoother";

export const smootherRef: { current: ScrollSmoother | null } = {
  current: null,
};

// ScrollSmoother `speed`. Content moves this many times faster than the scrollbar,
// so ScrollTrigger distances (pin `end`, ...) cover 1/SMOOTHER_SPEED as much real
// scrolling: multiply a distance by this to get the scrollbar distance you want.
export const SMOOTHER_SPEED = 1.7;
