import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { MdCode, MdSecurity } from "react-icons/md";
import { TbFileCv, TbInfinity } from "react-icons/tb";
import "./styles/ResumeMenu.css";

const roles = [
  { label: "DevOps", icon: <TbInfinity /> },
  { label: "Cyber Security", icon: <MdSecurity /> },
  { label: "Software Developer", icon: <MdCode /> },
];

// The resume icon at the top of the side social column (SocialIcons.tsx). It
// opens a flyout beside the column: a short connector reaches out, a rail draws
// down, and each role slides in along it.
const ResumeMenu = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); // clicked / keyboard
  const [hovered, setHovered] = useState(false); // mouse only
  const [pulse, setPulse] = useState<string | null>(null);
  const expanded = open || hovered;

  // a click elsewhere or Escape closes a menu opened by click or keyboard
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // hover only where there really is one: on touch screens the emulated
  // mouseenter of a tap would otherwise hold the menu open after closing it
  const canHover = () => window.matchMedia("(hover: hover)").matches;

  // The roles only play an animation for now
  const press = (label: string) => {
    setPulse(null);
    window.requestAnimationFrame(() => setPulse(label));
    window.setTimeout(() => setPulse(null), 700);
  };

  return (
    <div
      ref={rootRef}
      className={`resume-menu${expanded ? " open" : ""}`}
      onMouseEnter={() => canHover() && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="resume-trigger"
        aria-label="Resume"
        aria-haspopup="true"
        aria-expanded={expanded}
        aria-controls="resume-roles"
        onClick={() => setOpen((o) => !o)}
      >
        <TbFileCv />
      </button>

      <ul className="resume-roles" id="resume-roles" aria-label="Roles">
        {roles.map((role, i) => (
          <li key={role.label} style={{ "--i": i } as CSSProperties}>
            <button
              type="button"
              className={`resume-role${pulse === role.label ? " pulse" : ""}`}
              tabIndex={expanded ? 0 : -1}
              onClick={() => press(role.label)}
            >
              <span className="resume-role__icon" aria-hidden="true">
                {role.icon}
              </span>
              <span className="resume-role__label">{role.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResumeMenu;
