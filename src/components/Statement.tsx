import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "./styles/Statement.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TEXT =
  "I love doing research, building products, and working with teams to turn ideas into reality.";

// Full-screen horizontal-scroll statement, adapted from
// references/elfekky-portfolio HorizontalScroll: the screen pins, the line slides
// right-to-left with scroll, and each letter flies in with a random offset/tilt.
const Statement = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  // useGSAP: layout-effect timing so pins are created in document order, and
  // the context reverts the pin spacer and every trigger below on cleanup.
  useGSAP(
    () => {
      const text = textRef.current;
      const sticky = stickyRef.current;
      if (!text || !sticky) return;

      // Pin for as long as the text needs to travel off screen, so the next
      // section only arrives once the line has fully played.
      const getPinDistance = () =>
        Math.max(text.scrollWidth - window.innerWidth * 0.1, window.innerWidth);

      const scrollTween = gsap.to(text, {
        xPercent: -110,
        ease: "none",
        scrollTrigger: {
          trigger: sticky,
          start: "top top",
          end: () => "+=" + getPinDistance(),
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      text.querySelectorAll(".hs-char").forEach((char) => {
        gsap.from(char, {
          yPercent: gsap.utils.random(-200, 200),
          rotation: gsap.utils.random(-20, 20),
          ease: "back.out(1.2)",
          scrollTrigger: {
            trigger: char,
            containerAnimation: scrollTween,
            start: "left 100%",
            end: "left 30%",
            scrub: 1,
          },
        });
      });
    },
    { scope: wrapRef }
  );

  return (
    <section className="statement" ref={wrapRef} aria-label={TEXT}>
      <div className="hs-sticky" ref={stickyRef}>
        <h3 className="statement-text" ref={textRef} aria-hidden>
          {TEXT.split(" ").map((word, wi, words) => (
            <span className="hs-word" key={wi}>
              {word.split("").map((char, ci) => (
                <span className="hs-char" key={ci}>
                  {char}
                </span>
              ))}
              {wi < words.length - 1 && <span className="hs-char">&nbsp;</span>}
            </span>
          ))}
        </h3>
      </div>
    </section>
  );
};

export default Statement;
