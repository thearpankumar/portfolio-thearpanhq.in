import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SMOOTHER_SPEED } from "./utils/smoother";
import { SWEEP_LEAD } from "./utils/shaderTransition";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { careerItems, type CareerItem } from "../data/career";
import "./styles/Career.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const data = careerItems;
const n = data.length;

// the year ring runs from the first to the last milestone year
const FIRST_YEAR = data[0].year;
const YEARS = Array.from(
  { length: data[n - 1].year - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i
);
// a milestone's place on the timeline, in quarters since Q1 of the first year
const quarterIndex = (item: CareerItem) =>
  (item.year - FIRST_YEAR) * 4 + (item.quarter ? item.quarter - 1 : 0);
const TIMES = data.map(quarterIndex);

const periodLabel = (item: CareerItem) =>
  item.quarter ? `Q${item.quarter} ${item.year}` : `${item.year}`;

type Variant = "lg" | "md" | "sm";

const getVariant = (): Variant =>
  window.innerWidth >= 1024 ? "lg" : window.innerWidth >= 768 ? "md" : "sm";

// Scroll distance (in % of viewport height) spent on each career entry
const SCROLL_PER_ITEM = 120;
// Screens of real scrolling to rest on the last entry before the shader sweep
// into the Work section begins.
const HOLD_SCREENS = 2;
// Share of each milestone's scroll spent resting on it before the rings move on
const DWELL = 0.4;
const ANGLE_STEP = 30;
const QUARTER_STEP = 90;
const DOT_ANGLE_STEP = 15;
const TEXT_ANGLE_STEP = 20;
const START_ANGLE = -60;

const particles = [
  { x: 82, y: 38, size: 4, opacity: 0.5 },
  { x: 90, y: 45, size: 5, opacity: 0.7 },
  { x: 75, y: 52, size: 3, opacity: 0.4 },
  { x: 88, y: 58, size: 6, opacity: 0.6 },
  { x: 78, y: 65, size: 4, opacity: 0.5 },
  { x: 92, y: 70, size: 5, opacity: 0.6 },
  { x: 70, y: 55, size: 3, opacity: 0.4 },
  { x: 85, y: 75, size: 4, opacity: 0.5 },
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Scroll position -> the wheel's state. `u` counts milestones (0 .. n - 1).
 * Each stretch rests on a milestone, then eases to the next, so the rings are
 * aligned with the pointer at rest and in motion in between:
 *  - pos      milestone index as a float (drives the dots and the text ring)
 *  - quarters time in quarters since the first year's Q1; the quarter ring turns
 *             a quarter at a time, so it spins through the gap between milestones
 *  - years    the year ring, which only steps on while the quarter ring passes
 *             from Q4 to the next Q1
 *  - lit      how much the quarter ring should light its pointed-at quarter
 *             (0 for a milestone that only has a year)
 */
function locate(u: number) {
  const i = Math.min(Math.floor(u), n - 2);
  const s = smooth(clamp01((u - i - DWELL) / (1 - DWELL)));
  const quarters = lerp(TIMES[i], TIMES[i + 1], s);
  const wholeYears = Math.floor(quarters / 4);
  return {
    pos: i + s,
    quarters,
    years: wholeYears + smooth(clamp01(quarters - wholeYears * 4 - 3)),
    lit: lerp(data[i].quarter ? 1 : 0, data[i + 1].quarter ? 1 : 0, s),
  };
}

const Career = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<SVGSVGElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const yearsRef = useRef<HTMLDivElement>(null);
  const quartersRef = useRef<HTMLDivElement>(null);
  const textRingRef = useRef<HTMLDivElement>(null);
  const yearEls = useRef<(HTMLDivElement | null)[]>([]);
  const quarterEls = useRef<(HTMLSpanElement | null)[]>([]);
  const [variant, setVariant] = useState<Variant>(getVariant);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onResize = () => setVariant(getVariant());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Pin the wheel and turn its rings straight from the scroll position.
  // useGSAP (layout-effect timing, like Work's pin) so pins are created in
  // document order; the context also reverts the pin spacer on cleanup.
  useGSAP(
    () => {
      // distances in ScrollTrigger units (see SMOOTHER_SPEED); the last entry is
      // reached after (n - 1) items, then held before the sweep into Work starts
      const perItem = () => (SCROLL_PER_ITEM / 100) * window.innerHeight;
      const total = () =>
        (n - 1) * perItem() +
        HOLD_SCREENS * window.innerHeight * SMOOTHER_SPEED +
        (SWEEP_LEAD / 100) * window.innerHeight;

      const isLg = variant === "lg";
      const turn = (el: HTMLElement | SVGElement | null, deg: number) => {
        if (el) el.style.transform = `rotate(${deg}deg)`;
      };

      // Everything that moves is written here, on every update, without going
      // through React: the rings are continuous, so state would re-render the
      // wheel on every scroll tick. Only the active milestone is state.
      const update = (progress: number) => {
        const u = Math.min((progress * total()) / perItem(), n - 1);
        const { pos, quarters, years, lit } = locate(u);

        turn(planetRef.current, pos * 8);
        turn(dotsRef.current, -(START_ANGLE + pos * DOT_ANGLE_STEP));
        turn(yearsRef.current, -(START_ANGLE + years * ANGLE_STEP));
        turn(quartersRef.current, -quarters * QUARTER_STEP);
        turn(textRingRef.current, -(START_ANGLE + pos * TEXT_ANGLE_STEP));

        YEARS.forEach((_, i) => {
          const el = yearEls.current[i];
          if (!el) return;
          const distance = Math.abs(i - years);
          el.classList.toggle("active", distance < 0.5);
          // md/sm only show the current year and its neighbours
          el.style.opacity =
            isLg
              ? ""
              : String(
                  distance <= 1
                    ? 1 - 0.6 * distance
                    : Math.max(0, 0.4 * (2 - distance))
                );
        });

        for (let k = 0; k < 4; k++) {
          const el = quarterEls.current[k];
          if (!el) continue;
          // distance of quarter k from the pointer, in quarters (0 .. 2)
          const away = Math.abs((((k - quarters + 2) % 4) + 4) % 4 - 2);
          const glow = clamp01(1 - away) * lit;
          el.style.opacity = String(0.35 + 0.65 * glow);
          el.classList.toggle("active", glow > 0.5);
          // keep the label upright on screen whatever the ring is doing (md/sm
          // turn the whole wheel a quarter turn, so undo that too)
          const upright = (quarters - k) * QUARTER_STEP - (isLg ? 0 : 90);
          el.style.transform = `rotate(${upright}deg)`;
        }

        const next = Math.round(pos);
        setActiveIndex((prev) => (prev !== next ? next : prev));
      };

      ScrollTrigger.create({
        id: "career",
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${total()}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => update(self.progress),
        onRefresh: (self) => update(self.progress),
      });
      update(0);
    },
    // revertOnUpdate: without it useGSAP only reverts on unmount, so a layout
    // change (crossing 768/1024px) left the old pin in place and stacked a
    // second one on it, which pushed the section off screen while pinned
    { dependencies: [variant], revertOnUpdate: true }
  );

  const isLg = variant === "lg";

  return (
    <>
      <div className="career-heading section-container" id="career">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
      </div>
      <div className="career-section" ref={sectionRef}>
        <div className={`cw-panel cw-${variant}`}>
          <div className="cw-origin">
            <div className="cw-system">
              <svg
                ref={planetRef}
                viewBox="0 0 1272 1314"
                className="cw-planet"
                aria-hidden
              >
                <defs>
                  <linearGradient id={`cw-g1-${variant}`} x1="0" x2="1">
                    <stop offset="0" stopColor="#2a2a2a" />
                    <stop offset="1" stopColor="#3a3a3a" />
                  </linearGradient>
                  <linearGradient id={`cw-g2-${variant}`} x1="0" x2="1">
                    <stop offset="0" stopColor="#1f1f1f" />
                    <stop offset="1" stopColor="#2a2a2a" />
                  </linearGradient>
                </defs>
                <circle
                  cx="636"
                  cy="657"
                  r="420"
                  stroke={`url(#cw-g1-${variant})`}
                  strokeWidth="100"
                  fill="none"
                />
                <circle
                  cx="636"
                  cy="657"
                  r="320"
                  stroke={`url(#cw-g2-${variant})`}
                  strokeWidth="4"
                  fill="none"
                  opacity="0.4"
                />
              </svg>

              <svg viewBox="0 0 1272 1314" className="cw-indicator">
                <line
                  x1="1007"
                  y1="657"
                  x2="1105"
                  y2="657"
                  stroke="var(--cw-accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="cw-line"
                />
              </svg>

              <div className="cw-dots" ref={dotsRef}>
                {data.map((_, index) => (
                  <div
                    key={index}
                    className="cw-dot-arm"
                    style={{
                      transform: `rotate(${START_ANGLE + index * DOT_ANGLE_STEP}deg)`,
                    }}
                  >
                    <div className="cw-dot-pos">
                      <div
                        className={`cw-dot ${index === activeIndex ? "active" : ""}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cw-logo">
              <img
                src="/images/logo-avatar.webp"
                alt="Arpan Kumar"
                width={72}
                height={72}
                decoding="async"
              />
            </div>

            {/* two rings round the logo: quarters inside, years outside */}
            <div className="cw-track cw-track-quarters" aria-hidden />
            <div className="cw-track cw-track-years" aria-hidden />

            <div className="cw-quarters" ref={quartersRef} aria-hidden>
              {[0, 1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="cw-quarter-item"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${k * QUARTER_STEP}deg) translateX(var(--cw-quarter-r))`,
                  }}
                >
                  <span
                    ref={(el) => {
                      quarterEls.current[k] = el;
                    }}
                  >
                    Q{k + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="cw-years" ref={yearsRef} aria-hidden>
              {YEARS.map((year, index) => (
                <div
                  key={year}
                  ref={(el) => {
                    yearEls.current[index] = el;
                  }}
                  className="cw-year-item"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${START_ANGLE + index * ANGLE_STEP}deg) translateX(var(--cw-year-r))`,
                  }}
                >
                  <span>{year}</span>
                </div>
              ))}
            </div>

            <div className="cw-particles">
              {particles.map((p, i) => (
                <div
                  key={i}
                  className="cw-particle"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                    background: `rgba(255,255,255,${p.opacity})`,
                    opacity: p.opacity,
                  }}
                />
              ))}
            </div>

            {isLg && (
              <div className="cw-text-ring" ref={textRingRef}>
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="cw-text-arm"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${START_ANGLE + index * TEXT_ANGLE_STEP}deg) translateX(clamp(550px, 65vw, 1100px))`,
                    }}
                  >
                    <div
                      className={`cw-text ${index === activeIndex ? "active" : ""}`}
                    >
                      <span className="cw-period">{periodLabel(item)}</span>
                      <h3>{item.headline}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isLg && (
            <div className="cw-text-bottom">
              <div className="cw-text-stack">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className={`cw-text-item ${index === activeIndex ? "active" : ""}`}
                  >
                    <span className="cw-period">{periodLabel(item)}</span>
                    <h3>{item.headline}</h3>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Career;
