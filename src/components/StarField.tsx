import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import type * as THREE from "three";
import "./styles/StarField.css";

const STAR_COUNT = 5000;
const RADIUS = 1.2;

// Uniformly distributed points inside a sphere (same distribution as the
// SpacePortfolio reference's maath `random.inSphere`).
function randomInSphere(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Stars = () => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => randomInSphere(STAR_COUNT, RADIUS), []);
  const still = useMemo(reducedMotion, []);

  useFrame((_state, delta) => {
    if (still || !ref.current) return;
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.002}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

// A fixed full-page canvas behind everything. It has its own renderer and
// render loop (frameloop "always"), so it keeps running no matter what the
// character scene, the tech-stack canvas or the shader transition are doing.
const StarField = () => (
  <div className="star-field" aria-hidden>
    <Canvas
      camera={{ position: [0, 0, 1] }}
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.domElement.style.pointerEvents = "none";
      }}
    >
      <Stars />
    </Canvas>
  </div>
);

export default StarField;
