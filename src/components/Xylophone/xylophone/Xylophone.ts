import {
  BufferGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Euler,
  Group,
  LinearFilter,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import { GLTFLoader } from "three-stdlib";
import modelUrl from "../../../assets/xylophone/xylophone-09.glb?url";
import xylophoneFrag from "../shaders/xylophone/xylophoneFrag.glsl?raw";
import xylophoneVert from "../shaders/xylophone/xylophoneVert.glsl?raw";
import { GLASS_LAYER, XYLOPHONE } from "../config";
import { Input } from "../utils/input";
import { Properties } from "../utils/properties";
import {
  buildInstancedGeometry,
  helixPoint,
  wrap,
  writeHelixTransforms,
  type BuiltGeometry,
} from "./helix";
import {
  createHitWorkspace,
  hitBarIndex,
  type InstanceAttributes,
} from "./picking";

/* -------------------------------------------------------------------------- */
/*                                    utils                                   */
/* -------------------------------------------------------------------------- */
/** 1px-tall spectrum ramp the bars sample for their hover tint. */
function buildGradientTexture(): Texture {
  const width = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 1;

  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.0, "#ff0033");
  grad.addColorStop(0.3, "#ff00d4");
  grad.addColorStop(0.5, "#6a00ff");
  grad.addColorStop(0.8, "#0090ff");
  grad.addColorStop(1.0, "#00ffe1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 1);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;

  return tex;
}

/* -------------------------------------------------------------------------- */
/*                                    main                                    */
/* -------------------------------------------------------------------------- */
export class Xylophone {
  readonly group = new Group();

  readonly uniforms = {
    // global
    u_time: Properties.globalUniforms.u_time,

    // motion — both are set for real in build(), once prefers-reduced-motion has been read
    u_spinSpeed: { value: 0 }, // XYLOPHONE.spinSpeed normally, 0 under prefers-reduced-motion
    u_swingScale: { value: 1.0 }, // 0 under prefers-reduced-motion
    u_swingAxis: { value: new Vector3(0, 1, 0) },

    // hover tint
    u_tFluid: { value: null as Texture | null },
    u_tGradient: { value: null as Texture | null },
    u_fluidStrength: { value: 1.0 },
    u_tintStrength: { value: 1.0 },
    u_tintGlow: { value: 0.15 },
    u_tintWrap: { value: XYLOPHONE.tintWrap },

    // frosted transmission — lower than the reference's 0.84: the backdrop here is the dark
    // page, so more of the lit glass body has to show for the bars to read as glass
    u_tBackdrop: { value: null as Texture | null },
    u_transmission: { value: 0.6 },
    u_refractStrength: { value: 0.2 },
    u_fresnelPower: { value: 3.0 },

    // iridescence
    u_iridStrength: { value: 0.6 },
    u_iridCycles: { value: 3.0 },
    u_iridShift: { value: 0.0 },
    u_iridPower: { value: 2.5 },
    u_iridBody: { value: 0.12 },
  };

  // mesh
  private mesh?: Mesh;
  private material?: ShaderMaterial;
  private instances?: BuiltGeometry;
  private hitInstances?: InstanceAttributes;
  private geometryHeight = 1; // bar bbox height — the helix's vertical pitch

  // strike (the swing — the reference's audio is left out)
  private lastHitIndex = -1;
  private readonly raycast = new Raycaster();
  private readonly hitWorkspace = createHitWorkspace();

  // scroll — the target is set by the cards (wheel, snap, keys), current eases toward it
  private phaseTarget = 0;
  private phaseCurrent = 0;
  private phaseWritten = 0; // last phase actually written to the buffers
  private readonly scrollEuler = new Euler(0, 0, 0, "YXZ");
  private readonly scrollQuat = new Quaternion();

  // column hit test scratch
  private readonly columnPoint = new Vector3();
  private readonly columnView = new Vector3();

  /* --------------------------------- public --------------------------------- */
  /** Shares the fluid's velocity uniform by reference — no per-frame copy. */
  setFluid(fluidVelocity: { value: Texture | null }) {
    this.uniforms.u_tFluid = fluidVelocity;
  }

  /** True once the bars exist — before that there is no helix pitch to place anything against. */
  get isReady() {
    return this.instances !== undefined;
  }

  /** The eased scroll phase the bars are drawn at this frame, in slots. */
  get phase() {
    return this.phaseCurrent;
  }

  /** Where the phase is easing toward. */
  get targetPhase() {
    return this.phaseTarget;
  }

  /** Ease the conveyor to `phase`. */
  scrollTo(phase: number) {
    this.phaseTarget = phase;
  }

  /** Move the conveyor without easing — for where motion has to be avoided. */
  jumpTo(phase: number) {
    this.phaseTarget = phase;
    this.phaseCurrent = phase;
  }

  /** World-space point on the helix at slot `s`, `radius` in bar-radius units (1 = bar centres). */
  helixWorldPoint(s: number, radius: number, out: Vector3): Vector3 {
    helixPoint(
      s,
      this.geometryHeight,
      XYLOPHONE,
      out,
      XYLOPHONE.radius * radius
    );
    return out.applyMatrix4(this.group.matrixWorld);
  }

  /**
   * Whether stage pixel (`x`, `y`) lies on the helix column — the hull the bars sweep, not the
   * bars themselves, so the gaps between them count too and the region doesn't flicker as they
   * spin. The projected axis is walked as a chain of capsules whose radius is the bars' reach,
   * shrinking with depth. ~66 projections: cheap enough per gesture, or per frame.
   */
  isOverColumn(
    x: number,
    y: number,
    camera: PerspectiveCamera,
    width: number,
    height: number
  ): boolean {
    if (!this.instances) return false;

    const box = this.instances.localBox;
    const reach =
      Math.hypot(XYLOPHONE.radius, (box.max.z - box.min.z) / 2) *
      this.group.scale.x;
    const focal = height / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2))); // px per unit at distance 1

    const p = this.columnPoint;
    let prevX = 0;
    let prevY = 0;
    let prevR = 0;
    let hasPrev = false;

    for (let s = -1; s <= XYLOPHONE.count; s++) {
      helixPoint(s, this.geometryHeight, XYLOPHONE, p, 0).applyMatrix4(
        this.group.matrixWorld
      );

      const depth = -this.columnView
        .copy(p)
        .applyMatrix4(camera.matrixWorldInverse).z;
      if (depth <= camera.near) {
        hasPrev = false;
        continue;
      }

      p.project(camera);
      const px = (p.x * 0.5 + 0.5) * width;
      const py = (0.5 - p.y * 0.5) * height;
      const pr = (reach * focal) / depth;

      if (hasPrev) {
        // distance to the segment, against the radius interpolated along it
        const dx = px - prevX;
        const dy = py - prevY;
        const t = MathUtils.clamp(
          ((x - prevX) * dx + (y - prevY) * dy) / (dx * dx + dy * dy || 1),
          0,
          1
        );
        const r = prevR + (pr - prevR) * t;
        if (Math.hypot(x - (prevX + dx * t), y - (prevY + dy * t)) <= r)
          return true;
      }

      prevX = px;
      prevY = py;
      prevR = pr;
      hasPrev = true;
    }

    return false;
  }

  /** The bar currently riding slot `s`. */
  barAtSlot(s: number): number {
    return wrap(Math.round(s - this.phaseCurrent), XYLOPHONE.count);
  }

  /** Swing bar `index`, as if struck. */
  strike(index: number) {
    if (!this.instances) return;

    this.instances.aStrikeTime.setX(index, Properties.time);
    this.instances.aStrikeTime.needsUpdate = true;
  }

  /* --------------------------------- update --------------------------------- */
  /** The conveyor eases to its target; rewrite the helix only when the eased phase actually moved. */
  private updateScroll(delta: number) {
    if (!this.instances) return;

    this.phaseCurrent = MathUtils.damp(
      this.phaseCurrent,
      this.phaseTarget,
      XYLOPHONE.scroll.lerp,
      delta
    );

    if (Math.abs(this.phaseCurrent - this.phaseWritten) <= 1e-5) return;

    const { positions, rotations } = this.instances.transforms;
    writeHelixTransforms(
      this.phaseCurrent,
      this.geometryHeight,
      XYLOPHONE,
      positions,
      rotations,
      this.scrollEuler,
      this.scrollQuat
    );

    this.instances.geometry.attributes.aPos.needsUpdate = true;
    this.instances.geometry.attributes.aRot.needsUpdate = true;
    this.phaseWritten = this.phaseCurrent;
  }

  /** Hovering a new bar strikes it: stamp the strike time, which drives its swing. */
  private updateStrike(camera: PerspectiveCamera) {
    if (!this.instances || !this.hitInstances || !Input.hasPointer) {
      this.lastHitIndex = -1;
      return;
    }

    this.raycast.setFromCamera(Input.mouseXY, camera);
    const index = hitBarIndex(
      this.raycast.ray,
      this.hitInstances,
      this.instances.localBox,
      this.group.matrixWorld,
      Properties.time,
      this.uniforms.u_spinSpeed.value,
      this.hitWorkspace
    );

    if (index !== -1 && index !== this.lastHitIndex) this.strike(index);

    this.lastHitIndex = index;
  }

  /* ---------------------------------- load ---------------------------------- */
  private async loadBars() {
    let modelGeometry: BufferGeometry;
    try {
      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      modelGeometry = (gltf.scene.children[0] as Mesh).geometry;
    } catch (err) {
      console.error(
        "[Xylophone] bar model failed to load — nothing to render",
        err
      );
      return;
    }

    this.build(modelGeometry);
  }

  /* ---------------------------------- main ---------------------------------- */
  private build(modelGeometry: BufferGeometry) {
    this.instances = buildInstancedGeometry(modelGeometry, XYLOPHONE);
    this.geometryHeight =
      this.instances.localBox.max.y - this.instances.localBox.min.y;
    this.hitInstances = {
      aPos: this.instances.transforms.positions,
      aRot: this.instances.transforms.rotations,
    };

    this.uniforms.u_tGradient.value = buildGradientTexture();

    // prefers-reduced-motion suppresses the strike swing, not the interaction
    this.uniforms.u_swingScale.value = Properties.reduceMotion ? 0 : 1;
    this.uniforms.u_spinSpeed.value = Properties.reduceMotion
      ? 0
      : XYLOPHONE.spinSpeed;

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: xylophoneVert,
      fragmentShader: xylophoneFrag,
      side: DoubleSide,
    });

    this.mesh = new Mesh(this.instances.geometry, this.material);
    this.mesh.layers.enable(GLASS_LAYER); // also rendered in isolation into the view-normal buffer (SSAO)
    this.group.add(this.mesh);
  }

  async load() {
    this.group.scale.setScalar(XYLOPHONE.group.scale);
    this.group.rotation.set(
      MathUtils.degToRad(XYLOPHONE.group.rotXDeg),
      0,
      MathUtils.degToRad(XYLOPHONE.group.rotZDeg)
    );
    this.group.updateMatrixWorld();

    await this.loadBars();
  }

  /** `canStrike` is false while the pointer is over a card — the bars behind it shouldn't ring. */
  update(delta: number, camera: PerspectiveCamera, canStrike = true): void {
    if (!this.instances || !this.hitInstances) return;

    this.updateScroll(delta);
    if (canStrike) this.updateStrike(camera);
    else this.lastHitIndex = -1;
  }

  dispose() {
    this.instances?.geometry.dispose();
    this.material?.dispose();
    this.uniforms.u_tGradient.value?.dispose();

    if (this.mesh) this.group.remove(this.mesh);
  }
}
