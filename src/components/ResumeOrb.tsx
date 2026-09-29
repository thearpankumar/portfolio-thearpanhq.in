import { useState } from "react";
import type { CSSProperties } from "react";
import { MdCode, MdSecurity } from "react-icons/md";
import { TbInfinity } from "react-icons/tb";
import "./styles/ResumeOrb.css";

// "RESUME  •  " written 3 times fills the ring's circumference
const RING_TEXT = "RESUME  •  RESUME  •  RESUME  •  ";

// angle = direction on the fan in degrees (0 = right, 90 = straight down)
const roles = [
  { label: "DevOps", icon: <TbInfinity />, angle: 10 },
  { label: "Cyber Security", icon: <MdSecurity />, angle: 52 },
  { label: "Software Developer", icon: <MdCode />, angle: 94 },
];

const ResumeOrb = () => {
  const [open, setOpen] = useState(false); // touch devices, where there is no hover
  const [pulse, setPulse] = useState<string | null>(null);

  // The buttons only play an animation for now
  const press = (label: string) => {
    setPulse(null);
    window.requestAnimationFrame(() => setPulse(label));
    window.setTimeout(() => setPulse(null), 700);
  };

  return (
    <div
      className={`resume-orb ${open ? "open" : ""}`}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="resume-spin">
        <svg className="resume-ring" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <path
              id="resume-ring-path"
              d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0"
            />
          </defs>
          <circle cx="50" cy="50" r="47" className="resume-ring-line" />
          <text className="resume-ring-text">
            <textPath
              href="#resume-ring-path"
              textLength="250"
              lengthAdjust="spacing"
            >
              {RING_TEXT}
            </textPath>
          </text>
        </svg>
        <a
          href="/#"
          className="navbar-title"
          data-cursor="disable"
          aria-label="Home. Hover for roles"
          onClick={(e) => {
            // no hover on touch screens: the first tap opens the fan
            if (window.matchMedia("(hover: none)").matches && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <img
            src="/images/logo.png"
            alt="Arpan Kumar"
            className="navbar-logo"
          />
        </a>
      </div>

      <div className="resume-fan">
        <div className="resume-blob" aria-hidden /> {/* hover bridge, invisible */}
        {roles.map((role, i) => (
          <button
            key={role.label}
            type="button"
            className={`resume-btn ${pulse === role.label ? "pulse" : ""}`}
            style={
              {
                "--a": `${role.angle}deg`,
                "--i": i,
              } as CSSProperties
            }
            data-label={role.label}
            aria-label={role.label}
            onClick={() => press(role.label)}
          >
            {role.icon}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ResumeOrb;
