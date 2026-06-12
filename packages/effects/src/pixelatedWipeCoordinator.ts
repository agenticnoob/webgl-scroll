import {
  type RenderContext,
  type TriggerSnapshot,
  sharedStateTree
} from "@webgl-scroll/core";
import * as THREE from "three";

import {
  chooseActiveCutFromTriggers,
  type ScrollTriggerCut
} from "./cutTransitionSmoothing";
import { smoothingAlpha } from "./math";
import { fragmentShader, vertexShader } from "./shaders";
import { getActiveThemeTokens, getThemeTransitionFromTriggers } from "./themeTransitionState";
import { createUniforms, FADE_HALF_LIFE_SECONDS, type ThemeStop } from "./uniforms";

type FrameCoordinator = {
  activeCutIndex: number | undefined;
  activeThemeKey: string;
  displayedCutFade: number;
  frameToken: number;
  hasWrittenThisFrame: boolean;
  material: THREE.ShaderMaterial | null;
  mesh: THREE.Mesh | null;
};

type UpdatePixelatedWipeCoordinatorOptions = {
  context: RenderContext;
  cutSnapshots: Array<ScrollTriggerCut | (ScrollTriggerCut & { fade?: number })>;
  previousActiveCutIndex?: number;
  sections: ThemeStop[];
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

export function beginPixelatedWipeFrame(): void {
  coordinator.frameToken += 1;
  coordinator.hasWrittenThisFrame = false;
}

export function ensurePixelatedWipeResources(scene: THREE.Scene, sections: ThemeStop[]): void {
  if (coordinator.material) {
    return;
  }

  const { uniforms } = createUniforms(sections);
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

export function getPixelatedWipeMaterialFromCoordinator(): THREE.ShaderMaterial | null {
  return coordinator.material;
}

export function getPixelatedWipeCutSnapshots(): ScrollTriggerCut[] {
  return sharedStateTree
    .getByEffect("pixelated-wipe")
    .filter((t: TriggerSnapshot) => t.cutIndex != null)
    .map((t: TriggerSnapshot) => ({ cutIndex: t.cutIndex!, isActive: t.isActive, progress: t.progress }));
}

export function updatePixelatedWipeCoordinator({
  context,
  cutSnapshots,
  previousActiveCutIndex,
  sections
}: UpdatePixelatedWipeCoordinatorOptions): boolean {
  if (!coordinator.material || coordinator.hasWrittenThisFrame) {
    return false;
  }

  const uniforms = coordinator.material.uniforms;
  coordinator.hasWrittenThisFrame = true;
  uniforms.uTime.value = context.time;
  uniforms.uResolution.value.set(context.viewport.width, context.viewport.height);

  const activeCut = chooseActiveCutFromTriggers(
    cutSnapshots,
    previousActiveCutIndex ?? coordinator.activeCutIndex
  );

  if (sections.length > 0) {
    const state = getThemeTransitionFromTriggers({
      cuts: cutSnapshots,
      sections
    });
    const activeTheme = getActiveThemeTokens(state);
    uniforms.uFromColor.value.set(state.from.bg);
    uniforms.uToColor.value.set(state.to.bg);
    coordinator.activeThemeKey = `${activeTheme.bg}|${activeTheme.fg}|${activeTheme.accent}`;
  }

  if (!activeCut) {
    const fadeAlpha = smoothingAlpha(FADE_HALF_LIFE_SECONDS, context.deltaTime);
    coordinator.displayedCutFade += (0 - coordinator.displayedCutFade) * fadeAlpha;
    uniforms.uCutFade.value = coordinator.displayedCutFade;
    uniforms.uHasCut.value = 0;
    coordinator.activeCutIndex = undefined;

    return true;
  }

  const cutElements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-theme-cut='true']")
  );
  const cutElement = cutElements[activeCut.cutIndex];
  const rect = cutElement?.getBoundingClientRect();

  if (!rect) {
    uniforms.uHasCut.value = 0;
    uniforms.uCutFade.value = 0;
    coordinator.activeCutIndex = undefined;

    return true;
  }

  const fadeAlpha = smoothingAlpha(FADE_HALF_LIFE_SECONDS, context.deltaTime);
  coordinator.displayedCutFade += (activeCut.fade - coordinator.displayedCutFade) * fadeAlpha;

  if (sections.length > 0) {
    const from = sections[activeCut.cutIndex]?.bg ?? uniforms.uFromColor.value;
    const to = sections[activeCut.cutIndex + 1]?.bg ?? uniforms.uToColor.value;
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

  return true;
}

export function disposePixelatedWipeCoordinator(): void {
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
