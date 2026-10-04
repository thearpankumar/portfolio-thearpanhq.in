import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  SSAOEffect,
} from "postprocessing";
import {
  DoubleSide,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import glassNormalFrag from "./shaders/xylophone/glassNormalFrag.glsl?raw";
import xylophoneVert from "./shaders/xylophone/xylophoneVert.glsl?raw";
import { FBOHelper } from "./common/FBOHelper";
import { FLUID, FROST, QUALITY, resolveLayout, SSAO } from "./config";
import { FluidSim } from "./FluidSim";
import { CardPass } from "./passes/CardPass";
import { FrostBackdropPass } from "./passes/FrostBackdropPass";
import { GlassBufferPass } from "./passes/GlassBufferPass";
import { ProjectCards, type CardEvents } from "./projects/ProjectCards";
import { Xylophone } from "./xylophone/Xylophone";
import { XylophoneBackdrop } from "./XylophoneBackdrop";
import { Input, type GestureKind } from "./utils/input";
import { Properties } from "./utils/properties";
import { RAFCollection } from "./utils/RAFCollection";

const MAX_DELTA = 1 / 20; // clamp long frames (tab restore) so nothing integrates a huge step

export type XylophoneSceneOptions = CardEvents & {
  /**
   * Whether the page is in a state where the helix may take the wheel at all — the section
   * settled in view and no transition running. Otherwise every gesture stays the page's.
   */
  canCapture: () => boolean;
};

/**
 * The glass xylophone of references/xylophone, mounted inside the portfolio's Work section.
 *
 * Differences from the reference's App:
 *   - the canvas is transparent and the backdrop is never drawn to it, so the page background
 *     and the star field stay visible behind the helix;
 *   - the wheel drives the helix only while the section is settled in view with no shader
 *     transition running (`canCapture`), and hands back to the page at either end of the
 *     project list, so ScrollSmoother and the shader seams keep the rest of the scroll;
 *   - on touch only the bars claim a drag, not the cards: the cards cover most of a phone's
 *     screen, and the page must stay scrollable there;
 *   - it can be torn down and rebuilt (React unmounts, StrictMode), so it owns its composer
 *     and releases the WebGL context and the canvas in `destroy()`.
 */
export class XylophoneScene {
  private readonly gl: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;

  // components
  private readonly xylophone = new Xylophone();
  private readonly backdrop = new XylophoneBackdrop();
  private readonly fluid: FluidSim;
  private readonly projectCards: ProjectCards;

  // passes — composited in this order
  private readonly frostBackdropPass: FrostBackdropPass;
  private readonly renderPass: RenderPass;
  private readonly glassBufferPass: GlassBufferPass;
  private readonly glassNormalMaterial: ShaderMaterial;
  private readonly ssaoEffect: SSAOEffect;
  private readonly ssaoPass: EffectPass;
  private readonly cardPass: CardPass;
  private readonly aaPass: EffectPass;

  // the pinned section the scene lives in — the canvas, cards and overlays are all inside it
  private readonly stage: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private isVisible = false;
  private isEngaged = false; // a wheel here would drive the helix right now
  private needsWarmUp = false; // draw once off-screen after loading, so shaders compile early
  private destroyed = false;

  // frame
  private size = { width: 0, height: 0 };
  private dateTime = performance.now();
  private isContextLost = false;
  private rafId = 0;

  private readonly boundUpdate = this.update.bind(this);

  private readonly onContextLost = (event: Event) => {
    // three re-uploads every GPU resource itself on restore, so we only stop and resume drawing
    event.preventDefault();
    this.isContextLost = true;
  };
  private readonly onContextRestored = () => {
    this.isContextLost = false;
  };

  /* ---------------------------------- setup --------------------------------- */
  private createRenderer() {
    const gl = new WebGLRenderer({
      alpha: true, // the page shows through everywhere the helix and cards don't cover
      antialias: true,
      powerPreference: "high-performance",
    });
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = NoToneMapping;
    gl.setClearColor(0x000000, 0);
    gl.setPixelRatio(Properties.dpr);
    gl.setSize(Properties.viewportWidth, Properties.viewportHeight);

    const canvas = gl.domElement;
    canvas.className = "work-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.stage.prepend(canvas);

    return gl;
  }

  /** One backdrop render -> Gaussian-blurred texture the frosted bars transmit through. */
  private createFrostPass() {
    const pass = new FrostBackdropPass(this.scene, this.camera);
    pass.blurRadius = FROST.strength * FROST.maxBlurPx;
    this.xylophone.uniforms.u_tBackdrop.value = pass.blurredTexture;

    return pass;
  }

  /**
   * View-space normals for SSAO. three's NormalPass can't reproduce our instanced helix pose,
   * so we re-render the bars with the same vertex shader and share the animation uniforms —
   * the buffer then tracks the live pose. Depth comes from the main render pass.
   */
  private createGlassNormalMaterial() {
    const u = this.xylophone.uniforms;

    return new ShaderMaterial({
      vertexShader: xylophoneVert,
      fragmentShader: glassNormalFrag,
      side: DoubleSide, // match the display material so both plate faces write normals
      uniforms: {
        u_time: u.u_time,
        u_spinSpeed: u.u_spinSpeed,
        u_swingScale: u.u_swingScale,
        u_swingAxis: u.u_swingAxis,
      },
    });
  }

  /* ---------------------------------- main ---------------------------------- */
  constructor(
    stage: HTMLElement,
    private readonly options: XylophoneSceneOptions
  ) {
    this.stage = stage;
    const rect = stage.getBoundingClientRect();
    Properties.viewportWidth = Math.max(rect.width, 1);
    Properties.viewportHeight = Math.max(rect.height, 1);
    Properties.time = 0;

    this.gl = this.createRenderer();
    Properties.gl = this.gl;
    // after outputColorSpace is set: the composer reads it to tag its buffers sRGB
    this.composer = new EffectComposer(this.gl);

    this.camera = new PerspectiveCamera(
      45,
      Properties.viewportWidth / Properties.viewportHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 0, 5);
    this.camera.updateMatrixWorld(); // the cards project through it before the first render

    Input.init(stage, {
      claims: (x, y, target, kind) => this.claimsScroll(x, y, target, kind),
      canScroll: (dir) => this.projectCards.canScroll(dir),
    });
    FBOHelper.init();

    // setup components
    this.scene.add(this.xylophone.group);
    this.scene.add(this.backdrop.build());

    this.fluid = new FluidSim(FLUID);
    this.xylophone.setFluid(this.fluid.uniforms.velocity);

    this.projectCards = new ProjectCards(this.xylophone, stage, options, {
      u_tBackdrop: this.xylophone.uniforms.u_tBackdrop,
      u_tGradient: this.xylophone.uniforms.u_tGradient,
      u_tFluid: this.fluid.uniforms.velocity,
    });
    this.scene.add(this.projectCards.group);

    // setup passes
    // frostBackdrop -> render -> glassBuffer -> ssao -> cards -> aa
    this.frostBackdropPass = this.createFrostPass();
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.glassNormalMaterial = this.createGlassNormalMaterial();
    this.glassBufferPass = new GlassBufferPass(
      this.scene,
      this.camera,
      this.glassNormalMaterial,
      QUALITY.glassBufferScale
    );
    this.ssaoEffect = new SSAOEffect(
      this.camera,
      this.glassBufferPass.glassTexture,
      SSAO
    );
    this.ssaoPass = new EffectPass(this.camera, this.ssaoEffect);
    this.cardPass = new CardPass(this.scene, this.camera);
    this.aaPass = new EffectPass(
      this.camera,
      new SMAAEffect({
        preset: QUALITY.isMobile ? SMAAPreset.MEDIUM : SMAAPreset.ULTRA,
      })
    );

    for (const pass of this.passes) this.composer.addPass(pass);

    // the section's own box drives the size, and drawing stops while it is off-screen
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => (this.isVisible = entry.isIntersecting)
    );
    this.visibilityObserver.observe(stage);

    // `load()` swallows its own asset failures, so a failed fetch only leaves the helix empty
    void this.xylophone.load().then(() => {
      if (this.destroyed) return;
      this.projectCards.mount();
      this.needsWarmUp = true;
    });

    this.update();
  }

  private get passes() {
    return [
      this.frostBackdropPass,
      this.renderPass,
      this.glassBufferPass,
      this.ssaoPass,
      this.cardPass,
      this.aaPass,
    ] as const;
  }

  /* --------------------------------- scroll --------------------------------- */
  /**
   * Whether a wheel or touch gesture that starts at stage pixel (x, y) belongs to the helix.
   * Cards ride the helix, so they count for the wheel; other controls keep the page's scroll;
   * otherwise it's the column the bars sweep. Anywhere else, the page scrolls on.
   */
  private claimsScroll(
    x: number,
    y: number,
    target: EventTarget | null,
    kind: GestureKind
  ): boolean {
    if (!this.options.canCapture()) return false;

    const el = target instanceof Element ? target : null;
    if (el?.closest(".work-card")) return kind === "wheel";
    if (el?.closest("button, a")) return false;

    return this.xylophone.isOverColumn(
      x,
      y,
      this.camera,
      this.size.width,
      this.size.height
    );
  }

  /** Lights the scroll hint while the wheel would drive the helix, so the boundary isn't a surprise. */
  private updateEngaged() {
    const engaged =
      Input.hasPointer &&
      (this.projectCards.isPointerOver ||
        this.xylophone.isOverColumn(
          Input.pointer.x,
          Input.pointer.y,
          this.camera,
          this.size.width,
          this.size.height
        )) &&
      this.options.canCapture();

    if (engaged === this.isEngaged) return;
    this.isEngaged = engaged;
    this.stage.classList.toggle("is-engaged", engaged);
  }

  private resize() {
    const rect = this.stage.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);

    if (this.size.width === width && this.size.height === height) return;
    this.size = { width, height };

    Properties.viewportWidth = width;
    Properties.viewportHeight = height;
    Properties.globalUniforms.u_resolution.value.set(
      width * Properties.dpr,
      height * Properties.dpr
    );

    this.gl.setSize(width, height);
    this.composer.setSize(width, height);
    Input.update();

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // wide screens leave the left for the intro panel; narrow ones centre the cards
    const layout = resolveLayout(width, height);
    this.xylophone.group.position.set(layout.groupX, layout.groupY, 0);
    this.xylophone.group.updateMatrixWorld();
    this.projectCards.setLayout(layout);
  }

  private update() {
    this.rafId = window.requestAnimationFrame(this.boundUpdate);
    if (this.isContextLost) return;

    // scrolled out of view: draw nothing, and resume without a catch-up step
    if (!this.isVisible && !this.needsWarmUp) {
      this.dateTime = performance.now();
      Input.postUpdate();
      return;
    }
    this.needsWarmUp = false;

    const now = performance.now();
    const delta = Math.min((now - this.dateTime) / 1e3, MAX_DELTA);
    this.dateTime = now;

    Properties.deltaTime = delta;
    Properties.time += delta;
    Properties.globalUniforms.u_deltaTime.value = delta;
    Properties.globalUniforms.u_time.value = Properties.time;

    Input.update();
    RAFCollection.forEach((callback) => callback(delta));
    this.projectCards.follow(delta);
    this.xylophone.update(delta, this.camera, !this.projectCards.isPointerOver);
    this.projectCards.update(delta, this.camera); // after the bars, so both use this frame's phase
    this.updateEngaged();

    this.composer.render(delta);
    Input.postUpdate();
  }

  destroy() {
    this.destroyed = true;
    window.cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    Input.destroy();
    this.stage.classList.remove("is-engaged");

    for (const pass of this.passes) {
      this.composer.removePass(pass);
      pass.dispose();
    }

    this.glassNormalMaterial.dispose();
    this.fluid.dispose();
    this.projectCards.dispose();
    this.xylophone.dispose();
    this.backdrop.dispose();
    this.composer.dispose();

    const canvas = this.gl.domElement;
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.gl.dispose();
    this.gl.forceContextLoss(); // free the context now rather than whenever the GC gets to it
    canvas.remove();
    if (Properties.gl === this.gl) Properties.gl = undefined;
  }
}
