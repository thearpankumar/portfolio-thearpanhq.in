import type { WebGLRenderer } from "three";

// three.js sizes the canvas with Math.floor(size * pixelRatio) but sets the
// viewport with Math.round(size * pixelRatio). With a fractional pixel ratio
// (1.5 here) and a CSS size whose product ends in .5 - an odd width, say 1097
// -> 1645.5 - the canvas is 1645 pixels wide and the viewport 1646, and every
// draw covers a column that is not there. Harmless, but Firefox warns about it
// ("Drawing to a destination rect smaller than the viewport rect").
//
// After each resize this sets the viewport to exactly the canvas: in CSS units
// that is canvas.width / pixelRatio, which three multiplies straight back.

export function snapViewport(gl: WebGLRenderer) {
  const snap = () => {
    const ratio = gl.getPixelRatio();
    const { width, height } = gl.domElement;
    gl.setViewport(0, 0, width / ratio, height / ratio);
  };

  // setPixelRatio resizes through this.setSize, so wrapping setSize covers both
  const setSize = gl.setSize.bind(gl);
  gl.setSize = (width, height, updateStyle) => {
    setSize(width, height, updateStyle);
    snap();
  };
  snap();
}
