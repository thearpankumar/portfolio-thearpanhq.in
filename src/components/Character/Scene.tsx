import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/useLoading";
import handleResize from "./utils/resizeUtils";
import {
  handleMouseMove,
  handleTouchEnd,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../utils/progress";
import { snapViewport } from "../utils/snapViewport";

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());
  const { setLoading } = useLoading();

  const [, setChar] = useState<THREE.Object3D | null>(null);
  const characterRef = useRef<THREE.Object3D | null>(null);
  useEffect(() => {
    const canvasEl = canvasDiv.current;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const container = { width: rect.width, height: rect.height };
      const aspect = container.width / container.height;
      const scene = sceneRef.current;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setSize(container.width, container.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      snapViewport(renderer);
      canvasEl.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
      camera.position.z = 10;
      camera.position.set(0, 13.1, 24.7);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();

      let headBone: THREE.Object3D | null = null;
      let screenLight: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
      let mixer: THREE.AnimationMixer;

      // THREE.Clock is deprecated; seconds since the previous call is all this needs
      let lastTime = performance.now();
      const getDelta = () => {
        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        return delta;
      };

      const light = setLighting(scene);
      const progress = setProgress((value) => setLoading(value));
      // set in cleanup so a superseded mount never adds a second character
      let cancelled = false;
      const { loadCharacter } = setCharacter(
        renderer,
        scene,
        camera,
        () => cancelled,
        light.environment
      );

      loadCharacter().then((gltf) => {
        if (gltf && !cancelled) {
          const animations = setAnimations(gltf);
          if (hoverDivRef.current) {
            animations.hover(gltf, hoverDivRef.current);
          }
          mixer = animations.mixer;
          const character = gltf.scene;
          characterRef.current = character;
          setChar(character);
          scene.add(character);
          headBone = character.getObjectByName("spine006") || null;
          screenLight =
            (character.getObjectByName("screenlight") as typeof screenLight) ||
            null;
          progress.loaded().then(() => {
            if (cancelled) return;
            setTimeout(() => {
              if (cancelled) return;
              light.turnOnLights();
              animations.startIntro();
            }, 2500);
          });
          window.addEventListener("resize", onResize);
        }
      });

      let resizeTimer: number | undefined;
      const onResize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (characterRef.current) {
            handleResize(renderer, camera, canvasDiv, characterRef.current);
          }
        }, 150);
      };

      let mouse = { x: 0, y: 0 },
        interpolation = { x: 0.1, y: 0.2 };

      const onMouseMove = (event: MouseEvent) => {
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };
      // a finger held for 200ms steers the head until it lifts (a quick swipe
      // just scrolls the page)
      let debounce: number | undefined;
      let following = false;
      const onTouchStart = () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => (following = true), 200);
      };
      const onTouchMove = (event: TouchEvent) => {
        if (following) handleTouchMove(event, (x, y) => (mouse = { x, y }));
      };

      const onTouchEnd = () => {
        window.clearTimeout(debounce);
        following = false;
        handleTouchEnd((x, y, interpolationX, interpolationY) => {
          mouse = { x, y };
          interpolation = { x: interpolationX, y: interpolationY };
        });
      };

      document.addEventListener("mousemove", onMouseMove, { passive: true });
      const landingDiv = document.getElementById("landingDiv");
      if (landingDiv) {
        // passive: none of them cancels the touch, so scrolling never waits on them
        landingDiv.addEventListener("touchstart", onTouchStart, {
          passive: true,
        });
        landingDiv.addEventListener("touchmove", onTouchMove, { passive: true });
        landingDiv.addEventListener("touchend", onTouchEnd, { passive: true });
      }
      // Only render while the canvas is on screen and the tab is visible
      let rafId = 0;
      let inView = true;
      let running = false;
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        if (headBone) {
          handleHeadRotation(
            headBone,
            mouse.x,
            mouse.y,
            interpolation.x,
            interpolation.y,
            THREE.MathUtils.lerp
          );
          if (screenLight) light.setPointLight(screenLight);
        }
        const delta = getDelta();
        if (mixer) {
          mixer.update(delta);
        }
        renderer.render(scene, camera);
      };
      const start = () => {
        if (running || !inView || document.hidden) return;
        running = true;
        getDelta(); // discard time spent paused
        rafId = requestAnimationFrame(animate);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(rafId);
      };
      const observer = new IntersectionObserver(
        ([entry]) => {
          // Not isIntersecting: that stays true while the canvas merely touches
          // the edge of the screen, where it parks once the section has been read
          inView = entry.intersectionRatio >= 0.01;
          if (inView) start();
          else stop();
        },
        { threshold: [0, 0.01] }
      );
      observer.observe(canvasEl);
      const onVisibility = () => (document.hidden ? stop() : start());
      document.addEventListener("visibilitychange", onVisibility);
      start();
      return () => {
        cancelled = true;
        progress.stop();
        stop();
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        clearTimeout(debounce);
        window.clearTimeout(resizeTimer);
        scene.clear();
        renderer.dispose();
        window.removeEventListener("resize", onResize);
        canvasEl.removeChild(renderer.domElement);
        document.removeEventListener("mousemove", onMouseMove);
        if (landingDiv) {
          landingDiv.removeEventListener("touchstart", onTouchStart);
          landingDiv.removeEventListener("touchmove", onTouchMove);
          landingDiv.removeEventListener("touchend", onTouchEnd);
        }
      };
    }
  }, [setLoading]);

  return (
    <>
      <div className="character-container">
        <div className="character-model" ref={canvasDiv}>
          <div className="character-rim"></div>
          <div className="character-hover" ref={hoverDivRef}></div>
        </div>
      </div>
    </>
  );
};

export default Scene;
