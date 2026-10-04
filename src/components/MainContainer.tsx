import { lazy, PropsWithChildren, Suspense, useEffect, useState } from "react";
import About from "./About";
import Career from "./Career";
import Statement from "./Statement";
import Contact from "./Contact";
import Landing from "./Landing";
import Navbar from "./Navbar";
import SocialIcons from "./SocialIcons";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import setSplitText from "./utils/splitText";
import { useLoading } from "../context/useLoading";
import ShaderTransition from "./ShaderTransition";

const TechStack = lazy(() => import("./TechStack"));

const MainContainer = ({ children }: PropsWithChildren) => {
  // The tech stack (2.4 MB of JS, 50 textures, physics) is far down the page, so
  // it only loads once the preloader has finished: nothing heavy competes with
  // the intro animation for the main thread.
  const { isLoading } = useLoading();
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  // Once loaded, the tech stack stays mounted and is only hidden below the
  // breakpoint: crossing it (a resize, docking devtools) then neither tears down
  // its WebGL context nor rebuilds the whole scene on the way back.
  const [techStackLoaded, setTechStackLoaded] = useState(false);
  if (isDesktopView && !isLoading && !techStackLoaded) setTechStackLoaded(true);

  useEffect(() => {
    let timer: number | undefined;
    const resizeHandler = () => {
      setSplitText();
      setIsDesktopView(window.innerWidth > 1024);
    };
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(resizeHandler, 250);
    };
    resizeHandler();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [isDesktopView]);

  return (
    <div className="container-main">
      <Navbar />
      <SocialIcons />
      {/* the tech-stack seam appears/disappears with the desktop layout */}
      <ShaderTransition seams={String(isDesktopView)} />
      {isDesktopView && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing>{!isDesktopView && children}</Landing>
            <About />
            <WhatIDo />
            <Statement />
            <Career />
            <div className="shader-seam" />
            <Work />
            {isDesktopView && <div className="shader-seam" />}
            {techStackLoaded && (
              <Suspense fallback={<div>Loading....</div>}>
                <TechStack active={isDesktopView} />
              </Suspense>
            )}
            <Contact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
