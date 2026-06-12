import * as THREE from "three";

import {
  defineWebGLEffect,
  type EffectContext,
  type RenderContext,
  sharedStateTree,
  type TriggerSnapshot
} from "@webgl-scroll/core";

import { getActiveThemeTokens, getThemeTransitionFromTriggers } from "./themeTransitionState";
import { TITLE_TEXTURE_FONT, type ThemeStop } from "./uniforms";

// ---------------------------------------------------------------------------
// Section data accessor
// ---------------------------------------------------------------------------

let sectionsAccessor: ThemeStop[] = [];

/**
 * Provide the sections array so FadeTitleEffect instances can compute
 * theme-transition-based opacity. Call once during engine setup, before
 * the render loop starts.
 */
export function setFadeTitleSections(sections: ThemeStop[]): void {
  sectionsAccessor = sections;
}

// ---------------------------------------------------------------------------
// Shared texture creation (reuses the existing utility)
// ---------------------------------------------------------------------------

function createTitleTexture(title: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (context) {
    context.font = TITLE_TEXTURE_FONT;
    const metrics = context.measureText(title);
    const ascent = metrics.actualBoundingBoxAscent || 300;
    const descent = metrics.actualBoundingBoxDescent || 60;
    const padding = 24;

    canvas.width = Math.ceil(metrics.width + padding * 2);
    canvas.height = Math.ceil(ascent + descent + padding * 2);
    context.font = TITLE_TEXTURE_FONT;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.textBaseline = "alphabetic";
    context.fillText(title, padding, padding + ascent);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;

  return texture;
}

// ---------------------------------------------------------------------------
// FadeTitleEffect
// ---------------------------------------------------------------------------

/**
 * Renders a section title as a canvas-texture plane inside the WebGL scene.
 *
 * The title text is read from the trigger element's first `h1`/`h2` child.
 * The initial color is read from `data-fg`. Per-frame opacity is the max
 * of trigger-progress-based fade and theme-transition state opacity.
 */
export const fadeTitleEffect = defineWebGLEffect({
  type: "fade-title",
  create(context: EffectContext) {
    let sourceElement: HTMLElement | null = null;
    const titleElement = context.element.querySelector<HTMLElement>("h1, h2");
    const title = titleElement?.textContent?.trim() ?? "";
    const fg = (context.params.fg as string | undefined) ?? context.element.dataset.fg ?? "#ffffff";

    sourceElement = titleElement ?? context.element;
    const texture = createTitleTexture(title);
    const material = new THREE.MeshBasicMaterial({
      color: fg,
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0,
      transparent: true
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.renderOrder = 2;
    context.scene.add(mesh);

    return {
      update(snapshot: TriggerSnapshot, renderContext: RenderContext): void {
        if (sharedStateTree.reducedMotion) {
          material.opacity = 0;
          return;
        }

        const rect = sourceElement?.getBoundingClientRect();

        if (!rect || rect.width <= 0 || rect.height <= 0) {
          material.opacity = 0;
          return;
        }

        const triggerOpacity = snapshot.isActive
          ? Math.sin(Math.min(Math.max(snapshot.progress, 0), 1) * Math.PI) * 0.74
          : 0;

        const stateOpacity = computeStateOpacity(snapshot.scene);
        const opacity = Math.max(triggerOpacity, stateOpacity);

        const activeTheme = getActiveTheme();
        material.color.set(activeTheme.fg);
        material.opacity = opacity;

        const { height, width } = renderContext.viewport;
        mesh.position.x = ((rect.left + rect.width * 0.5) / width) * 2 - 1;
        mesh.position.y = 1 - ((rect.top + rect.height * 0.5) / height) * 2;
        mesh.scale.set((rect.width / width) * 2, (rect.height / height) * 2, 1);
      },

      dispose(): void {
        mesh.geometry.dispose();
        material.dispose();
        texture.dispose();
      }
    };
  }
});

function computeStateOpacity(sceneName: string): number {
  if (sectionsAccessor.length === 0) {
    return 0;
  }

  const cutSnapshots = sharedStateTree
    .getByEffect("pixelated-wipe")
    .filter((t) => t.cutIndex != null)
    .map((t) => ({ cutIndex: t.cutIndex!, isActive: t.isActive, progress: t.progress }));

  const state = getThemeTransitionFromTriggers({
    cuts: cutSnapshots,
    sections: sectionsAccessor
  });

  const sectionIndex = sectionsAccessor.findIndex(
    (s) => s.title?.toLowerCase() === sceneName
  );

  if (sectionIndex < 0) {
    return 0;
  }

  if (sectionIndex === state.currentIndex) {
    return 0.32;
  }

  if (sectionIndex === state.nextIndex) {
    return state.progress * 0.36;
  }

  return 0;
}

function getActiveTheme(): { fg: string } {
  if (sectionsAccessor.length === 0) {
    return { fg: "#ffffff" };
  }

  const cutSnapshots = sharedStateTree
    .getByEffect("pixelated-wipe")
    .filter((t) => t.cutIndex != null)
    .map((t) => ({ cutIndex: t.cutIndex!, isActive: t.isActive, progress: t.progress }));

  const state = getThemeTransitionFromTriggers({
    cuts: cutSnapshots,
    sections: sectionsAccessor
  });

  return getActiveThemeTokens(state);
}
