// Tuning for the Work section's glass xylophone (adapted from references/xylophone).

/* -------------------------------------------------------------------------- */
/*                                   quality                                  */
/* -------------------------------------------------------------------------- */
// Coarse pointer + small viewport ≈ phone. A full-res view-normal buffer and ULTRA SMAA are
// more than a phone GPU holds at 60fps next to the rest of the page, so the tier scales them
// back. The pixel ratio is capped at 1.5 everywhere, like the site's other canvases.
const isMobile =
  (window.matchMedia?.("(pointer: coarse)").matches ?? false) &&
  Math.min(window.innerWidth, window.innerHeight) < 900;

export const QUALITY = {
  isMobile,
  maxDpr: 1.5,
  /** view-normal buffer size, as a fraction of the screen */
  glassBufferScale: isMobile ? 0.5 : 1,
} as const;

/* -------------------------------------------------------------------------- */
/*                                   layers                                   */
/* -------------------------------------------------------------------------- */
// Passes isolate content by narrowing the camera's layer mask, not by swapping scenes.
export const GLASS_LAYER = 1; // the bars — rendered again into the view-normal buffer (SSAO)
export const BG_LAYER = 2; // the backdrop — only ever rendered, blurred, for the frosted transmission
export const CARD_LAYER = 3; // the project cards — drawn only by CardPass, over the finished helix

/* -------------------------------------------------------------------------- */
/*                                  xylophone                                 */
/* -------------------------------------------------------------------------- */
export const XYLOPHONE = {
  // helix layout
  count: 64,
  radius: 1,
  tiltFalloff: 2,
  thetaStep: 0.175,
  thetaOffset: Math.PI,

  // idle rotation — shared by the vertex shader and the CPU picker
  spinSpeed: 0.3,

  // tint gradient repeats every `tintWrap` bars
  tintWrap: 10,

  group: { scale: 0.5, rotXDeg: 25, rotZDeg: 30 },
  // wheel / drag pixels -> helix slots, and how fast the conveyor eases there (damp lambda)
  scroll: { sensitivity: 0.012, lerp: 5 },
} as const;

/* -------------------------------------------------------------------------- */
/*                                project cards                               */
/* -------------------------------------------------------------------------- */
// Positions are in helix slots (one slot = one bar). A card at slot `s` rides the same
// conveyor as the bar there, so it stays tethered to that bar until it leaves the window.
export const CARDS = {
  spacing: 6, // slots between consecutive cards
  focusSlot: 33, // where the active card rests; the window below is measured from here
  below: 15, // slots below the focus a card first appears at…
  above: 8, // …and above it where it leaves. below + above = the visible span
  fadeIn: 5, // slots a card takes to fade in at the bottom (it is still blurred while it does)
  fadeOut: 4, // slots a card takes to fade out at the top — half gone by the time it clears the header

  // the path cards ride: helix point at `pathRadius` bar-radii, then pushed toward the camera
  pathRadius: 0.6,
  offset: { x: 0.95, y: 0.1, z: 0.8 },

  // pose — the card yaws with the helix angle, pitches as it climbs, and rests slightly rolled
  yawFollow: 0.22, // fraction of the helix angle the card turns through
  pitchPerSlot: -0.02, // radians per slot from the focus
  restYaw: -0.12,
  restRoll: -0.07,

  // emphasis — the card nearest the focus is pulled forward and scaled up
  restScale: 0.8,
  activeLift: 0.22,
  hoverLift: 0.08,

  slab: { depth: 0.05, bevel: 0.025, radius: 0.09 },

  // seconds without scroll before snapping; fraction of a step that counts as a flick — under one
  // 100px wheel notch (1.2 slots at the scroll sensitivity), so a single notch always advances
  snap: { idle: 0.18, flick: 0.15 },
} as const;

export type Layout = {
  narrow: boolean;
  groupX: number; // helix shift, world units — the cards ride the helix, so they move with it
  groupY: number;
  cardCss: { width: number; height: number }; // the card's HTML design size, px
  cardWorldWidth: number; // 0 = fit the viewport
  offsetX: number; // replaces CARDS.offset.x
  centerPull: number; // 0..1 — how far cards are pulled to the screen centre, away from the path
  reserveLeft: number; // fraction of the viewport kept clear for the intro panel
};

/**
 * Wide screens keep the helix right of centre with the intro on the left; narrow ones centre
 * the cards over the helix. Mirrored by the narrow media query in Work.css.
 */
export function resolveLayout(width: number, height: number): Layout {
  if (width / height >= 1.05 && width >= 760) {
    return {
      narrow: false,
      groupX: 0.45,
      groupY: 0,
      cardCss: { width: 540, height: 172 },
      cardWorldWidth: 1.7,
      offsetX: CARDS.offset.x,
      centerPull: 0,
      reserveLeft: 0.26,
    };
  }

  return {
    narrow: true,
    groupX: 0.05,
    groupY: -0.4,
    cardCss: { width: 360, height: 144 }, // roomy enough for ~18-char titles and 3 tags
    cardWorldWidth: 0,
    offsetX: 0.4,
    centerPull: 0.85,
    reserveLeft: 0,
  };
}

/* -------------------------------------------------------------------------- */
/*                                    fluid                                   */
/* -------------------------------------------------------------------------- */
// Hover wake. Low-res on purpose: the bars only sample its velocity magnitude.
export const FLUID = {
  simRes: 128,
  curlStrength: 0.2,
  splatRadius: 0.6,
  splatForce: 20,
  pressureIterations: 1,
  velocityDissipation: 0.93,
  pressureDissipation: 0.97,
} as const;

/* -------------------------------------------------------------------------- */
/*                                    post                                    */
/* -------------------------------------------------------------------------- */
export const FROST = {
  strength: 0.9, // 0..1, scaled to the gaussian kernel by FrostBackdropPass
  maxBlurPx: 48,
} as const;

// Contact shadows. The floating comp has no floor, so bar-on-bar self-occlusion IS the shadow.
export const SSAO = {
  samples: 16,
  rings: 7,
  radius: 0.1, // sampling radius, as a fraction of resolution
  intensity: 2.2,
  bias: 0.03, // rejects self-occlusion on flat faces
  fade: 0.02,
  luminanceInfluence: 0.6, // let the bright frosted body keep some AO
  worldDistanceThreshold: 20,
  worldDistanceFalloff: 5,
  worldProximityThreshold: 3,
  worldProximityFalloff: 1,
  resolutionScale: QUALITY.isMobile ? 0.5 : 1,
} as const;
