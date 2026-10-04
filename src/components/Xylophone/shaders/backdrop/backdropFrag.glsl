// What the frosted glass sees through itself. Never drawn to the screen — the canvas is
// transparent there and the page (its dark background and the star field) shows instead — so
// this only has to read like a blurred copy of that page: near-black, warmed by the two red
// glows the portfolio keeps fixed at the top-left and right edges.

uniform vec3 u_colorBase; // the page background
uniform vec3 u_colorGlow; // the accent glow
uniform float u_bokeh;    // 0..1 strength of the floating light specks
uniform float u_drift;    // 0 freezes the specks
uniform float u_time;
uniform vec2 u_resolution;

varying vec2 v_uv;

/* -------------------------------------------------------------------------- */
/*                                    utils                                   */
/* -------------------------------------------------------------------------- */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/**
 * Sparse soft discs on a jittered grid, drifting slowly upward. Only about one cell in five
 * lights up, and each disc gets its own size and brightness, so the grid never reads.
 */
float bokeh(vec2 uv, float scale, float seed) {
  float time = u_time * u_drift;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = uv * vec2(aspect, 1.0) * scale + vec2(0.0, -time * 0.04 * scale / 6.0);
  vec2 cell = floor(p);
  vec2 f = fract(p);

  float on = step(0.8, hash(cell + seed));
  vec2 centre = 0.2 + 0.6 * vec2(hash(cell + seed + 1.7), hash(cell + seed + 4.3));
  float radius = mix(0.06, 0.16, hash(cell + seed + 8.1));
  float twinkle = 0.75 + 0.25 * sin(time * 0.8 + hash(cell + seed + 2.9) * 6.283);

  return on * smoothstep(radius, 0.0, length(f - centre)) * twinkle;
}

/** Soft round glow centred on `c` (uv), `r` wide, aspect-corrected so it stays round. */
float glow(vec2 uv, vec2 c, float r) {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 d = (uv - c) * vec2(aspect, 1.0);
  return exp(-dot(d, d) / (r * r));
}

void main() {
  // the page's red orbs: one hugging the top-left corner, a dimmer one on the right edge
  float warm = glow(v_uv, vec2(0.02, 0.98), 0.55) * 0.55 + glow(v_uv, vec2(1.02, 0.5), 0.45) * 0.35;
  vec3 color = u_colorBase + u_colorGlow * warm;

  // two layers of specks, the far one smaller and dimmer — a blurred hint of the stars
  float specks = bokeh(v_uv, 6.0, 0.0) * 0.55 + bokeh(v_uv, 11.0, 19.0) * 0.3;
  color += vec3(1.0, 0.92, 0.94) * specks * u_bokeh;

  gl_FragColor = vec4(color, 1.0);
}
