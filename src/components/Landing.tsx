import { PropsWithChildren } from "react";
import "./styles/Landing.css";

// The roles the two lines under "A Creative" cycle through (initialFX.ts). The
// dim line shows role k and the bright line below it role k + 1, so each role
// comes in bright, then rises into the dim line before it leaves.
const ROLES = [
  "Developer",
  "Product Engineer",
  "Open Source Contributor",
  "Biomedical Engineer",
  "AI Native Engineer",
];
// sizes both lines, so the fade and the layout fit the longest role
const LONGEST = ROLES.reduce((a, b) => (b.length > a.length ? b : a));

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              ARPAN <span>KUMAR</span>
            </h1>
          </div>
          <div className="landing-info">
            <h3>A Creative</h3>
            <h2 className="landing-info-h2" aria-hidden="true">
              <span className="landing-role-sizer">{LONGEST}</span>
              {ROLES.map((role) => (
                <div className="landing-role landing-role-dim" key={role}>
                  {role}
                </div>
              ))}
            </h2>
            <h2>
              <span className="landing-role-sizer" aria-hidden="true">
                {LONGEST}
              </span>
              {ROLES.map((_, i) => {
                const role = ROLES[(i + 1) % ROLES.length];
                return (
                  <div className="landing-role landing-role-main" key={role}>
                    {role}
                  </div>
                );
              })}
            </h2>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
