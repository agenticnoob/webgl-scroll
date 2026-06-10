import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearEffectRegistry,
  EffectRouter,
  type EffectContext,
  type RenderContext,
  registerEffect,
  sharedStateTree,
  type TriggerSnapshot
} from "@webgl-scroll/core";

import { FadeTitleEffect, setFadeTitleSections } from "./fadeTitleEffect";
import type { ThemeStop } from "./uniforms";

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
    time: 0,
    viewport: { height: 900, width: 1440 },
    ...overrides
  };
}

function makeSnapshot(overrides: Partial<TriggerSnapshot> = {}): TriggerSnapshot {
  return {
    direction: 0,
    effect: "fade-title",
    element: document.createElement("section"),
    end: "bottom 30%",
    id: "build:title:0",
    isActive: true,
    params: {},
    progress: 0.5,
    scene: "build",
    start: "top 70%",
    velocity: 0,
    ...overrides
  };
}

beforeEach(() => {
  setFadeTitleSections(testSections);
  sharedStateTree.reset();
});

afterEach(() => {
  sharedStateTree.reset();
  setFadeTitleSections([]);
});

describe("FadeTitleEffect.create", () => {
  it("creates a mesh with canvas texture from element h1", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);
    element.dataset.fg = "#baccd9";

    const scene = new THREE.Scene();
    const ctx: EffectContext = {
      element,
      params: {},
      renderer: {} as THREE.WebGLRenderer,
      scene
    };

    effect.create(ctx);

    expect(scene.children).toHaveLength(1);
    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.renderOrder).toBe(2);

    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0);

    effect.dispose();
  });

  it("uses params.fg as initial color when provided", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);

    const scene = new THREE.Scene();
    const ctx: EffectContext = {
      element,
      params: { fg: "#ff0000" },
      renderer: {} as THREE.WebGLRenderer,
      scene
    };

    effect.create(ctx);

    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.color.getHexString()).toBe("ff0000");

    effect.dispose();
  });

  it("falls back to h2 when h1 is absent", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h2 = document.createElement("h2");
    h2.textContent = "BLOCKS";
    element.appendChild(h2);

    const scene = new THREE.Scene();
    effect.create({
      element,
      params: {},
      renderer: {} as THREE.WebGLRenderer,
      scene
    });

    expect(scene.children).toHaveLength(1);

    effect.dispose();
  });
});

