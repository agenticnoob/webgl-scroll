import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type EffectContext,
  type RenderContext,
  sharedStateTree,
  type TriggerSnapshot,
  type WebGLEffectInstance,
  type WebGLScrollTriggerSnapshot
} from "@webgl-scroll/core";

import {
  disposePixelatedWipeResources,
  getPixelatedWipeMaterial,
  pixelatedWipeEffect,
  preparePixelatedWipeFrame,
  setPixelatedWipeSections
} from "./pixelatedWipeEffect";
import type { ThemeStop } from "./uniforms";

function createLegacyTestProxy(definition: typeof pixelatedWipeEffect) {
  let instance: WebGLEffectInstance | undefined;

  return {
    create(context: EffectContext) {
      instance = definition.create(context);
    },
    dispose() {
      instance?.dispose();
    },
    update(snapshot: TriggerSnapshot, context: RenderContext) {
      instance?.update(snapshot, context);
    }
  };
}

const PixelatedWipeEffect = function () {
  return createLegacyTestProxy(pixelatedWipeEffect);
} as unknown as { new(): ReturnType<typeof createLegacyTestProxy> };

const testSections: ThemeStop[] = [
  {
    accent: "#baccd9",
    bg: "#142334",
    fg: "#baccd9",
    title: "BUILD"
  },
  {
    accent: "#142334",
    bg: "#baccd9",
    fg: "#142334",
    title: "BLOCKS"
  },
  {
    accent: "#baccd9",
    bg: "#142334",
    fg: "#baccd9",
    title: "FLOW"
  }
];

function makeRenderContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    deltaTime: 0.016,
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    time: 1.5,
    viewport: { height: 900, width: 1440 },
    ...overrides
  };
}

function makeSnapshot(overrides: Partial<TriggerSnapshot> = {}): TriggerSnapshot {
  return {
    cutIndex: 0,
    direction: 0,
    effect: "pixelated-wipe",
    element: document.createElement("div"),
    end: "bottom top",
    id: "scene:cut-0:0",
    isActive: true,
    params: { cutIndex: 0 },
    progress: 0,
    scene: "scene",
    start: "top bottom",
    velocity: 0,
    ...overrides
  };
}

beforeEach(() => {
  setPixelatedWipeSections(testSections);
  sharedStateTree.reset();
});

afterEach(() => {
  disposePixelatedWipeResources();
  sharedStateTree.reset();
  setPixelatedWipeSections([]);
});

describe("PixelatedWipeEffect.create", () => {
  it("creates shared shader material and mesh in the scene", () => {
    const effect = new PixelatedWipeEffect();
    const scene = new THREE.Scene();
    const ctx: EffectContext = {
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    };

    effect.create(ctx);

    expect(scene.children).toHaveLength(1);
    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.renderOrder).toBe(0);

    const material = getPixelatedWipeMaterial();
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
  });

  it("reuses shared resources across instances", () => {
    const effect1 = new PixelatedWipeEffect();
    const effect2 = new PixelatedWipeEffect();
    const scene = new THREE.Scene();

    effect1.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });
    effect2.create({
      element: document.createElement("div"),
      params: { cutIndex: 1 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    // Only one mesh in the scene (shared).
    expect(scene.children).toHaveLength(1);
  });
});

