import {
  Euler,
  FrontSide,
  Group,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
} from "three";
import cardFrag from "../shaders/projectCard/cardFrag.glsl?raw";
import cardVert from "../shaders/projectCard/cardVert.glsl?raw";
import { CARD_LAYER, CARDS, XYLOPHONE, type Layout } from "../config";
import { Input } from "../utils/input";
import { Properties } from "../utils/properties";
import type { Xylophone } from "../xylophone/Xylophone";
import {
  buildCardSlab,
  cssMatrixForFace,
  type BuiltSlab,
} from "./cardGeometry";

/* -------------------------------------------------------------------------- */
/*                                    types                                   */
/* -------------------------------------------------------------------------- */
type TextureUniform = { value: Texture | null };

/** Uniforms the cards read by reference from the bars and the fluid — never copied. */
export type SharedCardUniforms = {
  u_tBackdrop: TextureUniform;
  u_tGradient: TextureUniform;
  u_tFluid: TextureUniform;
};

/** What the cards tell the page. */
export type CardEvents = {
  /** The project resting at the focus changed. */
  onProjectChange: (index: number) => void;
};

type Card = {
  index: number; // project index, and the order the cards ride up the helix
  el: HTMLLIElement;
  link: HTMLElement; // an <a>, or a plain focusable box for a project with no link
  mesh: Mesh;
  material: ShaderMaterial;
  hovered: boolean;
  hover: number; // eased 0..1
  emphasis: number; // 0..1, 1 = at the focus
  hidden: boolean;
  parked: boolean; // off the column entirely — posed once, then skipped until it returns
  listeners: [EventTarget, string, EventListener][];
};

/* -------------------------------------------------------------------------- */
/*                                    main                                    */
/* -------------------------------------------------------------------------- */
/**
 * Glass project capsules riding the helix.
 *
 * Each card lives at a continuous helix slot that advances with the conveyor phase, exactly
 * like a bar, so while it is on screen it stays tethered to one bar and traces the helix's
 * curve as you scroll on the helix (wheel or drag claimed by Input), settling on the nearest
 * card once the scroll goes quiet.
 *
 * Unlike the reference's endless ring, the cards here are a finite list: the column starts at
 * the first project and ends at the last instead of wrapping round to repeat them, and past
 * either end the scroll goes back to the page (see `canScroll`).
 *
 * A card is two layers kept in lock-step from the same matrix:
 *   - a glass slab in WebGL (CARD_LAYER, drawn by CardPass) — real thickness, perspective and
 *     the same frosted backdrop + iridescence as the bars;
 *   - its HTML (rendered by Work.tsx) laid exactly on the slab's front face with one
 *     matrix3d, so it stays crisp, clickable, focusable and readable by assistive tech.
 */
export class ProjectCards {
  readonly group = new Group();

  readonly uniforms: SharedCardUniforms & {
    u_time: { value: number };
    u_resolution: { value: Vector2 };
    u_halfSize: { value: Vector2 };
    u_radius: { value: number };
  };

  private readonly listEl: HTMLOListElement | null;
  private readonly cards: Card[] = [];

  // layout
  private layout?: Layout;
  private layoutDirty = false;
  private slab?: BuiltSlab;
  private cardWidth = 1; // world, outer
  private cardHeight = 1;

  // scroll snapping
  private restPhase = 0; // phase of the card we last settled on
  private idle = 0;
  private settled = true;
  private introduced = false;

  private focusSlotIndex = 0; // round(phase / spacing) — a change means a new card reached the focus
  private shownProject = -1;
  private hoveredCount = 0;

  // scratch
  private readonly pos = new Vector3();
  private readonly euler = new Euler(0, 0, 0, "YXZ");