describe("FadeTitleEffect.update", () => {
  it("sets opacity from trigger progress", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);
    document.body.appendChild(element);

    const scene = new THREE.Scene();
    const renderCtx = makeRenderContext({ scene });

    effect.create({ element, params: {}, renderer: {} as THREE.WebGLRenderer, scene });

    // Mock getBoundingClientRect
    vi.spyOn(element.querySelector("h1")!, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 300,
      left: 100,
      right: 800,
      top: 200,
      width: 700,
      x: 100,
      y: 200,
      toJSON: () => ({})
    });

    const snapshot = makeSnapshot({ progress: 0.5 });
    effect.update(snapshot, renderCtx);

    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshBasicMaterial;

    // sin(0.5 * PI) * 0.74 ≈ 0.74
    expect(material.opacity).toBeCloseTo(0.74, 1);

    effect.dispose();
    document.body.removeChild(element);
  });

  it("hides when reduced motion is active", () => {
    sharedStateTree.reducedMotion = true;

    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);

    const scene = new THREE.Scene();
    effect.create({ element, params: {}, renderer: {} as THREE.WebGLRenderer, scene });

    effect.update(makeSnapshot(), makeRenderContext({ scene }));

    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBe(0);

    effect.dispose();
  });

  it("hides when source element has zero-size bounds", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);
    document.body.appendChild(element);

    const scene = new THREE.Scene();
    effect.create({ element, params: {}, renderer: {} as THREE.WebGLRenderer, scene });

    vi.spyOn(h1, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    effect.update(makeSnapshot(), makeRenderContext({ scene }));

    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBe(0);

    effect.dispose();
    document.body.removeChild(element);
  });

  it("hides trigger-based opacity when inactive, keeps state-based floor", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "FLOW";
    element.appendChild(h1);
    document.body.appendChild(element);

    const scene = new THREE.Scene();
    effect.create({ element, params: {}, renderer: {} as THREE.WebGLRenderer, scene });

    vi.spyOn(h1, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 300,
      left: 100,
      right: 800,
      top: 200,
      width: 700,
      x: 100,
      y: 200,
      toJSON: () => ({})
    });

    // FLOW is index 2 — not current or next in default state, so stateOpacity=0.
    effect.update(
      makeSnapshot({ isActive: false, scene: "flow" }),
      makeRenderContext({ scene })
    );

    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBe(0);

    effect.dispose();
    document.body.removeChild(element);
  });

  it("positions mesh from DOM bounds", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);
    document.body.appendChild(element);

    const scene = new THREE.Scene();
    const renderCtx = makeRenderContext({
      scene,
      viewport: { height: 900, width: 1440 }
    });

    effect.create({ element, params: {}, renderer: {} as THREE.WebGLRenderer, scene });

    vi.spyOn(h1, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 300,
      left: 100,
      right: 800,
      top: 200,
      width: 700,
      x: 100,
      y: 200,
      toJSON: () => ({})
    });

    effect.update(makeSnapshot({ progress: 0.5 }), renderCtx);

    const mesh = scene.children[0] as THREE.Mesh;

    // position.x = ((100 + 700*0.5) / 1440) * 2 - 1 = (450/1440)*2 - 1 ≈ -0.375
    expect(mesh.position.x).toBeCloseTo(-0.375, 2);
    // position.y = 1 - ((200 + 300*0.5) / 900) * 2 = 1 - (350/900)*2 ≈ 0.222
    expect(mesh.position.y).toBeCloseTo(0.222, 2);
    // scale.x = (700/1440)*2 ≈ 0.972
    expect(mesh.scale.x).toBeCloseTo(0.972, 2);
    // scale.y = (300/900)*2 ≈ 0.667
    expect(mesh.scale.y).toBeCloseTo(0.667, 2);

    effect.dispose();
    document.body.removeChild(element);
  });
});

describe("FadeTitleEffect.dispose", () => {
  it("cleans up geometry, material, and texture", () => {
    const effect = new FadeTitleEffect();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);

    const scene = new THREE.Scene();
    effect.create({ element, params: {}, renderer: {} as THREE.WebGLRenderer, scene });

    const mesh = scene.children[0] as THREE.Mesh;
    const geometry = mesh.geometry;
    const material = mesh.material as THREE.MeshBasicMaterial;

    const geometrySpy = vi.spyOn(geometry, "dispose");
    const materialSpy = vi.spyOn(material, "dispose");

    effect.dispose();

    expect(geometrySpy).toHaveBeenCalledOnce();
    expect(materialSpy).toHaveBeenCalledOnce();
  });
});

describe("FadeTitleEffect integration with EffectRouter", () => {
  it("works through the router lifecycle", async () => {
    clearEffectRegistry();
    registerEffect({ klass: FadeTitleEffect, type: "fade-title" });

    const router = new EffectRouter();
    const element = document.createElement("section");
    const h1 = document.createElement("h1");
    h1.textContent = "BUILD";
    element.appendChild(h1);
    document.body.appendChild(element);

    vi.spyOn(h1, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 300,
      left: 100,
      right: 800,
      top: 200,
      width: 700,
      x: 100,
      y: 200,
      toJSON: () => ({})
    });

    const scene = new THREE.Scene();
    const renderCtx = makeRenderContext({ scene });
    const snapshot = makeSnapshot({ element, progress: 0.5 });

    router.routeAll([snapshot], renderCtx);
    expect(router.size).toBe(1);
    expect(scene.children).toHaveLength(1);

    // Second frame — reuse instance.
    router.routeAll([snapshot], renderCtx);
    expect(router.size).toBe(1);

    // Remove trigger — dispose.
    router.routeAll([], renderCtx);
    expect(router.size).toBe(0);

    clearEffectRegistry();
    document.body.removeChild(element);
  });
});
