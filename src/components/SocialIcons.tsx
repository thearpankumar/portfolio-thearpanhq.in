import {
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";
import ResumeMenu from "./ResumeMenu";
import "./styles/SocialIcons.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SocialIcons = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  // Vertical column everywhere; while the footer scrolls in, each icon glides
  // into its slot in the footer and ends up laid out horizontally.
  //
  // Each frame the icon is placed between its column spot and the slot's *live*
  // position, weighted by the eased scroll progress. Because the target is the
  // slot itself (not a precomputed guess), the icon stays glued to it while the
  // page's smooth scroller is still settling, so the end of the move is smooth
  // and lands exactly. No extra scrub smoothing is added on top of the scroller.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px)", () => {
        const icons = gsap.utils.toArray<HTMLElement>(
          "#social > span",
          rootRef.current
        );
        const footer = document.getElementById("contact");
        if (!footer || !icons.length) return;

        const ease = gsap.parseEase("power2.inOut");
        const setters = icons.map((icon) => ({
          x: gsap.quickSetter(icon, "x", "px"),
          y: gsap.quickSetter(icon, "y", "px"),
        }));
        const offset = icons.map(() => ({ x: 0, y: 0 }));
        let settled = true; // icons are at rest in their column

        const st = ScrollTrigger.create({
          trigger: footer,
          start: "top bottom",
          end: "bottom bottom",
        });

        const tick = () => {
          const progress = st.progress;
          if (progress === 0 && settled) return;
          const p = ease(progress);
          const slots = footer.querySelectorAll<HTMLElement>(
            ".contact-icon-target"
          );
          // read every rect first, then write, so the frame never thrashes layout
          const reads = icons.map((icon, i) => {
            const from = icon.getBoundingClientRect();
            const to = slots[i]?.getBoundingClientRect();
            return { from, to };
          });
          reads.forEach(({ from, to }, i) => {
            if (!to) return;
            // where the icon sits with no transform applied
            const baseLeft = from.left - offset[i].x;
            const baseTop = from.top - offset[i].y;
            offset[i].x = (to.left - baseLeft) * p;
            offset[i].y = (to.top - baseTop) * p;
            setters[i].x(offset[i].x);
            setters[i].y(offset[i].y);
          });
          settled = progress === 0;
        };

        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          st.kill();
          icons.forEach((icon) => gsap.set(icon, { clearProps: "x,y" }));
        };
      });
    },
    { scope: rootRef }
  );

  // Each icon leans toward the pointer when it comes close. One loop per icon,
  // all stopped (and their listeners removed) when the component unmounts.
  useEffect(() => {
    const social = rootRef.current?.querySelector<HTMLElement>("#social");
    if (!social) return;
    const cleanups: (() => void)[] = [];

    social.querySelectorAll<HTMLElement>(":scope > span").forEach((item) => {
      const link = item.querySelector<HTMLElement>(":scope > a, .resume-trigger");
      if (!link) return;

      const rect = item.getBoundingClientRect();
      let mouseX = rect.width / 2;
      let mouseY = rect.height / 2;
      let currentX = 0;
      let currentY = 0;
      let raf = 0;

      const updatePosition = () => {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;

        link.style.setProperty("--siLeft", `${currentX}px`);
        link.style.setProperty("--siTop", `${currentY}px`);

        raf = requestAnimationFrame(updatePosition);
      };

      const onMouseMove = (e: MouseEvent) => {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 40 && x > 10 && y < 40 && y > 5) {
          mouseX = x;
          mouseY = y;
        } else {
          mouseX = rect.width / 2;
          mouseY = rect.height / 2;
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      updatePosition();

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        document.removeEventListener("mousemove", onMouseMove);
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return (
    <div className="icons-section" ref={rootRef}>
      <div className="social-icons" data-cursor="icons" id="social">
        <span className="social-resume">
          <ResumeMenu />
        </span>
        <span>
          <a href="https://github.com/thearpankumar" target="_blank" rel="noreferrer">
            <FaGithub />
          </a>
        </span>
        <span>
          <a href="https://linkedin.com/in/thearpankumar" target="_blank" rel="noreferrer">
            <FaLinkedinIn />
          </a>
        </span>
        <span>
          <a href="#" target="_blank" rel="noreferrer">
            <FaXTwitter />
          </a>
        </span>
        <span>
          <a href="https://instagram.com/arpankumar1119" target="_blank" rel="noreferrer">
            <FaInstagram />
          </a>
        </span>
      </div>
    </div>
  );
};

export default SocialIcons;
