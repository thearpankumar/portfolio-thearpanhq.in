import { MathUtils, Vector2 } from "three";
import { normalizeWheelY } from "./normalizeWheel";

const MAX_SCROLL_PER_EVENT = 200; // one violent wheel notch shouldn't jump the whole helix
const DRAG_AXIS_LOCK_PX = 8; // travel before a touch drag commits to an axis
const DRAG_SCALE = 3;

// Silence that ends a wheel gesture. Trackpad and momentum events arrive every frame, so a whole
// swipe stays one gesture; separate mouse-wheel notches usually start fresh ones.
const WHEEL_GESTURE_GAP_MS = 250;

type Owner = "scene" | "page";

export type GestureKind = "wheel" | "touch";

/** How the scene decides, at the start of each wheel or touch gesture, whether to take it. */
export type ScrollClaim = {
  /** Does a gesture starting at stage pixel (`x`, `y`) over `target` belong to the scene? */
  claims: (
    x: number,
    y: number,
    target: EventTarget | null,
    kind: GestureKind
  ) => boolean;
  /**
   * Can the scene still scroll in `dir` (+1 forward, -1 back, 0 unknown)? At either end of the
   * project list the page takes the gesture instead, the way a nested scroller hands a scroll
   * to its parent once it can't go any further.
   */
  canScroll: (dir: number) => boolean;
};

/**
 * Pointer + wheel state over the stage, sampled once per frame by the components that need it.
 *
 * The scene lives in the pinned Work section, so every coordinate here is relative to that
 * section, and scrolling is shared with the page (as in references/xylophone):
 *
 *   - A gesture is claimed by the scene only if it *starts* over the xylophone (`claims`).
 *     Everywhere else the browser scrolls the page as usual, on to the next section.
 *   - The decision holds for the whole gesture. Browsers latch a scroll to one scroller the same
 *     way, and only the first wheel event of a sequence is reliably cancelable — so if the page
 *     starts scrolling and the helix slides under a still cursor, the page keeps the gesture
 *     instead of the scroll suddenly being hijacked.
 *   - The blocking (non-passive) listeners sit on the stage only, so page scrolling outside it
 *     never waits on the main thread.
 *
 * Deltas accumulate across every event in a frame and are cleared in `postUpdate()`. Wheel and
 * touch drag both normalise into `deltaScrollY`, so consumers never branch on the device.
 */
export class Input {
  /** NDC over the stage, -1..1 — raycasting */
  static mouseXY = new Vector2();
  /** 0..1 over the stage from the bottom-left — fluid splats */
  static mouseScreenXY = new Vector2();
  /** stage-local CSS pixels, from the top-left */
  static pointer = new Vector2();
  /** scroll pixels the scene claimed this frame, from the wheel or a vertical touch drag */
  static deltaScrollY = 0;
  /** a pointer has been seen and is over the stage right now */
  static hasPointer = false;
  /** a scene-owned finger is down — a held drag reads zero delta, but it isn't a finished scroll */
  static isTouching = false;

  private static stage: HTMLElement | null = null;
  private static claim: ScrollClaim = {
    claims: () => false,
    canScroll: () => false,
  };
  private static rect = { left: 0, top: 0, width: 1, height: 1 };

  // last pointer position in viewport pixels; kept so a moving stage can be re-mapped under it
  private static clientXY = new Vector2();
  private static clientKnown = false;

  private static wheelOwner: Owner = "page";
  private static lastWheelTime = -Infinity;

  // touch drag — `wheel` never fires for touch, so a vertical drag drives the same scroll
  private static touchOwner: Owner = "page";
  private static dragStartXY = new Vector2();
  private static dragPrevY = 0;
  private static dragAxis: "none" | "x" | "y" = "none";
  private static dragDirChecked = false;

