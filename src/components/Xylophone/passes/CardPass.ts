import { Pass } from "postprocessing";
import {
  PerspectiveCamera,
  Scene,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { CARD_LAYER } from "../config";

/**
 * Draws the project cards (CARD_LAYER) straight onto the finished helix image.
 *
 * It runs after SSAO on purpose. The cards aren't in the view-normal buffer, so letting them
 * into the main render would leave the AO pass shading them with the normals of the bars
 * behind. Here they land on top of an already-shaded frame, and SMAA still runs after.
 *
 * Depth is cleared first: the cards always sit over the helix (their HTML overlay can't be
 * occluded by WebGL anyway), and only need depth to sort their own faces.
 *
 * Draws in place into the composer's input buffer, so `needsSwap = false`.
 */
export class CardPass extends Pass {
  private cardScene: Scene;
  private cardCamera: PerspectiveCamera;

  constructor(scene: Scene, camera: PerspectiveCamera) {
    super("CardPass");

    this.needsSwap = false;
    this.cardScene = scene;
    this.cardCamera = camera;
  }

  render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget | null): void {
    const prevLayerMask = this.cardCamera.layers.mask;

    this.cardCamera.layers.set(CARD_LAYER);

    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.clearDepth();
    renderer.render(this.cardScene, this.cardCamera);

    this.cardCamera.layers.mask = prevLayerMask;
  }
}
