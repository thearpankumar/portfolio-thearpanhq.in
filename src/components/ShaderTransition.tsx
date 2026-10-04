import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  SEAM_ID_PREFIX,
  SWEEP_LEAD,
  shaderTransition,
} from "./utils/shaderTransition";
import "./styles/ShaderTransition.css";

gsap.registerPlugin(ScrollTrigger);


// Noise-wipe transition adapted from references/Shader-Transition. The band
// sweeps up, covers the screen at progress 0.5 and clears by 1; alpha is 0 at
// both ends so it is invisible when idle.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uProgress;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec2(13.7, 9.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 3.0;
    float t = uProgress * 3.14;

    vec2 warp = vec2(
      fbm(p + vec2(0.0, t * 0.2)),
      fbm(p + vec2(5.2, 1.3) - vec2(t * 0.15, 0.0))
    );
    float w = fbm(p + 0.9 * warp);

    float waves = sin(vUv.x * 6.0 + t) * 0.03 + sin(vUv.x * 13.0 - t) * 0.012;
    float wipe = vUv.y + (w - 0.5) * 0.3 + waves;

    float coverP = smoothstep(0.0, 0.55, uProgress);
    float clearP = smoothstep(0.45, 1.0, uProgress);
    float frontPos = coverP * 2.2 - 0.35;
    float backPos = clearP * 2.2 - 0.35;
    float covered = smoothstep(wipe - 0.1, wipe + 0.1, frontPos);
    float cleared = smoothstep(wipe - 0.1, wipe + 0.1, backPos);
    float band = covered - cleared;

    float dEdge = min(frontPos - wipe, wipe - backPos);
    float body = smoothstep(0.05, 0.6, dEdge);
    float hide = 1.0 - smoothstep(0.08, 0.18, abs(uProgress - 0.5));
    float alpha = band * mix(0.3, 1.0, max(body, hide));

    float tint = clamp(1.0 - body + (w - 0.5) * 0.4, 0.0, 1.0);
    vec3 color = mix(uColorA, uColorB, tint);
    color += 0.03 * vec3(sin(w * 8.0 + t), sin(w * 8.0 + t + 2.1), sin(w * 8.0 + t + 4.2));

    float frontGlow = 1.0 - smoothstep(0.0, 0.25, abs(frontPos - wipe));
    float backGlow = 1.0 - smoothstep(0.0, 0.25, abs(backPos - wipe));
    color += (frontGlow + backGlow) * 0.12;

    gl_FragColor = vec4(color, alpha);
  }
`;

const Plane = ({ onActive }: { onActive: (active: boolean) => void }) => {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const invalidate = useThree((s) => s.invalidate);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uColorA: { value: new THREE.Color("#4a0410") },
      uColorB: { value: new THREE.Color("#ff5c5c") },
    }),
    []
  );

  // frameloop="demand": render only when the scroll progress changes
  useEffect(() => {
    const apply = (v: number) => {
      mat.current.uniforms.uProgress.value = v;
      onActive(v > 0.001 && v < 0.999);
      invalidate();
    };
    apply(shaderTransition.value);
    return shaderTransition.subscribe(apply);
  }, [invalidate, onActive]);

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

type ShaderTransitionProps = {
  /** changes whenever .shader-seam markers are added or removed */
  seams?: string;
};

const ShaderTransition = ({ seams }: ShaderTransitionProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Respect the OS "reduce motion" setting: no full-screen wipe at all
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // One non-pinned trigger per seam marker: as the seam travels from the
  // bottom to the top of the viewport, the transition plays 0 -> 1.
  useEffect(() => {
    if (reducedMotion) return;
    const seams = gsap.utils.toArray<HTMLElement>(".shader-seam");
    const triggers = seams.map((seam, i) =>
      ScrollTrigger.create({
        id: `${SEAM_ID_PREFIX}${i}`,
        trigger: seam,
        // begins before the seam enters the viewport, so the sweep spans ~1.8
        // screens of scroll instead of one
        start: `top bottom+=${SWEEP_LEAD}%`,
        end: "top top",
        onUpdate: (self) => shaderTransition.set(self.progress),
      })
    );
    return () => {
      triggers.forEach((t) => t.kill());
      shaderTransition.set(0);
    };
  }, [reducedMotion, seams]);

  const setActive = useMemo(
    () => (active: boolean) => {
      if (wrapRef.current) {
        wrapRef.current.style.visibility = active ? "visible" : "hidden";
      }
    },
    []
  );

  if (reducedMotion) return null;

  return (
    <div className="shader-transition" ref={wrapRef} aria-hidden>
      <Canvas
        frameloop="demand"
        dpr={1}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          // r3f forces pointer-events:auto on its canvas, which would block the page
          gl.domElement.style.pointerEvents = "none";
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Plane onActive={setActive} />
      </Canvas>
    </div>
  );
};

export default ShaderTransition;
