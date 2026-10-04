import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SMOOTHER_SPEED } from "./utils/smoother";
import { SWEEP_LEAD, shaderTransition } from "./utils/shaderTransition";
import { useLoading } from "../context/useLoading";
import { projects, type Project } from "../data/projects";
import type { XylophoneScene } from "./Xylophone/XylophoneScene";
import "./styles/Work.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Screens of real scrolling the section stays pinned before the shader sweep to
// the next section begins. Scrolling anywhere but on the helix just runs this
// down; scrolling on the helix turns the projects instead (see Xylophone/).
const HOLD_SCREENS = 1;

const pad = (n: number) => String(n).padStart(2, "0");

// A card opens its project; one without a link (e.g. private work) is still a
// focusable card, so it can be brought round with the keyboard like the rest.
const CardLink = ({
  project,
  children,
}: {
  project: Project;
  children: ReactNode;
}) =>
  project.url ? (
    <a
      className="work-card__link"
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
    >
      {children}
    </a>
  ) : (
    <div className="work-card__link" tabIndex={0} aria-label={project.title}>
      {children}
    </div>
  );

const Work = () => {
  const { isLoading } = useLoading();
  const sectionRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const sceneRef = useRef<XylophoneScene | null>(null);
  const [active, setActive] = useState(0);
  const [isStatic, setIsStatic] = useState(false);

  // The section stays pinned for a short hold, then the sweep into the next
  // section runs. The helix only turns while the cursor is on it.
  useGSAP(() => {
    // the shader sweep to the next section starts SWEEP_LEAD before the pin
    // ends, so extend the hold by that much to make it begin only after it
    const hold = () =>
      HOLD_SCREENS * window.innerHeight * SMOOTHER_SPEED +
      (SWEEP_LEAD / 100) * window.innerHeight;

    const trigger = ScrollTrigger.create({
      id: "work",
      trigger: sectionRef.current,
      start: "top top",
      end: () => `+=${hold()}`,
      pin: true,
      invalidateOnRefresh: true,
    });
    triggerRef.current = trigger;

    // kill(true) reverts the pin, removing its spacer. Without the revert a stale
    // spacer is left behind when React re-runs the effect (StrictMode) and the
    // second pin nests inside it, collapsing the space after this section.
    return () => {
      triggerRef.current = null;
      trigger.kill(true);
    };
  }, []);

  // The helix may only take the wheel once the section has settled in view
  // (pinned, its top at the top of the screen) and no shader sweep is running:
  // a gesture that starts while the page is still arriving, or mid-transition,
  // must keep scrolling the page instead of stopping it half way.
  const canCapture = useCallback(() => {
    const stage = sectionRef.current;
    if (!stage || !triggerRef.current?.isActive) return false;

    // isActive already means pinned; the slack covers phones, where the pinned
    // section can sit a few dozen pixels off the very top
    const sweep = shaderTransition.value;
    const settled =
      Math.abs(stage.getBoundingClientRect().top) < window.innerHeight * 0.1;
    return settled && (sweep <= 0.001 || sweep >= 0.999);
  }, []);

  // The WebGL scene (three, postprocessing, a fluid sim) loads only once the
  // preloader has gone, so nothing competes with the intro animation.
  useEffect(() => {
    const stage = sectionRef.current;
    if (isLoading || !stage) return;

    let cancelled = false;
    import("./Xylophone/XylophoneScene")
      .then(({ XylophoneScene }) => {
        if (cancelled) return;
        sceneRef.current = new XylophoneScene(stage, {
          canCapture,
          onProjectChange: setActive,
        });
      })
      .catch((err) => {
        // no WebGL (or the chunk failed): show the projects as a plain list
        console.warn(
          "[Work] xylophone unavailable, showing a static list",
          err
        );
        if (!cancelled) setIsStatic(true);
      });

    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, [isLoading, canCapture]);

  return (
    <section
      className={`work-section${isStatic ? " is-static" : ""}`}
      id="work"
      ref={sectionRef}
      aria-labelledby="work-title"
    >
      {/* glass project cards; the scene lays each one over its WebGL slab */}
      <div className="work-cards">
        <ol className="work-cards__list">
          {projects.map((project) => (
            <li className="work-card" key={project.title}>
              <CardLink project={project}>
                <img
                  className="work-card__thumb"
                  src={project.image}
                  alt=""
                  decoding="async"
                  draggable={false}
                />
                <span className="work-card__body">
                  <span className="work-card__title">{project.title}</span>
                  <span className="work-card__desc">{project.description}</span>
                  <span className="work-card__tags">
                    {project.tags.map((tag) => (
                      <span className="work-card__tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="work-card__side">
                  <span className="work-card__year">{project.year}</span>
                  {project.url && (
                    <span className="work-card__go" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  )}
                </span>
              </CardLink>
            </li>
          ))}
        </ol>
      </div>

      <div className="work-overlay">
        <header className="work-intro">
          <h2 id="work-title">
            My <span>Work</span>
          </h2>
          <p className="work-intro__text">
            Selected work across AI, security, firmware and open source. Scroll
            on the helix to bring each project round.
          </p>
        </header>

        <div className="work-progress">
          <span className="work-progress__track" aria-hidden="true">
            <span className="work-progress__dot" />
          </span>
          <div className="work-progress__label">
            <span className="work-progress__count" aria-live="polite">
              {`${pad(active + 1)} / ${pad(projects.length)}`}
            </span>
            <span className="work-progress__hint">
              Scroll on the helix
              <br />
              to explore projects
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Work;
