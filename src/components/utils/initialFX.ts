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

  const landingText2 = new SplitText(".landing-h2-info", TextProps);
  const landingText3 = new SplitText(".landing-h2-info-1", TextProps);
  const landingText4 = new SplitText(".landing-h2-1", TextProps);
  const landingText5 = new SplitText(".landing-h2-2", TextProps);

  // Immediately hide the secondary texts so they never superimpose
  gsap.set(landingText3.chars, { opacity: 0, y: 60 });
  gsap.set(landingText5.chars, { opacity: 0, y: 60 });

  gsap.fromTo(
    landingText2.chars,
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
    landingText4.chars,
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

  LoopText(landingText2, landingText3);
  LoopText(landingText4, landingText5);
}

function LoopText(Text1: SplitText, Text2: SplitText) {
  const tl = gsap.timeline({ repeat: -1 });
  const duration = 0.85;
  const stagger = 0.02;
  const hold = 3.0;

  tl.set(Text1.chars, { opacity: 1, y: 0 }, 0)
    .set(Text2.chars, { opacity: 0, y: 50 }, 0)
    .to(
      Text1.chars,
      {
        opacity: 0,
        y: -50,
        duration: duration,
        ease: "power2.inOut",
        stagger: stagger,
      },
      `+=${hold}`
    )
    .to(
      Text2.chars,
      {
        opacity: 1,
        y: 0,
        duration: duration,
        ease: "power2.inOut",
        stagger: stagger,
      },
      "<0.08"
    )
    .to(
      Text2.chars,
      {
        opacity: 0,
        y: -50,
        duration: duration,
        ease: "power2.inOut",
        stagger: stagger,
      },
      `+=${hold}`
    )
    .fromTo(
      Text1.chars,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: duration,
        ease: "power2.inOut",
        stagger: stagger,
      },
      "<0.08"
    )
    .set(Text2.chars, { opacity: 0, y: 50 })
    .to({}, { duration: hold });
}