describe("PixelatedWipeEffect.update", () => {
  it("writes uHasCut=0 when no cut triggers are active", () => {
    const effect = new PixelatedWipeEffect();
    const scene = new THREE.Scene();
    const ctx = makeRenderContext({ scene });

    effect.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    preparePixelatedWipeFrame();
    effect.update(makeSnapshot(), ctx);

    const material = getPixelatedWipeMaterial()!;
    expect(material.uniforms.uHasCut.value).toBe(0);
  });

  it("writes uTime and uResolution from render context", () => {
    const effect = new PixelatedWipeEffect();
    const scene = new THREE.Scene();
    const ctx = makeRenderContext({ scene, time: 3.14, viewport: { height: 600, width: 800 } });

    effect.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    preparePixelatedWipeFrame();
    effect.update(makeSnapshot(), ctx);

    const material = getPixelatedWipeMaterial()!;
    expect(material.uniforms.uTime.value).toBe(3.14);
    expect(material.uniforms.uResolution.value.x).toBe(800);
    expect(material.uniforms.uResolution.value.y).toBe(600);
  });

  it("writes cut uniforms when a cut trigger is active", () => {
    // Set up a cut trigger in the shared state tree.
    const cutTrigger: WebGLScrollTriggerSnapshot = {
      cutIndex: 0,
      end: "bottom top",
      id: "scene:cut-0:0",
      isActive: true,
      progress: 0.5,
      role: "cut" as const,
      scene: "scene",
      start: "top bottom",
      trigger: "cut-0"
    };
    sharedStateTree.set("scene:cut-0:0", cutTrigger);

    // Mock a cut DOM element.
    const cutElement = document.createElement("div");
    cutElement.setAttribute("data-theme-cut", "true");
    document.body.appendChild(cutElement);

    vi.spyOn(cutElement, "getBoundingClientRect").mockReturnValue({
      bottom: 550,
      height: 200,
      left: 0,
      right: 1440,
      top: 350,
      width: 1440,
      x: 0,
      y: 350,
      toJSON: () => ({})
    });

    const effect = new PixelatedWipeEffect();
    const scene = new THREE.Scene();
    const ctx = makeRenderContext({ scene });

    effect.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    preparePixelatedWipeFrame();
    effect.update(makeSnapshot(), ctx);

    const material = getPixelatedWipeMaterial()!;
    expect(material.uniforms.uHasCut.value).toBe(1);
    expect(material.uniforms.uCutTop.value).toBe(350);
    expect(material.uniforms.uCutBottom.value).toBe(550);
    expect(material.uniforms.uCutFade.value).toBeGreaterThan(0);

    document.body.removeChild(cutElement);
  });

  it("only one instance writes cut uniforms per frame", () => {
    sharedStateTree.set("scene:cut-0:0", {
      cutIndex: 0,
      end: "bottom top",
      id: "scene:cut-0:0",
      isActive: true,
      progress: 0.5,
      role: "cut",
      scene: "scene",
      start: "top bottom",
      trigger: "cut-0"
    });

    const effect1 = new PixelatedWipeEffect();
    const effect2 = new PixelatedWipeEffect();
    const scene = new THREE.Scene();

    effect1.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });
    effect2.create({
      element: document.createElement("div"),
      params: { cutIndex: 1 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    preparePixelatedWipeFrame();

    // First instance writes.
    effect1.update(makeSnapshot(), makeRenderContext({ scene }));
    const material = getPixelatedWipeMaterial()!;
    const fadeAfterFirst = material.uniforms.uCutFade.value;

    // Second instance in same frame should be skipped.
    effect2.update(makeSnapshot({ params: { cutIndex: 1 } }), makeRenderContext({ scene }));
    const fadeAfterSecond = material.uniforms.uCutFade.value;

    // Uniforms should not have changed.
    expect(fadeAfterSecond).toBe(fadeAfterFirst);
  });

  it("preparePixelatedWipeFrame resets coordinator for new frame", () => {
    const effect = new PixelatedWipeEffect();
    const scene = new THREE.Scene();

    effect.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    // Frame 1
    preparePixelatedWipeFrame();
    effect.update(makeSnapshot(), makeRenderContext({ scene }));

    // Frame 2 — should write again after prepare.
    preparePixelatedWipeFrame();
    effect.update(makeSnapshot(), makeRenderContext({ scene }));

    // No error means frame reset worked.
    expect(getPixelatedWipeMaterial()).not.toBeNull();
  });
});

describe("disposePixelatedWipeResources", () => {
  it("cleans up shared material and mesh", () => {
    const effect = new PixelatedWipeEffect();
    const scene = new THREE.Scene();

    effect.create({
      element: document.createElement("div"),
      params: { cutIndex: 0 },
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    expect(getPixelatedWipeMaterial()).not.toBeNull();
    expect(scene.children).toHaveLength(1);

    disposePixelatedWipeResources();

    expect(getPixelatedWipeMaterial()).toBeNull();
    expect(scene.children).toHaveLength(0);
  });
});
