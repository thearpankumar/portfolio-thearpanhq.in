
/* -------------------------------- uniforms -------------------------------- */
// shared with the bars
uniform sampler2D u_tBackdrop;
uniform sampler2D u_tFluid;
uniform sampler2D u_tGradient;
uniform vec2 u_resolution;
uniform float u_time;

// card shape (local units) — for the inner edge light on the face
uniform vec2 u_halfSize;
uniform float u_radius;

// per card
uniform float u_opacity;
uniform float u_active; // 0..1, 1 = resting at the focus
uniform float u_hover;  // 0..1
uniform float u_tintOffset;

/* -------------------------------- varyings -------------------------------- */
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

const float PI = 3.141592653589793;

/* -------------------------------------------------------------------------- */
/*                                    look                                    */
/* -------------------------------------------------------------------------- */
const vec3 LIGHT_DIR = vec3(0.4, 1.0, 0.35); // same key light as the bars
const float REFRACT = 0.05;
const float SMOKE = 0.6;         // how much of the face is smoky body vs. transmitted backdrop
const float EDGE_WIDTH = 0.02;   // inner edge light, local units
const vec3 SMOKE_LO = vec3(0.028, 0.016, 0.02); // dark glass, tinted toward the page background
const vec3 SMOKE_HI = vec3(0.1, 0.062, 0.07);   // …lifted toward the lit top-left
const vec3 GLOW_A = vec3(1.0, 0.12, 0.16);  // the site's red accent
const vec3 GLOW_B = vec3(1.0, 0.42, 0.36);  // coral

/* -------------------------------------------------------------------------- */
/*                                    utils                                   */
/* -------------------------------------------------------------------------- */
vec3 iridescence(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.0, 0.33, 0.67)));
}

float sdRoundRect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

/* -------------------------------------------------------------------------- */
/*                                    main                                    */
/* -------------------------------------------------------------------------- */
void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing)
    N = -N;

  vec3 V = normalize(cameraPosition - vWorldPos);

  // exact screen uv — the face is one big triangle pair, so a per-vertex uv would swim
  vec2 suv = gl_FragCoord.xy / u_resolution;

  // grazing term — ~0 across the face, rising over the bevel and the sides
  float edge = clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0);

  // face coordinates, 0..1 from the bottom-left
  vec2 fuv = vLocalPos.xy / (u_halfSize * 2.0) + 0.5;

  // frosted transmission, then a smoky body that is brighter toward the top-left
  vec3 trans = texture2D(u_tBackdrop, suv + N.xy * REFRACT).rgb;
  float sweep = smoothstep(0.0, 1.0, fuv.y * 0.55 + (1.0 - fuv.x) * 0.45);
  vec3 smoke = mix(SMOKE_LO, SMOKE_HI, sweep);
  float diffuse = max(dot(N, normalize(LIGHT_DIR)), 0.0);
  vec3 body = mix(trans, smoke, SMOKE + 0.08 * u_active) * (0.9 + 0.1 * diffuse);

  // light catching the inside of the rim, on the face only
  float faceMask = step(0.0, vLocalPos.z) * (1.0 - smoothstep(0.2, 0.5, edge));
  float d = sdRoundRect(vLocalPos.xy, u_halfSize, u_radius);
  float innerEdge = faceMask * (1.0 - smoothstep(0.0, EDGE_WIDTH, -d));

  vec3 color = body;
  color += pow(edge, 3.0) * 0.35; // fresnel sheen
  color += innerEdge * 0.22;

  // rainbow over the bevel, like the bars — stronger on the active card
  float phase = edge * 3.0 + N.y * 0.5 + fuv.x * 0.35 + u_time * 0.05;
  color += iridescence(phase) * (pow(edge, 2.0) * 0.5 + innerEdge * 0.12) * (0.55 + 0.45 * u_active);

  // red → coral glow along the rim of the active / hovered card
  float glowAmt = u_active * 0.85 + u_hover * 0.4;
  color += mix(GLOW_A, GLOW_B, fuv.x) * (pow(edge, 1.5) + innerEdge * 1.4) * glowAmt;

  // hover wake — the same fluid that tints the bars
  float reveal = smoothstep(0.0, 0.2, length(texture2D(u_tFluid, suv).xy));
  vec3 tint = texture2D(u_tGradient, vec2(fract(u_tintOffset), 0.5)).rgb;
  color = mix(color, color * 0.75 + tint * 0.4, reveal * 0.3);

  gl_FragColor = vec4(color, u_opacity);
}
