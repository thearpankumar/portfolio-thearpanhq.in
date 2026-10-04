import { SplitText } from "gsap/SplitText";
import gsap from "gsap";
import { smootherRef } from "./smoother";

export function initialFX() {
  document.body.style.overflowY = "auto";
  smootherRef.current?.paused(false);
  document.getElementsByTagName("main")[0].classList.add("main-active");
  gsap.to("body", {
    backgroundColor: "#0c0708",
    duration: 0.5,
    delay: 1,
  });

  const landingText = new SplitText(
    [".landing-info h3", ".landing-intro h2", ".landing-intro h1"],
    {
      type: "chars,lines",
      linesClass: "split-line",
    }
  );
  gsap.fromTo(
    landingText.chars,
    { opacity: 0, y: 80, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1.2,
      filter: "blur(0px)",
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.3,
    }
  );

  const TextProps = { type: "chars,lines", linesClass: "split-h2" };

  // one SplitText per role, in the order each line shows them (Landing.tsx)
  const split = (selector: string) =>
    gsap.utils
      .toArray<HTMLElement>(selector)
      .map((el) => new SplitText(el, TextProps));
  const dimRoles = split(".landing-role-dim");
  const mainRoles = split(".landing-role-main");

  // Immediately hide all but the first pair so they never superimpose
  gsap.set(
    [...dimRoles.slice(1), ...mainRoles.slice(1)].flatMap((t) => t.chars),
    { opacity: 0, y: 60 }
  );

  gsap.fromTo(
    mainRoles[0].chars,
    { opacity: 0, y: 80, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1.2,
      filter: "blur(0px)",
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.3,
    }
  );

  gsap.fromTo(
    dimRoles[0].chars,
    { opacity: 0, y: 80, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1.2,
      filter: "blur(0px)",
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.3,
    }
  );

  gsap.fromTo(
    ".landing-info-h2",
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      y: 0,
      delay: 0.8,
    }
  );
  gsap.fromTo(
    [".header", ".icons-section", ".nav-fade"],
    { opacity: 0 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      delay: 0.1,
    }
  );

  rotateRoles(dimRoles, mainRoles);
}

// Both lines step through the roles together, two on screen at a time: each
// step the current pair leaves upwards and the next pair rises in, so the role
// that was bright moves up into the dim line and a new one comes in bright.
function rotateRoles(dim: SplitText[], main: SplitText[]) {
  const count = Math.min(dim.length, main.length);
  if (count < 2) return;

  const tl = gsap.timeline({ repeat: -1 });
  const hold = 3.0;
  const motion = { duration: 0.85, ease: "power2.inOut", stagger: 0.02 };
  const below = { opacity: 0, y: 50 };
  const pair = (i: number) => [...dim[i].chars, ...main[i].chars];

  tl.set(pair(0), { opacity: 1, y: 0 }, 0);
  for (let i = 1; i < count; i++) tl.set(pair(i), below, 0);

  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    tl.to(dim[i].chars, { opacity: 0, y: -50, ...motion }, `+=${hold}`)
      .to(main[i].chars, { opacity: 0, y: -50, ...motion }, "<")
      .fromTo(dim[next].chars, below, { opacity: 1, y: 0, ...motion }, "<0.08")
      .fromTo(main[next].chars, below, { opacity: 1, y: 0, ...motion }, "<");
  }
}
