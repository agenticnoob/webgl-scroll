import * as THREE from "three";

import {
  type EffectContext,
  type RenderContext,
  sharedStateTree,
  type TriggerSnapshot,
  WebGLEffect
} from "@webgl-scroll/core";

import {
  chooseActiveCutFromTriggers,
  type ScrollTriggerCut
} from "./cutTransitionSmoothing";
import { smoothingAlpha } from "./math";
import { getActiveThemeTokens, getThemeTransitionFromTriggers } from "./themeTransitionState";
import { fragmentShader, vertexShader } from "./shaders";
import { createUniforms, FADE_HALF_LIFE_SECONDS, type ThemeStop } from "./uniforms";

// ---------------------------------------------------------------------------
// Section data accessor
// ---------------------------------------------------------------------------

let sectionsAccessor: ThemeStop[] = [];

/**
 * Provide the sections array so PixelatedWipeEffect instances can compute
 * theme colors and cut transitions. Call once during engine setup.
 */
export function setPixelatedWipeSections(sections: ThemeStop[]): void {
  sectionsAccessor = sections;
}

// ---------------------------------------------------------------------------
// Shared coordinator state
//
// The cut transition is a global visual effect — at any moment, at most one
// cut is "active" and drives the shared shader uniforms. Multiple DOM cut
// triggers each create a PixelatedWipeEffect instance via the router, but
// they must cooperate so that the active cut's uniforms are not overwritten
// by inactive instances running later in the same frame.
//
// `prepareFrame()` is called by each instance at the start of `update()`.
// It returns true only for the instance whose turn it is to write uniforms
// (the active cut, or the first instance when no cut is active).
// ---------------------------------------------------------------------------

type FrameCoordinator = {
  activeCutIndex: number | undefined;
  activeThemeKey: string;
  displayedCutFade: number;
  frameToken: number;
  hasWrittenThisFrame: boolean;
  material: THREE.ShaderMaterial | null;
  mesh: THREE.Mesh | null;
};

const coordinator: FrameCoordinator = {
  activeCutIndex: undefined,
  activeThemeKey: "",
  displayedCutFade: 0,
  frameToken: 0,
  hasWrittenThisFrame: false,
  material: null,
  mesh: null
};

function ensureSharedResources(scene: THREE.Scene): void {
  if (!coordinator.material) {
    const { uniforms } = createUniforms(sectionsAccessor);
    coordinator.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader,
      uniforms,
      vertexShader
    });
    coordinator.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coordinator.material);
    coordinator.mesh.renderOrder = 0;
    scene.add(coordinator.mesh);
  }
}

function resetFrame(): void {
  coordinator.frameToken += 1;
  coordinator.hasWrittenThisFrame = false;
}

/**
 * Called once per frame before any effect `update()`. Resets the frame
 * token so all instances can participate in coordination.
 */
export function preparePixelatedWipeFrame(): void {
  resetFrame();
}

/**
 * Return all cut trigger snapshots from the shared state tree.
 */
function getCutSnapshots(): ScrollTriggerCut[] {
  return sharedStateTree
    .getByEffect("pixelated-wipe")
    .filter((t) => t.cutIndex != null)
    .map((t) => ({ cutIndex: t.cutIndex!, isActive: t.isActive, progress: t.progress }));
}

// ---------------------------------------------------------------------------
// PixelatedWipeEffect
// ---------------------------------------------------------------------------

/**
 * Renders the pixelated cut transition between sections as a fullscreen
 * shader effect.
 *
 * Multiple instances (one per DOM cut trigger) share a single shader
 * material and mesh via a module-level coordinator. Only the instance
 * corresponding to the currently active cut writes non-zero uniforms.
 *
 * Call `preparePixelatedWipeFrame()` once per frame before the render
 * loop to reset the coordinator's frame state.
 */
export class PixelatedWipeEffect extends WebGLEffect {
  readonly type = "pixelated-wipe";

  private cutIndex: number = -1;

  create(context: EffectContext): void {
    this.cutIndex = (context.params.cutIndex as number | undefined) ?? -1;
    ensureSharedResources(context.scene);
  }

