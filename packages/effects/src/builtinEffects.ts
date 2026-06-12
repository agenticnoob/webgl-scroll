import { registerEffect, resolveEffect } from "@webgl-scroll/core";
import { assetLayerEffect } from "./assets/assetLayerEffect";
import { fadeTitleEffect } from "./fadeTitleEffect";
import { glbParticlesEffect } from "./glbParticles/glbParticlesEffect";
import { pixelatedWipeEffect } from "./pixelatedWipeEffect";

/**
 * Register all built-in WebGL effects.
 *
 * Call once during engine setup before the first render frame.
 * Subsequent calls are no-ops (guarded by `resolveEffect`).
 */
export function registerBuiltinEffects(): void {
  if (!resolveEffect("asset-layer")) {
    registerEffect(assetLayerEffect);
  }

  if (!resolveEffect("fade-title")) {
    registerEffect(fadeTitleEffect);
  }

  if (!resolveEffect("glb-particles")) {
    registerEffect(glbParticlesEffect);
  }

  if (!resolveEffect("pixelated-wipe")) {
    registerEffect(pixelatedWipeEffect);
  }
}

export function builtinEffects() {
  return [assetLayerEffect, fadeTitleEffect, glbParticlesEffect, pixelatedWipeEffect];
}
