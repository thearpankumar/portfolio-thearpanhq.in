import * as THREE from "three";
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SMOOTHER_SPEED } from "./utils/smoother";
import { techIcons } from "../data/techIcons";
import type { TechIcon } from "../data/techIcons";
import { Environment } from "@react-three/drei";
import { loadHdr } from "./utils/hdr";
import { snapViewport } from "./utils/snapViewport";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { Physics, useSphere } from "@react-three/cannon";

const textureLoader = new THREE.TextureLoader();
const imageUrls = [
  "/images/react2.webp",
  "/images/next2.webp",
  "/images/node2.webp",
  "/images/express.webp",
  "/images/mongo.webp",
  "/images/mysql.webp",
  "/images/typescript.webp",
  "/images/javascript.webp",
];
const imageTextures = imageUrls.map((url) => textureLoader.load(url));

// Same layout as the image textures above: white ground with the icon repeated
// on opposite sides of the sphere so one is always facing the viewer.
const ICON_TEX_W = 1024;
const ICON_TEX_H = 512;
const ICON_SIZE = 250;

function createIconTexture({ src, tile }: TechIcon) {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_TEX_W;
  canvas.height = ICON_TEX_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ICON_TEX_W, ICON_TEX_H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;

  const img = new Image();
  img.onload = () => {
    // fit inside a square, keeping the aspect ratio
    const scale = Math.min(ICON_SIZE / img.width, ICON_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    for (const cx of [ICON_TEX_W * 0.25, ICON_TEX_W * 0.75]) {
      const cy = ICON_TEX_H / 2;
      if (tile) {
        ctx.fillStyle = tile;
        ctx.beginPath();
        ctx.roundRect(cx - ICON_SIZE / 2, cy - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE, 44);
        ctx.fill();
      }
      const pad = tile ? 36 : 0;
      const k = (ICON_SIZE - pad * 2) / ICON_SIZE;
      ctx.drawImage(img, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
    }
    texture.needsUpdate = true;
  };
  img.src = src;
  return texture;
}

const textures = [...imageTextures, ...techIcons.map(createIconTexture)];

// one sphere per texture so every icon is on show
const sphereGeometry = new THREE.SphereGeometry(1, 28, 28);

const spheres = textures.map(() => ({
  scale: [0.7, 1, 0.8, 1, 1][Math.floor(Math.random() * 5)],
}));

type SphereProps = {
  vec?: THREE.Vector3;
  scale: number;
  r?: typeof THREE.MathUtils.randFloatSpread;
  material: THREE.MeshPhysicalMaterial;
  isActive: boolean;
};

// Rapier -> cannon-es settings, chosen to keep the same feel:
//  - mass: a ball of density 1 (Rapier's default collider density)
//  - damping: Rapier decays velocity at rate k per second, cannon-es multiplies by
//    (1 - d)^dt, so d = 1 - e^(-k)
const LINEAR_DAMPING = 1 - Math.exp(-0.75);
const ballMass = (radius: number) => (4 / 3) * Math.PI * radius ** 3;

function SphereGeo({
  vec = new THREE.Vector3(),
  scale,
  r = THREE.MathUtils.randFloatSpread,
  material,
  isActive,
}: SphereProps) {
  // physics runs in a Web Worker; cannon writes the result straight onto `ref`
  const [ref, api] = useSphere<THREE.Mesh>(() => ({
    args: [scale],
    mass: ballMass(scale),
    linearDamping: LINEAR_DAMPING,
    position: [r(20), r(20) - 25, r(20) - 10],
    // The balls never spin, so the icon (which the sphere's UVs put on its +z
    // side, towards the camera) always faces the viewer.
    fixedRotation: true,
  }));

  // cannon drives the mesh through its matrix, so `mesh.position` never changes;
  // the body's real position comes from a subscription to the worker
  const position = useRef(new THREE.Vector3());
  useEffect(
    () => api.position.subscribe(([x, y, z]) => position.current.set(x, y, z)),
    [api]
  );

  // pulled towards the middle of the section
  useFrame((_state, delta) => {
    if (!isActive || !ref.current) return;
    delta = Math.min(0.1, delta);
    vec
      .copy(position.current)
      .normalize()
      .multiply(
        new THREE.Vector3(
          -50 * delta * scale,
          -150 * delta * scale,
          -50 * delta * scale
        )
      );
    api.applyImpulse(vec.toArray(), [0, 0, 0]);
  });

  return (
    <mesh
      ref={ref}
      scale={scale}
      geometry={sphereGeometry}
      material={material}
    />
  );
}

type PointerProps = {
  vec?: THREE.Vector3;
  isActive: boolean;
};

function Pointer({ vec = new THREE.Vector3(), isActive }: PointerProps) {
  // a kinematic ball that follows the cursor and shoves the spheres aside
  const [, api] = useSphere(() => ({
    type: "Kinematic",
    args: [2],
    position: [100, 100, 100],
  }));

  useFrame(({ pointer, viewport }) => {
    if (!isActive) return;
    const targetVec = vec.lerp(
      new THREE.Vector3(
        (pointer.x * viewport.width) / 2,
        (pointer.y * viewport.height) / 2,
        0
      ),
      0.2
    );
    api.position.set(targetVec.x, targetVec.y, targetVec.z);
  });

  return null;
}

// How many screens of real scrolling the section stays pinned full-screen
// before the footer scrolls in.
const TECH_SCREENS = 2;

gsap.registerPlugin(ScrollTrigger, useGSAP);

type TechStackProps = {
  /** false hides the section (below the desktop breakpoint) without unmounting it */
  active?: boolean;
};

const TechStack = ({ active = true }: TechStackProps) => {
  const [isActive, setIsActive] = useState(false);
  const [inView, setInView] = useState(false);
  const [envMap, setEnvMap] = useState<THREE.DataTexture | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Pin the full-screen section so it takes TECH_SCROLL of scrolling to move on.
  // useGSAP (layout timing + auto revert) like the other section pins; the
  // revert removes the pin while the section is hidden.
  useGSAP(
    () => {
      if (!active) return;
      ScrollTrigger.create({
        id: "techstack",
        trigger: wrapRef.current,
        start: "top top",
        end: `+=${TECH_SCREENS * 100 * SMOOTHER_SPEED}%`,
        pin: true,
        invalidateOnRefresh: true,
      });
    },
    { dependencies: [active], revertOnUpdate: true }
  );

  useEffect(() => {
    let cancelled = false;
    let texture: THREE.DataTexture | undefined;
    loadHdr("/models/char_enviorment.hdr")
      .then((tex) => {
        if (cancelled) return tex.dispose();
        texture = tex;
        setEnvMap(tex);
      })
      .catch((err) => console.warn("[TechStack] environment map failed", err));
    return () => {
      cancelled = true;
      texture?.dispose();
    };
  }, []);

  // Stop rendering/physics completely once the section is mostly off screen. The
  // footer slides over the pinned canvas, so "any part visible" would keep the
  // physics and the ambient occlusion running behind it. The last frame stays.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.intersectionRatio > 0.3),
      { threshold: [0, 0.3, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const threshold = document
        .getElementById("work")!
        .getBoundingClientRect().top;
      setIsActive(scrollY > threshold);
    };
    document.querySelectorAll(".header a").forEach((elem) => {
      const element = elem as HTMLAnchorElement;
      element.addEventListener("click", () => {
        const interval = setInterval(() => {
          handleScroll();
        }, 10);
        setTimeout(() => {
          clearInterval(interval);
        }, 1000);
      });
    });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const materials = useMemo(() => {
    return textures.map(
      (texture) =>
        new THREE.MeshPhysicalMaterial({
          map: texture,
          emissive: "#ffffff",
          emissiveMap: texture,
          emissiveIntensity: 0.3,
          metalness: 0.5,
          roughness: 1,
          clearcoat: 0.1,
        })
    );
  }, []);

  return (
    <div
      className="techstack"
      ref={wrapRef}
      style={active ? undefined : { display: "none" }}
    >
      {/* Marquee: two identical groups so translating by -50% -> 0 loops seamlessly */}
      <h2 className="tech-marquee" aria-label="My Techstack">
        <div className="tech-marquee-track" aria-hidden>
          {[0, 1].map((group) => (
            <div className="tech-marquee-group" key={group}>
              {[...Array(5)].map((_, i) => (
                <span key={i}>My Techstack</span>
              ))}
            </div>
          ))}
        </div>
      </h2>

      <Canvas
        dpr={[1, 1.5]}
        frameloop={active && inView ? "always" : "never"}
        gl={{ alpha: true, stencil: false, depth: false, antialias: false }}
        camera={{ position: [0, 0, 20], fov: 32.5, near: 1, far: 100 }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.5;
          snapViewport(gl);
        }}
        className="tech-canvas"
      >
        <ambientLight intensity={1} />
        <spotLight
          position={[20, 20, 25]}
          penumbra={1}
          angle={0.2}
          color="white"
        />
        <directionalLight position={[0, 5, -4]} intensity={2} />
        <Physics
          gravity={[0, 0, 0]}
          allowSleep={false}
          defaultContactMaterial={{ friction: 0.2, restitution: 0 }}
        >
          <Pointer isActive={isActive} />
          {spheres.map((props, i) => (
            <SphereGeo
              key={i}
              {...props}
              material={materials[i % materials.length]}
              isActive={isActive}
            />
          ))}
        </Physics>
        {envMap && (
          <Environment
            map={envMap}
            environmentIntensity={0.5}
            environmentRotation={[0, 4, 2]}
          />
        )}
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <N8AO
            color="#2c0008"
            aoRadius={2}
            intensity={1.15}
            quality="low"
            halfRes
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default TechStack;