  /* -------------------------------- handlers -------------------------------- */
  // Touch is followed through the touch events below instead: they keep firing while the
  // finger pans the page, where pointer events are cancelled as soon as the browser scrolls.
  private static readonly onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "touch") this.setClient(e.clientX, e.clientY);
  };

  private static readonly onWheel = (e: WheelEvent) => {
    if (e.timeStamp - this.lastWheelTime > WHEEL_GESTURE_GAP_MS) {
      this.wheelOwner = this.claimsWheel(e) ? "scene" : "page";
    }
    this.lastWheelTime = e.timeStamp;

    if (this.wheelOwner !== "scene") return;

    // the browser already committed this sequence to scrolling the page — let it
    if (!e.cancelable) {
      this.wheelOwner = "page";
      return;
    }

    e.preventDefault();
    this.deltaScrollY += MathUtils.clamp(
      normalizeWheelY(e),
      -MAX_SCROLL_PER_EVENT,
      MAX_SCROLL_PER_EVENT
    );
  };

  private static readonly onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    this.measure();
    this.setClient(touch.clientX, touch.clientY);

    // a second finger is a pinch — always the browser's
    const claimed =
      e.touches.length === 1 &&
      this.hasPointer &&
      this.claim.claims(this.pointer.x, this.pointer.y, e.target, "touch");
    this.touchOwner = claimed ? "scene" : "page";
    this.isTouching = claimed;

    this.dragStartXY.set(touch.clientX, touch.clientY);
    this.dragPrevY = touch.clientY;
    this.dragAxis = "none";
    this.dragDirChecked = false;
  };

  private static readonly onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;

    this.setClient(touch.clientX, touch.clientY);

    if (e.touches.length > 1) this.releaseTouch();
    if (this.touchOwner !== "scene") return;

    // The first move shows which way the finger is going. At an end of the list a vertical pan
    // past it belongs to the page — decided now, because once we cancel a move the browser
    // can't start panning for this touch.
    if (!this.dragDirChecked) {
      this.dragDirChecked = true;
      const dx = touch.clientX - this.dragStartXY.x;
      const dy = this.dragStartXY.y - touch.clientY; // finger up = forward, like the wheel
      if (Math.abs(dy) > Math.abs(dx) && !this.claim.canScroll(Math.sign(dy))) {
        this.releaseTouch();
        return;
      }
    }

    // Must happen on the first move, before the 8px axis lock: once the browser starts a pan
    // it can't be taken back. Horizontal sweeps across the bars are kept off the page too.
    if (e.cancelable) e.preventDefault();
    this.updateDrag(touch);
  };

  // a lifted finger leaves no hover behind — otherwise the bars spinning under its last
  // position would keep ringing
  private static readonly onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length > 0) return;
    this.releaseTouch();
    this.clientKnown = false;
    this.hasPointer = false;
  };

  /* --------------------------------- public --------------------------------- */
  static init(stage: HTMLElement, claim: ScrollClaim) {
    this.stage = stage;
    this.claim = claim;
    this.measure();

    // passive — these only observe
    document.addEventListener("pointermove", this.onPointerMove, {
      passive: true,
    });
    stage.addEventListener("touchstart", this.onTouchStart, { passive: true });
    stage.addEventListener("touchend", this.onTouchEnd, { passive: true });
    stage.addEventListener("touchcancel", this.onTouchEnd, { passive: true });

    // blocking — these may claim the gesture. Scoped to the stage, not the document, so the rest
    // of the page keeps its fast, non-blocking scroll.
    stage.addEventListener("wheel", this.onWheel, { passive: false });
    stage.addEventListener("touchmove", this.onTouchMove, { passive: false });
  }

  /**
   * Re-reads the stage's box and re-maps the pointer onto it. Call once per frame: the smooth
   * scroller moves the section under a still cursor without firing any scroll events.
   */
  static update() {
    this.measure();
  }

  /** Clears per-frame deltas. Call after every consumer has read them. */
  static postUpdate() {
    this.deltaScrollY = 0;
  }

  static destroy() {
    document.removeEventListener("pointermove", this.onPointerMove);

    const stage = this.stage;
    if (!stage) return;

    stage.removeEventListener("touchstart", this.onTouchStart);
    stage.removeEventListener("touchend", this.onTouchEnd);
    stage.removeEventListener("touchcancel", this.onTouchEnd);
    stage.removeEventListener("wheel", this.onWheel);
    stage.removeEventListener("touchmove", this.onTouchMove);
    this.stage = null;
    this.clientKnown = false;
    this.hasPointer = false;
    this.releaseTouch();
    this.deltaScrollY = 0;
  }

  /* -------------------------------- internal -------------------------------- */
  /** Sideways swipes (history navigation, horizontal scroll) and ctrl+wheel (trackpad pinch-zoom) stay the browser's. */
  private static claimsWheel(e: WheelEvent) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return false;

    this.measure();
    this.setClient(e.clientX, e.clientY);
    return (
      this.hasPointer &&
      this.claim.claims(this.pointer.x, this.pointer.y, e.target, "wheel") &&
      this.claim.canScroll(Math.sign(e.deltaY))
    );
  }

  private static releaseTouch() {
    this.touchOwner = "page";
    this.isTouching = false;
    this.dragAxis = "none";
  }

  private static measure() {
    if (!this.stage) return;

    const r = this.stage.getBoundingClientRect();
    this.rect = {
      left: r.left,
      top: r.top,
      width: Math.max(r.width, 1),
      height: Math.max(r.height, 1),
    };
    this.mapPointer();
  }

  private static setClient(x: number, y: number) {
    this.clientXY.set(x, y);
    this.clientKnown = true;
    this.mapPointer();
  }

  private static mapPointer() {
    if (!this.clientKnown) return;

    const { left, top, width, height } = this.rect;
    const x = this.clientXY.x - left;
    const y = this.clientXY.y - top;

    this.pointer.set(x, y);
    this.mouseXY.set((x / width) * 2 - 1, 1 - (y / height) * 2);
    this.mouseScreenXY.set(x / width, 1 - y / height);
    this.hasPointer = x >= 0 && y >= 0 && x <= width && y <= height;
  }

  /**
   * Axis-locked vertical drag. The first `DRAG_AXIS_LOCK_PX` of travel decide whether the
   * gesture is a scroll or a horizontal sweep across the bars; once locked it stays locked
   * for the rest of the touch, so a diagonal sweep doesn't also spin the helix.
   */
  private static updateDrag(touch: Touch) {
    if (this.dragAxis === "none") {
      const dx = touch.clientX - this.dragStartXY.x;
      const dy = touch.clientY - this.dragStartXY.y;
      if (Math.hypot(dx, dy) < DRAG_AXIS_LOCK_PX) return;

      this.dragAxis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      this.dragPrevY = touch.clientY; // drop the pre-lock travel so the helix doesn't jump
    }

    if (this.dragAxis !== "y") return;

    // dragging up scrolls forward, matching the wheel's sign
    const delta = (this.dragPrevY - touch.clientY) * DRAG_SCALE;
    this.deltaScrollY += MathUtils.clamp(
      delta,
      -MAX_SCROLL_PER_EVENT,
      MAX_SCROLL_PER_EVENT
    );
    this.dragPrevY = touch.clientY;
  }
}
