import { getConsoleFunction, setConsoleFunction } from "three";

// Two messages three.js prints come from libraries this site depends on, not
// from its own code, and nothing here can change them:
//
//  - "Clock: This module has been deprecated": @react-three/fiber (latest
//    release) still creates a THREE.Clock for every <Canvas>.
//  - Windows' shader compiler (ANGLE/FXC) notes about three's own PMREM shader
//    (X4122) and the N8AO pass (X3595). They are compiler remarks about
//    shaders that compile and run fine, printed on every page load.
//
// Everything else three.js reports still reaches the console untouched.
const IGNORED = [
  /^THREE\.Clock: This module has been deprecated/,
  /^THREE\.WebGLProgram: Program Info Log:$/,
];
const COMPILER_NOTE = /\bX(?:3595|4122)\b/;

type ConsoleMethod = "log" | "warn" | "error";

function isIgnored(type: ConsoleMethod, message: string, params: unknown[]) {
  if (type !== "warn") return false;
  if (IGNORED[0].test(message)) return true;

  // a program log is only dropped when every line in it is one of those notes
  if (!IGNORED[1].test(message)) return false;
  const lines = params
    .map(String)
    .join("\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
  return lines.length > 0 && lines.every((line) => COMPILER_NOTE.test(line));
}

export function filterThreeConsole() {
  if (getConsoleFunction()) return;
  setConsoleFunction(
    (type: ConsoleMethod, message: string, ...params: unknown[]) => {
      if (isIgnored(type, message, params)) return;
      console[type](message, ...params);
    }
  );
}
