import { registerEffect, resolveEffect } from "@webgl-scroll/core";
import { AssetLayerEffect } from "./assets/assetLayerEffect";
import { FadeTitleEffect } from "./fadeTitleEffect";
import { GlbParticlesEffect } from "./glbParticles/glbParticlesEffect";
import { PixelatedWipeEffect } from "./pixelatedWipeEffect";

/**
 * Register all built-in WebGL effects.
 *
 * Call once during engine setup before the first render frame.
 * Subsequent calls are no-ops (guarded by `resolveEffect`).
 */
export function registerBuiltinEffects(): void {
  if (!resolveEffect("asset-layer")) {
    registerEffect({ klass: AssetLayerEffect, type: "asset-layer" });
  }

  if (!resolveEffect("fade-title")) {
    registerEffect({ klass: FadeTitleEffect, type: "fade-title" });
  }

  if (!resolveEffect("glb-particles")) {
    registerEffect({ klass: GlbParticlesEffect, type: "glb-particles" });
  }

  if (!resolveEffect("pixelated-wipe")) {
    registerEffect({
      klass: PixelatedWipeEffect,
      paramSchema: {
        cutIndex: { type: "number" }
      },
      type: "pixelated-wipe"
    });
  }
}