  /* -------------------------------- handlers -------------------------------- */
  // on the list, not the window: arrow keys step the cards only while a card has focus, and
  // scroll the page everywhere else
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !this.introduced) return;

    const down = e.key === "ArrowDown" || e.key === "PageDown";
    const up = e.key === "ArrowUp" || e.key === "PageUp";
    if (!down && !up) return;

    e.preventDefault();
    this.step(down ? 1 : -1);
  };

  /* --------------------------------- public --------------------------------- */
  /** True while the pointer is over any card — the bars behind it shouldn't ring. */
  get isPointerOver() {
    return this.hoveredCount > 0;
  }

  constructor(
    private readonly xylophone: Xylophone,
    private readonly stage: HTMLElement,
    private readonly events: CardEvents,
    shared: SharedCardUniforms
  ) {
    this.uniforms = {
      ...shared,
      u_time: Properties.globalUniforms.u_time,
      u_resolution: Properties.globalUniforms.u_resolution,
      u_halfSize: { value: new Vector2(1, 1) },
      u_radius: { value: 0.1 },
    };
    this.listEl = stage.querySelector<HTMLOListElement>(".work-cards__list");
  }

  /** Adopts the card elements and builds their slabs. Call once the bars exist. */
  mount() {
    if (!this.listEl) return;

    const items = this.listEl.querySelectorAll<HTMLLIElement>(
      ":scope > .work-card"
    );
    items.forEach((li, i) =>
      this.cards.push(this.createCard(li, i, items.length))
    );

    this.listEl.addEventListener("keydown", this.onKeyDown);
    this.layoutDirty = true;
  }

  setLayout(layout: Layout) {
    this.layout = layout;
    this.layoutDirty = true;
  }

  /** Phase of the last card — the end of the column. */
  private get maxPhase() {
    return Math.max(this.cards.length - 1, 0) * CARDS.spacing;
  }

  /**
   * Whether the helix can still scroll in `dir` (+1 forward, -1 back). At either end it can't,
   * and Input hands that gesture to the page so it scrolls on to the next section.
   */
  canScroll(dir: number) {
    if (!this.introduced) return false;
    const target = this.xylophone.targetPhase;
    if (dir > 0) return target < this.maxPhase - 0.01;
    if (dir < 0) return target > 0.01;
    return true;
  }

  /** Ease one card forward (+1) or back (-1). */
  step(dir: number) {
    const step = CARDS.spacing;
    this.settleAt(
      Math.round(this.xylophone.targetPhase / step) * step + dir * step
    );
  }

  /** Bring `card` to the focus. */
  goTo(card: Card) {
    this.settleAt(card.index * CARDS.spacing);
  }

  /* --------------------------------- update --------------------------------- */
  /**
   * Feeds this frame's claimed scroll into the conveyor and snaps once it goes quiet. Runs
   * before the bars update, so they and the cards are posed from the same phase in a frame.
   */
  follow(delta: number) {
    if (!this.xylophone.isReady || this.cards.length === 0) return;
    if (!this.introduced) {
      this.intro();
      return;
    }

    if (Input.deltaScrollY !== 0) {
      const target =
        this.xylophone.targetPhase +
        Input.deltaScrollY * XYLOPHONE.scroll.sensitivity;
      this.xylophone.scrollTo(MathUtils.clamp(target, 0, this.maxPhase));
    }
    this.updateSnap(delta);
  }

  update(delta: number, camera: PerspectiveCamera) {
    if (!this.xylophone.isReady || this.cards.length === 0 || !this.layout)
      return;
    if (this.layoutDirty) this.applyLayout(camera);

    const phase = this.xylophone.phase;

    // each card that arrives at the focus rings the bar it is tethered to
    const focusSlotIndex = Math.round(phase / CARDS.spacing);
    if (focusSlotIndex !== this.focusSlotIndex) {
      this.focusSlotIndex = focusSlotIndex;
      this.xylophone.strike(this.xylophone.barAtSlot(CARDS.focusSlot));
    }

    for (const card of this.cards) this.updateCard(card, phase, delta, camera);
    this.updateProgress(phase);
  }

  /**
   * Snap to the nearest card once the wheel goes quiet. A short scroll that would round back
   * to the same card still advances one, so a single notch always feels like it did something.
   */
  private updateSnap(delta: number) {
    if (Input.deltaScrollY !== 0 || Input.isTouching) {
      this.idle = 0;
      this.settled = false;
      return;
    }
    if (this.settled) return;

    this.idle += delta;
    if (this.idle < CARDS.snap.idle) return;

    const step = CARDS.spacing;
    const target = this.xylophone.targetPhase;
    const moved = target - this.restPhase;
    let snap = Math.round(target / step) * step;
    if (snap === this.restPhase && Math.abs(moved) > step * CARDS.snap.flick)
      snap += Math.sign(moved) * step;

    this.settleAt(snap);
  }

  private settleAt(phase: number) {
    this.restPhase = MathUtils.clamp(phase, 0, this.maxPhase);
    this.settled = true;
    this.xylophone.scrollTo(this.restPhase);
  }

  /** Cards glide up into place on first sight (or simply appear, under reduced motion). */
  private intro() {
    this.introduced = true;

    if (Properties.reduceMotion) {
      this.xylophone.jumpTo(this.restPhase);
    } else {
      this.xylophone.jumpTo(this.restPhase - CARDS.spacing);
      this.settleAt(this.restPhase);
    }
    this.focusSlotIndex = Math.round(this.xylophone.phase / CARDS.spacing);
  }

  private updateCard(
    card: Card,
    phase: number,
    delta: number,
    camera: PerspectiveCamera
  ) {
    const layout = this.layout!;
    const { spacing, below, above, fadeIn, fadeOut } = CARDS;

    // slots from the focus; + is above it. Outside -below..above the card is off the column:
    // with many projects most cards are, so park those once instead of posing them every frame
    const u = phase - card.index * spacing;
    if (u <= -below || u >= above) {
      if (!card.parked) this.park(card);
      return;
    }
    card.parked = false;

    const enter = MathUtils.smoothstep(u, -below, -below + fadeIn);
    const alpha =
      u > above
        ? 0
        : enter * (1 - MathUtils.smoothstep(u, above - fadeOut, above));
    const emphasis = 1 - MathUtils.smoothstep(Math.abs(u), 0, spacing * 0.75);
    card.emphasis = emphasis;

    // a card that fades out from under the pointer never gets its pointerleave
    const hidden = alpha < 0.05;
    if (hidden && card.hovered) this.setHovered(card, false);
    card.hover = MathUtils.damp(card.hover, card.hovered ? 1 : 0, 10, delta);

    // pose — fading cards are held at the window edge so they never swing past the camera
    const uc = MathUtils.clamp(u, -below, above);
    const pos = this.xylophone.helixWorldPoint(
      CARDS.focusSlot + uc,
      CARDS.pathRadius,
      this.pos
    );
    pos.x = MathUtils.lerp(pos.x + layout.offsetX, 0, layout.centerPull);
    pos.y += CARDS.offset.y;
    pos.z +=
      CARDS.offset.z +
      emphasis * CARDS.activeLift +
      card.hover * CARDS.hoverLift;

    const scale =
      MathUtils.lerp(CARDS.restScale, 1, emphasis) * (1 + card.hover * 0.03);
    this.clampToViewport(pos, scale, camera);

    // the card turns through part of the helix angle as it climbs — it rotates with its segment
    const yaw = CARDS.restYaw + uc * XYLOPHONE.thetaStep * CARDS.yawFollow;
    const pitch = uc * CARDS.pitchPerSlot;

    const mesh = card.mesh;
    mesh.position.copy(pos);
    mesh.quaternion.setFromEuler(this.euler.set(pitch, yaw, CARDS.restRoll));
    mesh.scale.setScalar(scale);
    mesh.updateMatrix();
    mesh.updateMatrixWorld();
    mesh.visible = alpha > 0.002;

    const uniforms = card.material.uniforms;
    uniforms.u_opacity.value = alpha;
    uniforms.u_active.value = emphasis;
    uniforms.u_hover.value = card.hover;

    // HTML overlay, from the same matrix
    const style = card.el.style;
    style.transform = cssMatrixForFace(
      mesh.matrixWorld,
      camera,
      Properties.viewportWidth,
      Properties.viewportHeight,
      layout.cardCss.width,
      layout.cardCss.height,
      this.cardWidth,
      this.cardHeight,
      this.slab!.frontZ
    );
    style.opacity = alpha.toFixed(3);
    style.setProperty("--active", emphasis.toFixed(3));
    style.setProperty("--hover", card.hover.toFixed(3));
    style.setProperty("--blur", (1 - enter).toFixed(3));
    style.zIndex = String(Math.round(100 + pos.z * 100)); // nearer the camera draws on top, as the slabs do

    if (hidden !== card.hidden) {
      card.hidden = hidden;
      card.el.classList.toggle("is-hidden", hidden);
    }
    card.el.classList.toggle("is-active", emphasis > 0.5);
  }

  /** Hides a card that has left the column, and leaves it alone until it comes back. */
  private park(card: Card) {
    card.parked = true;
    card.emphasis = 0;
    card.hover = 0;
    if (card.hovered) this.setHovered(card, false);

    card.mesh.visible = false;
    card.material.uniforms.u_opacity.value = 0;
    card.el.style.opacity = "0";
    card.hidden = true;
    card.el.classList.add("is-hidden");
    card.el.classList.remove("is-active");
  }

  /** Keeps the card inside the frame (and off the intro panel), whatever the helix does. */
  private clampToViewport(
    pos: Vector3,
    scale: number,
    camera: PerspectiveCamera
  ) {
    const layout = this.layout!;
    const distance = camera.position.z - pos.z;
    const halfWidth =
      distance * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const halfCard = (this.cardWidth / 2) * scale;
    const margin = halfWidth * 0.07; // the yaw brings one side nearer, so leave room for it

    const minX =
      -halfWidth + halfWidth * 2 * layout.reserveLeft + halfCard + margin;
    const maxX = halfWidth - halfCard - margin;
    pos.x =
      minX > maxX ? (minX + maxX) / 2 : MathUtils.clamp(pos.x, minX, maxX);
  }

  /** The dot travels the track from the first card (top) to the last (bottom) with the helix. */
  private updateProgress(phase: number) {
    const last = this.cards.length - 1;
    const f = phase / CARDS.spacing;
    const progress = last > 0 ? MathUtils.clamp(f / last, 0, 1) : 0;
    this.stage.style.setProperty("--progress", progress.toFixed(4));

    const project = MathUtils.clamp(Math.round(f), 0, last);
    if (project !== this.shownProject) {
      this.shownProject = project;
      this.events.onProjectChange(project);
    }
  }

  /* ---------------------------------- build --------------------------------- */
  private createCard(li: HTMLLIElement, index: number, count: number): Card {
    const link = li.querySelector<HTMLElement>(".work-card__link")!;

    const material = new ShaderMaterial({
      vertexShader: cardVert,
      fragmentShader: cardFrag,
      uniforms: {
        ...this.uniforms,
        u_opacity: { value: 0 },
        u_active: { value: 0 },
        u_hover: { value: 0 },
        u_tintOffset: { value: index / count },
      },
      transparent: true,
      side: FrontSide,
    });

    const mesh = new Mesh(undefined, material);
    mesh.layers.set(CARD_LAYER); // only CardPass draws it
    mesh.matrixAutoUpdate = false; // posed by hand every frame
    mesh.frustumCulled = false;
    this.group.add(mesh);

    const card: Card = {
      index,
      el: li,
      link,
      mesh,
      material,
      hovered: false,
      hover: 0,
      emphasis: 0,
      hidden: false,
      parked: false,
      listeners: [],
    };

    const listen = (target: EventTarget, type: string, fn: EventListener) => {
      target.addEventListener(type, fn);
      card.listeners.push([target, type, fn]);
    };

    listen(li, "pointerenter", () => this.setHovered(card, true));
    listen(li, "pointerleave", () => this.setHovered(card, false));

    // a card that isn't at the focus comes to it first; only the active card opens its link
    // (a card without a link just comes round)
    listen(link, "click", (e) => {
      if (card.emphasis > 0.5) return;
      e.preventDefault();
      this.goTo(card);
    });

    // keyboard focus brings the card round; a mouse click is handled above
    listen(link, "focus", () => {
      if (link.matches(":focus-visible")) this.goTo(card);
    });

    return card;
  }

  private setHovered(card: Card, hovered: boolean) {
    if (card.hovered === hovered) return;
    if (hovered && card.hidden) return;

    card.hovered = hovered;
    this.hoveredCount += hovered ? 1 : -1;
  }

  /**
   * Sizes the cards for the current layout. Narrow layouts fit the card to the viewport at the
   * focus depth, so this waits until the bars (and therefore the helix pitch) exist.
   */
  private applyLayout(camera: PerspectiveCamera) {
    const layout = this.layout!;
    this.layoutDirty = false;

    let width = layout.cardWorldWidth;
    if (width <= 0) {
      const focus = this.xylophone.helixWorldPoint(
        CARDS.focusSlot,
        CARDS.pathRadius,
        this.pos
      );
      const distance =
        camera.position.z - (focus.z + CARDS.offset.z + CARDS.activeLift);
      width =
        distance *
        Math.tan(MathUtils.degToRad(camera.fov / 2)) *
        camera.aspect *
        2 *
        0.86;
    }
    const height = (width * layout.cardCss.height) / layout.cardCss.width;

    this.cardWidth = width;
    this.cardHeight = height;

    this.slab?.geometry.dispose();
    this.slab = buildCardSlab({ width, height, ...CARDS.slab });
    for (const card of this.cards) card.mesh.geometry = this.slab.geometry;

    this.uniforms.u_halfSize.value.set(
      this.slab.faceHalfWidth,
      this.slab.faceHalfHeight
    );
    this.uniforms.u_radius.value = this.slab.faceRadius;

    // the HTML matches the slab's size and corner radius in its own pixels
    const pxPerUnit = layout.cardCss.width / width;
    const list = this.listEl!;
    list.style.setProperty("--card-w", `${layout.cardCss.width}px`);
    list.style.setProperty("--card-h", `${layout.cardCss.height}px`);
    list.style.setProperty(
      "--card-radius",
      `${(CARDS.slab.radius * pxPerUnit).toFixed(1)}px`
    );
    list.classList.toggle("is-compact", layout.narrow);
  }

  /** The card elements belong to React: hand them back as they were, minus our listeners and styles. */
  dispose() {
    this.listEl?.removeEventListener("keydown", this.onKeyDown);
    this.listEl?.classList.remove("is-compact");
    this.listEl?.removeAttribute("style");

    for (const card of this.cards) {
      for (const [target, type, fn] of card.listeners) {
        target.removeEventListener(type, fn);
      }
      card.el.removeAttribute("style");
      card.el.classList.remove("is-hidden", "is-active");
      card.material.dispose();
      this.group.remove(card.mesh);
    }
    this.cards.length = 0;
    this.hoveredCount = 0;
    this.slab?.geometry.dispose();
    this.stage.style.removeProperty("--progress");
  }
}
