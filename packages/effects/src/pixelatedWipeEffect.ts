import {
  defineWebGLEffect,
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot
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

export const pixelatedWipeEffect = defineWebGLEffect({
  type: "pixelated-wipe",
  schema: {
    cutIndex: { type: "number" }
  },
  create(context: EffectContext) {
    ensurePixelatedWipeResources(context.scene, sectionsAccessor);

    return {
      update(_snapshot: TriggerSnapshot, renderContext: RenderContext): void {
        updatePixelatedWipeCoordinator({
          context: renderContext,
          cutSnapshots: getPixelatedWipeCutSnapshots(),
          sections: sectionsAccessor
        });
      },

      dispose(): void {
        // Shared resources are disposed via `disposePixelatedWipeResources()`.
      }
    };
  }
});

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