  update(snapshot: TriggerSnapshot, context: RenderContext): void {
    if (!coordinator.material) {
      return;
    }

    const uniforms = coordinator.material.uniforms;

    // Update time and resolution every instance (cheap, idempotent).
    uniforms.uTime.value = context.time;
    uniforms.uResolution.value.set(context.viewport.width, context.viewport.height);

    // Only one instance per frame writes cut-specific uniforms.
    if (coordinator.hasWrittenThisFrame) {
      return;
    }

    coordinator.hasWrittenThisFrame = true;

    const cutSnapshots = getCutSnapshots();
    const activeCut = chooseActiveCutFromTriggers(cutSnapshots, coordinator.activeCutIndex);

    // Theme transition colors.
    if (sectionsAccessor.length > 0) {
      const state = getThemeTransitionFromTriggers({
        cuts: cutSnapshots,
        sections: sectionsAccessor
      });
      const activeTheme = getActiveThemeTokens(state);
      uniforms.uFromColor.value.set(state.from.bg);
      uniforms.uToColor.value.set(state.to.bg);

      const themeKey = `${activeTheme.bg}|${activeTheme.fg}|${activeTheme.accent}`;
      coordinator.activeThemeKey = themeKey;
    }

    // No active cut — converge fade to zero.
    if (!activeCut) {
      const fadeAlpha = smoothingAlpha(FADE_HALF_LIFE_SECONDS, context.deltaTime);
      coordinator.displayedCutFade += (0 - coordinator.displayedCutFade) * fadeAlpha;
      uniforms.uCutFade.value = coordinator.displayedCutFade;
      uniforms.uHasCut.value = 0;
      coordinator.activeCutIndex = undefined;

      return;
    }

    // Active cut — compute bounds and fade.
    const cutElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-theme-cut='true']")
    );
    const cutElement = cutElements[activeCut.cutIndex];
    const rect = cutElement?.getBoundingClientRect();

    if (!rect) {
      uniforms.uHasCut.value = 0;
      uniforms.uCutFade.value = 0;
      coordinator.activeCutIndex = undefined;

      return;
    }

    const fadeAlpha = smoothingAlpha(FADE_HALF_LIFE_SECONDS, context.deltaTime);
    coordinator.displayedCutFade += (activeCut.fade - coordinator.displayedCutFade) * fadeAlpha;

    // Override from/to colors with the specific cut's section colors.
    if (sectionsAccessor.length > 0) {
      const from = sectionsAccessor[activeCut.cutIndex]?.bg ?? uniforms.uFromColor.value;
      const to = sectionsAccessor[activeCut.cutIndex + 1]?.bg ?? uniforms.uToColor.value;
      uniforms.uFromColor.value.set(typeof from === "string" ? from : "#000000");
      uniforms.uToColor.value.set(typeof to === "string" ? to : "#000000");
    }

    uniforms.uCutTop.value = Math.max(rect.top, 0);
    uniforms.uCutBottom.value = Math.min(rect.bottom, context.viewport.height);
    uniforms.uCutFullTop.value = rect.top;
    uniforms.uCutFullBottom.value = rect.bottom;
    uniforms.uCutFade.value = coordinator.displayedCutFade;
    uniforms.uHasCut.value = 1;
    coordinator.activeCutIndex = activeCut.cutIndex;
  }

  dispose(): void {
    // Shared resources are disposed via `disposeSharedResources()`.
    // Individual instances do not dispose the shared material/mesh.
  }
}

// ---------------------------------------------------------------------------
// Shared resource lifecycle
// ---------------------------------------------------------------------------

/**
 * Dispose the shared shader material, mesh, and geometry.
 * Call during engine teardown.
 */
export function disposePixelatedWipeResources(): void {
  if (coordinator.mesh) {
    coordinator.mesh.geometry.dispose();
    coordinator.mesh.removeFromParent();
  }

  if (coordinator.material) {
    coordinator.material.dispose();
  }

  coordinator.material = null;
  coordinator.mesh = null;
  coordinator.activeCutIndex = undefined;
  coordinator.activeThemeKey = "";
  coordinator.displayedCutFade = 0;
  coordinator.frameToken = 0;
  coordinator.hasWrittenThisFrame = false;
}

/**
 * Return the shared shader material, if initialized.
 * Used by the render loop to access uniforms for external subsystems
 * (e.g. video pool).
 */
export function getPixelatedWipeMaterial(): THREE.ShaderMaterial | null {
  return coordinator.material;
}
