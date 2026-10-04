import { Vector2, WebGLRenderer } from "three";
import { QUALITY } from "../config";

/**
 * Shared render state and the uniform objects every material reads by reference.
 *
 * Deliberately a static singleton rather than something threaded through constructors: there
 * is exactly one xylophone scene, one renderer and one clock. `gl` is only valid while a
 * XylophoneScene exists, which is why consumers that touch it assert it non-null — they are
 * all built after the scene has created its renderer.
 */
export class Properties {
  static viewportWidth = 0;
  static viewportHeight = 0;
  static dpr = Math.min(QUALITY.maxDpr, window.devicePixelRatio || 1);
  static reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  static gl?: WebGLRenderer;

  // clock
  static time = 0;
  static deltaTime = 0;

  // shared by reference into materials — assigning `.value` updates every consumer
  static globalUniforms = {
    u_time: { value: 0 },
    u_deltaTime: { value: 0 },
    u_resolution: { value: new Vector2() },
  };
}
