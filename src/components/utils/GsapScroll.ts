import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let intensityTimer: number | undefined;
let flickerTl: gsap.core.Timeline | undefined;
// ScrollTriggers created by the last setCharTimeline call, so a rebuild only
// replaces those and leaves every other section's triggers alone.
let charTriggers: ScrollTrigger[] = [];

// Reading pace of the About and What I Do sections (desktop). Each section keeps
// a scroll-driven timeline for SPAN viewport heights; for HOLD of that timeline
// the section is moved down at the scroll speed, so it stays put on screen (the
// tweens below), and the space is reserved in the layout (About.css / WhatIDo.css
// margin-bottom). ScrollTrigger distances are content pixels, which the smooth
// scroller shrinks by SMOOTHER_SPEED (1.7): 3 screens here is ~1.8 of real scroll.
export const ABOUT_SPAN = 4.2; // viewport heights
export const ABOUT_HOLD = 0.75; // share of the timeline the text stays put
export const WHAT_SPAN = 3;
export const WHAT_HOLD = 0.7;
const px = (heights: number) => heights * window.innerHeight;

export function setCharTimeline(
  character: THREE.Object3D<THREE.Object3DEventMap> | null,
  camera: THREE.PerspectiveCamera
) {
  let intensity: number = 0;
  charTriggers.forEach((t) => t.kill());
  const existing = new Set(ScrollTrigger.getAll());
  // resize rebuilds this function: clear the previous interval/flicker loop
  window.clearInterval(intensityTimer);
  flickerTl?.kill();
  intensityTimer = window.setInterval(() => {
    if (!document.hidden) intensity = Math.random();
  }, 200);
  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: ".about-section",
      start: "center 55%",
      end: () => "+=" + px(ABOUT_SPAN),
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: ".whatIDO",
      start: "top top",
      end: () => "+=" + px(WHAT_SPAN),
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  type MeshStd = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  let screenLight: MeshStd | undefined, monitor: MeshStd | undefined;
  character?.children.forEach((node) => {
    const object = node as MeshStd;
    if (object.name === "Plane004") {
      object.children.forEach((node2) => {
        const child = node2 as MeshStd;
        child.material.transparent = true;
        child.material.opacity = 0;
        if (child.material.name === "Material.027") {
          monitor = child;
          child.material.color.set("#FFFFFF");
        }
      });
    }
    if (object.name === "screenlight") {
      object.material.transparent = true;
      object.material.opacity = 0;
      object.material.emissive.set("#FFB8B8");
      flickerTl = gsap.timeline({ repeat: -1, repeatRefresh: true });
      flickerTl.to(object.material, {
        emissiveIntensity: () => intensity * 8,
        duration: () => Math.random() * 0.6,
        delay: () => Math.random() * 0.1,
      });
      screenLight = object;
    }
  });
  const neckBone = character?.getObjectByName("spine005");
  if (window.innerWidth > 1024) {
    if (character) {
      gsap.set(".character-model", { x: "22%" });
      tl1
        .fromTo(character.rotation, { y: 0 }, { y: -0.6, duration: 1 }, 0)
        .to(camera.position, { z: 22 }, 0)
        .fromTo(".character-model", { x: "22%" }, { x: "22%", duration: 1 }, 0)
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

      tl2
        .to(
          camera.position,
          { z: 75, y: 8.4, duration: 6, delay: 2, ease: "power3.inOut" },
          0
        )
        // moves down as fast as the page scrolls up, so the text holds still
        .to(
          ".about-section",
          { y: () => px(ABOUT_SPAN * ABOUT_HOLD), ease: "none", duration: 6 },
          0
        )
        .to(".about-section", { opacity: 0, delay: 5.2, duration: 1.6 }, 0)
        .fromTo(
          ".character-model",
          { pointerEvents: "inherit", x: "22%" },
          { pointerEvents: "none", x: "-14.5%", delay: 2, duration: 5 },
          0
        )
        .to(character.rotation, { y: 0.92, x: 0.12, delay: 3, duration: 3 }, 0)
        .to(neckBone!.rotation, { x: 0.6, delay: 2, duration: 3 }, 0)
        .to(monitor!.material, { opacity: 1, duration: 0.8, delay: 3.2 }, 0)
        .to(screenLight!.material, { opacity: 1, duration: 0.8, delay: 4.5 }, 0)
        .fromTo(
          ".what-box-in",
          { display: "none" },
          // switched on while the section is still below the screen, so its cards
          // are already there when it slides in
          { display: "flex", duration: 0.1, delay: 5 },
          0
        )
        .fromTo(
          monitor!.position,
          { y: -10, z: 2 },
          { y: 0, z: 0, delay: 1.5, duration: 3 },
          0
        )
        .fromTo(
          ".character-rim",
          { opacity: 1, scaleX: 1.4 },
          { opacity: 0, scale: 0, y: "-70%", duration: 5, delay: 2 },
          0.3
        );

      tl3
        .fromTo(
          ".character-model",
          // x is owned by tl1/tl2 (22% -> -14.5%). Repeating it here made this
          // fromTo render "-14.5%" immediately, overriding the landing position.
          { y: "0%" },
          // leaves once the section has been read (last 30% of the timeline)
          { y: "-100%", duration: 1.5, ease: "none", delay: 3.5 },
          0
        )
        .fromTo(
          ".whatIDO",
          { y: 0 },
          { y: () => px(WHAT_SPAN * WHAT_HOLD), ease: "none", duration: 3.5 },
          0
        )
        .to(character.rotation, { x: -0.04, duration: 2, delay: 1 }, 0);
    }
  } else {
    if (character) {
      const tM2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".what-box-in",
          start: "top 70%",
          end: "bottom top",
        },
      });
      tM2.to(".what-box-in", { display: "flex", duration: 0.1, delay: 0 }, 0);
    }
  }
  charTriggers = ScrollTrigger.getAll().filter((t) => !existing.has(t));
}
