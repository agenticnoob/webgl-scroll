import {
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot,
  WebGLEffect
} from "@webgl-scroll/core";
import * as THREE from "three";

import {
  beginPixelatedWipeFrame,
  disposePixelatedWipeCoordinator,
  ensurePixelatedWipeResources,
  getPixelatedWipeCutSnapshots,
  getPixelatedWipeMaterialFromCoordinator,
  updatePixelatedWipeCoordinator
} from "./pixelatedWipeCoordinator";
import type { ThemeStop } from "./uniforms";

let sectionsAccessor: ThemeStop[] = [];

/**
 * Provide the sections array so PixelatedWipeEffect instances can compute
 * theme colors and cut transitions. Call once during engine setup.
 */
export function setPixelatedWipeSections(sections: ThemeStop[]): void {
  sectionsAccessor = sections;
}

/**
 * Called once per frame before any effect `update()`. Resets the frame
 * token so all instances can participate in coordination.
 */
export function preparePixelatedWipeFrame(): void {
  beginPixelatedWipeFrame();
}

export class PixelatedWipeEffect extends WebGLEffect {
  readonly type = "pixelated-wipe";

  create(context: EffectContext): void {
    ensurePixelatedWipeResources(context.scene, sectionsAccessor);
  }

  update(_snapshot: TriggerSnapshot, context: RenderContext): void {
    updatePixelatedWipeCoordinator({
      context,
      cutSnapshots: getPixelatedWipeCutSnapshots(),
      sections: sectionsAccessor
    });
  }

  dispose(): void {
    // Shared resources are disposed via `disposePixelatedWipeResources()`.
  }
}

/**
 * Dispose the shared shader material, mesh, and geometry.
 * Call during engine teardown.
 */
export function disposePixelatedWipeResources(): void {
  disposePixelatedWipeCoordinator();
}

/**
 * Return the shared shader material, if initialized.
 * Used by the render loop to access uniforms for external subsystems
 * (e.g. video pool).
 */
export function getPixelatedWipeMaterial(): THREE.ShaderMaterial | null {
  return getPixelatedWipeMaterialFromCoordinator();
}
