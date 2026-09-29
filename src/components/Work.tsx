import "./styles/Work.css";
import WorkImage from "./WorkImage";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SMOOTHER_SPEED } from "./utils/smoother";
import { SWEEP_LEAD } from "./utils/shaderTransition";

gsap.registerPlugin(useGSAP);

// Screens of real scrolling to rest on the last project card before the shader
// transition to the next section begins.
const HOLD_SCREENS = 2;

const Work = () => {
  useGSAP(() => {
  let translateX: number = 0;

  function setTranslateX() {
    const box = document.getElementsByClassName("work-box");
    const rectLeft = document
      .querySelector(".work-container")!
      .getBoundingClientRect().left;
    const rect = box[0].getBoundingClientRect();
    const parentWidth = box[0].parentElement!.getBoundingClientRect().width;
    const padding: number =
      parseInt(window.getComputedStyle(box[0]).padding) / 2;
    translateX = rect.width * box.length - (rectLeft + parentWidth) + padding;
  }

  setTranslateX();

  // Pin distances are in ScrollTrigger units, which the smooth scroller shrinks
  // by SMOOTHER_SPEED; scale by it so a hold is HOLD_SCREENS of real scrolling.
  const vh = window.innerHeight;
  // the shader sweep to the next section starts SWEEP_LEAD before the pin ends,
  // so extend the end hold by that much to make it begin only after the hold
  const endHold = HOLD_SCREENS * vh * SMOOTHER_SPEED + (SWEEP_LEAD / 100) * vh;

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: ".work-section",
      start: "top top",
      end: `+=${translateX + endHold}`,
      scrub: true,
      pin: true,
      id: "work",
    },
  });

  // slide across, then rest on the last card
  timeline.to(".work-flex", { x: -translateX, duration: translateX }, 0);
  timeline.to({}, { duration: endHold }, translateX);
  // kill(true) reverts the pin, removing its spacer. Without the revert a stale
  // spacer is left behind when React re-runs the effect (StrictMode) and the
  // second pin nests inside it, collapsing the space after this section.
  return () => {
    timeline.scrollTrigger?.kill(true);
    timeline.kill();
  };
}, []);
  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>
        <div className="work-flex">
          {[...Array(6)].map((_value, index) => (
            <div className="work-box" key={index}>
              <div className="work-info">
                <div className="work-title">
                  <h3>0{index + 1}</h3>

                  <div>
                    <h4>Project Name</h4>
                    <p>Category</p>
                  </div>
                </div>
                <h4>Tools and features</h4>
                <p>Javascript, TypeScript, React, Threejs</p>
              </div>
              <WorkImage image="/images/placeholder.webp" alt="" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Work;
