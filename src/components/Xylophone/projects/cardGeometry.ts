import { ExtrudeGeometry, Matrix4, PerspectiveCamera, Shape } from "three";

export type SlabSpec = {
  width: number; // outer size, bevel included
  height: number;
  depth: number; // straight wall between the two bevels
  bevel: number;
  radius: number; // outer corner radius
};

export type BuiltSlab = {
  geometry: ExtrudeGeometry;
  /** Local z of the front face — where the HTML overlay is laid. */
  frontZ: number;
  /** Half-size and corner radius of the flat front face, inside the bevel. */
  faceHalfWidth: number;
  faceHalfHeight: number;
  faceRadius: number;
};

/* -------------------------------------------------------------------------- */
/*                                  geometry                                  */
/* -------------------------------------------------------------------------- */
function roundedRect(width: number, height: number, radius: number): Shape {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new Shape();

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);

  return shape;
}

/**
 * A rounded glass slab, centred on the origin and facing +z.
 *
 * ExtrudeGeometry grows the outline by `bevelSize` and adds `bevelThickness` to both faces,
 * so the shape is inset by the bevel to land on the requested outer size.
 */
export function buildCardSlab(spec: SlabSpec): BuiltSlab {
  const { width, height, depth, bevel, radius } = spec;
  const faceWidth = width - bevel * 2;
  const faceHeight = height - bevel * 2;
  const faceRadius = Math.max(radius - bevel, 0.001);

  const geometry = new ExtrudeGeometry(
    roundedRect(faceWidth, faceHeight, faceRadius),
    {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 10,
    }
  );
  geometry.translate(0, 0, -depth / 2);

  return {
    geometry,
    frontZ: depth / 2 + bevel,
    faceHalfWidth: faceWidth / 2,
    faceHalfHeight: faceHeight / 2,
    faceRadius,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 css overlay                                */
/* -------------------------------------------------------------------------- */
const _clipToScreen = new Matrix4();
const _pxToFace = new Matrix4();
const _m = new Matrix4();

/**
 * The CSS `matrix3d()` that lays a `cssWidth × cssHeight` element (origin top-left,
 * `transform-origin: 0 0`, parent filling the viewport) exactly onto the front face of a mesh.
 *
 * The whole projection is folded into one matrix — no `perspective` parent and no
 * `preserve-3d`, which is what keeps the element out of a 3D rendering context (a context
 * flattens and misplaces anything with a backdrop, and makes hit-testing flaky).
 *
 *   px → face (local) → world → view → clip → viewport px
 */
export function cssMatrixForFace(
  objectMatrixWorld: Matrix4,
  camera: PerspectiveCamera,
  viewportWidth: number,
  viewportHeight: number,
  cssWidth: number,
  cssHeight: number,
  faceWidth: number,
  faceHeight: number,
  frontZ: number
): string {
  // Matrix4.set() is row-major
  // prettier-ignore
  _clipToScreen.set(
    viewportWidth / 2, 0, 0, viewportWidth / 2,
    0, -viewportHeight / 2, 0, viewportHeight / 2,
    0, 0, 1, 0,
    0, 0, 0, 1
  )
  // prettier-ignore
  _pxToFace.set(
    faceWidth / cssWidth, 0, 0, -faceWidth / 2,
    0, -faceHeight / cssHeight, 0, faceHeight / 2,
    0, 0, 1, frontZ,
    0, 0, 0, 1
  )

  _m.multiplyMatrices(_clipToScreen, camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse)
    .multiply(objectMatrixWorld)
    .multiply(_pxToFace);

  // elements are column-major, which is matrix3d()'s order too
  return `matrix3d(${_m.elements.join(",")})`;
}
