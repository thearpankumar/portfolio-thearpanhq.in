import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SMOOTHER_SPEED } from "./utils/smoother";
import { SWEEP_LEAD } from "./utils/shaderTransition";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./styles/Career.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type CareerItem = {
  year: string;
  headline: string;
  desc: string;
};

// TODO: replace with real career entries
const careerData: CareerItem[] = [
  {
    year: "2022",
    headline: "Position In Company",
    desc: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim labore sit non ipsum temporibus quidem.",
  },
  {
    year: "2023",
    headline: "Position In Company",
    desc: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim labore sit non ipsum temporibus quidem.",
  },
  {
    year: "2024",
    headline: "Position In Company",
    desc: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim labore sit non ipsum temporibus quidem.",
  },
  {
    year: "NOW",
    headline: "Position In Company",
    desc: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim labore sit non ipsum temporibus quidem.",
  },
];

type Variant = "lg" | "md" | "sm";

const getVariant = (): Variant =>
  window.innerWidth >= 1024 ? "lg" : window.innerWidth >= 768 ? "md" : "sm";

// Scroll distance (in % of viewport height) spent on each career entry
const SCROLL_PER_ITEM = 150;
// Screens of real scrolling to rest on the last entry before the shader sweep
// into the Work section begins.
const HOLD_SCREENS = 2;
const ANGLE_STEP = 30;
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

const Career = () => {
  const data = careerData;
  const sectionRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<Variant>(getVariant);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onResize = () => setVariant(getVariant());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Pin the wheel and map scroll progress to the active entry.
  // useGSAP (layout-effect timing, like Work's pin) so pins are created in
  // document order; the context also reverts the pin spacer on cleanup.
  useGSAP(
    () => {
      // distances in ScrollTrigger units (see SMOOTHER_SPEED); the last entry is
      // reached after (n - 1) items, then held before the sweep into Work starts
      const perItem = () => (SCROLL_PER_ITEM / 100) * window.innerHeight;
      const total = () =>
        (data.length - 1) * perItem() +
        HOLD_SCREENS * window.innerHeight * SMOOTHER_SPEED +
        (SWEEP_LEAD / 100) * window.innerHeight;

      ScrollTrigger.create({
        id: "career",
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${total()}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const next = Math.min(
            Math.floor((self.progress * total()) / perItem()),
            data.length - 1
          );
          setActiveIndex((prev) => (prev !== next ? next : prev));
        },
      });
    },
    { dependencies: [data.length, variant] }
  );

  // Group duplicate years so the year ring only shows each once
  const visualIndices = useMemo(() => {
    let current = 0;
    const indices = [0];
    for (let i = 1; i < data.length; i++) {
      if (data[i].year !== data[i - 1].year) current++;
      indices.push(current);
    }
    return indices;
  }, [data]);

  const activeVisualIndex = visualIndices[activeIndex];
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
                viewBox="0 0 1272 1314"
                className="cw-planet"
                style={{ transform: `rotate(${activeIndex * 8}deg)` }}
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

              <div
                className="cw-dots"
                style={{
                  transform: `rotate(${-(START_ANGLE + activeIndex * DOT_ANGLE_STEP)}deg)`,
                }}
              >
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
              <img src="/images/logo.png" alt="Arpan Kumar" />
            </div>

            <div
              className="cw-years"
              style={{
                transform: `rotate(${-(START_ANGLE + activeVisualIndex * ANGLE_STEP)}deg)`,
              }}
            >
              {data.map((item, index) => {
                if (index > 0 && data[index].year === data[index - 1].year)
                  return null;
                const visualIndex = visualIndices[index];
                const angle = START_ANGLE + visualIndex * ANGLE_STEP;
                const isActiveYear = visualIndex === activeVisualIndex;
                // md/sm only show the active year and its neighbours
                const distance = Math.abs(visualIndex - activeVisualIndex);
                const opacity = isLg
                  ? undefined
                  : distance <= 1
                    ? isActiveYear
                      ? 1
                      : 0.4
                    : 0;
                return (
                  <div
                    key={index}
                    className="cw-year-item"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(var(--cw-orbit-radius))`,
                      opacity,
                    }}
                  >
                    <span className={isActiveYear ? "active" : ""}>
                      {item.year}
                    </span>
                  </div>
                );
              })}
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
              <div
                className="cw-text-ring"
                style={{
                  transform: `rotate(${-(START_ANGLE + activeIndex * TEXT_ANGLE_STEP)}deg)`,
                }}
              >
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
