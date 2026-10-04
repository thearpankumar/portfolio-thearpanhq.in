import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import backdropFrag from "./shaders/backdrop/backdropFrag.glsl?raw";
import backdropVert from "./shaders/backdrop/backdropVert.glsl?raw";
import { BG_LAYER } from "./config";
import { Properties } from "./utils/properties";

/**
 * Fullscreen quad the frosted bars and cards transmit through.
 *
 * In the reference this was also the visible background. Here it lives on BG_LAYER only, so
 * the main render never draws it and the canvas stays transparent: the portfolio's own
 * background and star field show behind the helix, and this is just a stand-in for them
 * inside the glass.
 */
export class XylophoneBackdrop {
  readonly uniforms = {
    u_colorBase: { value: new Color(0x0c0708) }, // --backgroundColor
    u_colorGlow: { value: new Color(0x5c0d14) },
    u_bokeh: { value: 0.35 },
    u_drift: { value: Properties.reduceMotion ? 0 : 1 }, // specks hold still under prefers-reduced-motion
    u_time: Properties.globalUniforms.u_time,
    u_resolution: Properties.globalUniforms.u_resolution,
  };

  private mesh?: Mesh;
  private material?: ShaderMaterial;
  private geometry?: PlaneGeometry;

  build() {
    this.geometry = new PlaneGeometry(2, 2);
    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: backdropVert,
      fragmentShader: backdropFrag,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false; // clip-space quad has no meaningful bounds
    this.mesh.layers.set(BG_LAYER); // only the frost pass sees it

    return this.mesh;
  }

  dispose() {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
