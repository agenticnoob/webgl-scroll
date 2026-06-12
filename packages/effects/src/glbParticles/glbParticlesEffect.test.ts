import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import type { EffectContext, RenderContext, TriggerSnapshot, WebGLEffectInstance } from "@webgl-scroll/core";
import { clearEffectRegistry, resolveEffect, sharedStateTree } from "@webgl-scroll/core";

import { registerBuiltinEffects } from "../builtinEffects";
import {
  glbParticlesEffect,
  resetGlbParticlesRuntimeForTests,
  setGlbParticlesRuntimeForTests
} from "./glbParticlesEffect";

function createLegacyTestProxy(definition: typeof glbParticlesEffect) {
  let instance: WebGLEffectInstance | undefined;

  return {
    create(context: EffectContext) {
      instance = definition.create(context);
    },
    dispose() {
      instance?.dispose();
    },
    enter(snapshot: TriggerSnapshot) {
      instance?.enter?.(snapshot);
    },
    preload(snapshot: TriggerSnapshot, context: RenderContext) {
      return instance?.preload?.(snapshot, context);
    },
    suspend(snapshot: TriggerSnapshot) {
      instance?.suspend?.(snapshot);
    },
    update(snapshot: TriggerSnapshot, context: RenderContext) {
      instance?.update(snapshot, context);
    }
  };
}

const GlbParticlesEffect = function () {
  return createLegacyTestProxy(glbParticlesEffect);
} as unknown as { new(): ReturnType<typeof createLegacyTestProxy> };

function makeContext(params: Record<string, unknown>, scene = new THREE.Scene()): EffectContext {
  return {
    element: document.createElement("section"),
    params,
    renderer: {} as THREE.WebGLRenderer,
    scene
  };
}

function makeRenderContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    camera: new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10),
    deltaTime: 0.016,
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    time: 1,
    viewport: { height: 600, width: 1000 },
    ...overrides
  };
}

function makeSnapshot(element: HTMLElement, overrides: Partial<TriggerSnapshot> = {}): TriggerSnapshot {
  return {
    direction: 0,
    effect: "glb-particles",
    element,
    end: "bottom top",
    id: "scene:particles:0",
    isActive: true,
    params: {},
    progress: 0.5,
    scene: "scene",
    start: "top bottom",
    velocity: 0,
    ...overrides
  };
}

function setVisibleRect(element: HTMLElement): void {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: 600,
    height: 600,
    left: 0,
    right: 1000,
    top: 0,
    width: 1000,
    x: 0,
    y: 0,
    toJSON: () => ({})
  });
}

afterEach(() => {
  resetGlbParticlesRuntimeForTests();
  sharedStateTree.reset();
  clearEffectRegistry();
  vi.restoreAllMocks();
});

describe("GlbParticlesEffect", () => {
  it("does not load sampled origins during create", () => {
    const loadOrigins = vi.fn(async () => new Float32Array(32 * 32 * 3));
    setGlbParticlesRuntimeForTests({ loadOrigins });

    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }));

    expect(loadOrigins).not.toHaveBeenCalled();

    effect.dispose();
  });

  it("loads sampled origins, creates one Points object, and runs simulation while active", async () => {
    const step = vi.fn();
    const dispose = vi.fn();
    const texture = new THREE.Texture();
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: () => ({ dispose, step, texture }),
      loadOrigins: vi.fn(async () => new Float32Array(32 * 32 * 3))
    });

    const scene = new THREE.Scene();
    const element = document.createElement("section");
    setVisibleRect(element);

    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }, scene));
    await effect.preload(makeSnapshot(element), makeRenderContext({ scene }));

    expect(scene.children.some((child) => child.type === "Group")).toBe(true);

    effect.update(makeSnapshot(element), makeRenderContext({ scene }));

    expect(step).toHaveBeenCalledTimes(2);
  });

  it("keeps pointer scatter active briefly after movement stops", async () => {
    const materials: THREE.ShaderMaterial[] = [];
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: ({ material }) => {
        materials.push(material);

        return { dispose: vi.fn(), step: vi.fn(), texture: new THREE.Texture() };
      },
      loadOrigins: vi.fn(async () => new Float32Array(32 * 32 * 3))
    });

    const scene = new THREE.Scene();
    const element = document.createElement("section");
    setVisibleRect(element);
    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }, scene));
    await effect.preload(makeSnapshot(element), makeRenderContext({ scene }));

    sharedStateTree.pointer = {
      idleMs: 0,
      isInside: true,
      isMoving: true,
      lastMoveAt: 100,
      ndcX: 0,
      ndcY: 0,
      velocityX: 1,
      velocityY: 0,
      x: 0.5,
      y: 0.5
    };
    effect.update(makeSnapshot(element), makeRenderContext());

    const velocityMaterial = materials[0];
    expect(velocityMaterial.uniforms.uPointerStrength.value).toBe(1);

    sharedStateTree.pointer = { ...sharedStateTree.pointer, idleMs: 100, isMoving: false };
    effect.update(makeSnapshot(element), makeRenderContext({ deltaTime: 0.1 }));

    expect(velocityMaterial.uniforms.uPointerStrength.value).toBeGreaterThan(0);
    expect(velocityMaterial.uniforms.uPointerStrength.value).toBeLessThan(1);
  });

  it("keeps render-shader pointer displacement active for idle hover decay", async () => {
    const materials: THREE.ShaderMaterial[] = [];
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: ({ material }) => {
        materials.push(material);

        return { dispose: vi.fn(), step: vi.fn(), texture: new THREE.Texture() };
      },
      loadOrigins: vi.fn(async () => new Float32Array(32 * 32 * 3))
    });

    const scene = new THREE.Scene();
    const element = document.createElement("section");
    setVisibleRect(element);
    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }, scene));
    await effect.preload(makeSnapshot(element), makeRenderContext({ scene }));

    sharedStateTree.pointer = {
      idleMs: 160,
      isInside: true,
      isMoving: false,
      lastMoveAt: 100,
      ndcX: 0,
      ndcY: 0,
      velocityX: 0,
      velocityY: 0,
      x: 0.5,
      y: 0.5
    };
    effect.update(makeSnapshot(element), makeRenderContext());

    const group = scene.children.find((child): child is THREE.Group => child.type === "Group");
    const points = group?.children.find(
      (child): child is THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> =>
        child.type === "Points"
    );
    const renderMaterial = points?.material;
    if (!renderMaterial) {
      throw new Error("Expected render material to be created");
    }

    expect(renderMaterial.uniforms.uPointerStrength.value).toBeGreaterThan(0);
    expect(renderMaterial.uniforms.uPointer.value.x).toBe(0);
    expect(renderMaterial.uniforms.uPointer.value.y).toBe(0);
  });

  it("applies declared object transform on top of DOM placement", async () => {
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: () => ({ dispose: vi.fn(), step: vi.fn(), texture: new THREE.Texture() }),
      loadOrigins: vi.fn(async () => new Float32Array(32 * 32 * 3))
    });

    const scene = new THREE.Scene();
    const element = document.createElement("section");
    setVisibleRect(element);
    const effect = new GlbParticlesEffect();
    effect.create(
      makeContext(
        {
          src: "/model.glb",
          transform: {
            autoRotate: { axis: "y", speed: 0.25 },
            rotation: { x: 0.1, y: -0.45, z: 0.2 },
            scale: 0.5
          }
        },
        scene
      )
    );
    await effect.preload(makeSnapshot(element), makeRenderContext({ scene }));

    effect.update(makeSnapshot(element), makeRenderContext({ scene, time: 2 }));

    const group = scene.children.find((child): child is THREE.Group => child.type === "Group");
    if (!group) {
      throw new Error("Expected particle group to be created");
    }

    expect(group.scale.x).toBe(1);
    expect(group.scale.y).toBe(1);
    expect(group.scale.z).toBe(1);
    expect(group.rotation.x).toBe(0.1);
    expect(group.rotation.y).toBeCloseTo(0.05);
    expect(group.rotation.z).toBe(0.2);
  });

  it("skips simulation when reduced motion is active", async () => {
    const step = vi.fn();
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: () => ({ dispose: vi.fn(), step, texture: new THREE.Texture() }),
      loadOrigins: vi.fn(async () => new Float32Array(32 * 32 * 3))
    });

    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }));
    await effect.preload(makeSnapshot(document.createElement("section")), makeRenderContext());

    sharedStateTree.reducedMotion = true;
    effect.update(makeSnapshot(document.createElement("section")), makeRenderContext());

    expect(step).not.toHaveBeenCalled();
  });

  it("disposes particle resources", async () => {
    const dispose = vi.fn();
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: () => ({ dispose, step: vi.fn(), texture: new THREE.Texture() }),
      loadOrigins: vi.fn(async () => new Float32Array(32 * 32 * 3))
    });

    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }));
    await effect.preload(makeSnapshot(document.createElement("section")), makeRenderContext());
    effect.dispose();

    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it("uses host-resolved glb buffers during preload", async () => {
    const resolve = vi.fn().mockResolvedValue({
      kind: "arrayBuffer",
      value: new ArrayBuffer(8)
    });
    const loadOrigins = vi.fn(async () => new Float32Array(32 * 32 * 3));
    const parseOrigins = vi.fn(async () => new Float32Array(32 * 32 * 3));
    setGlbParticlesRuntimeForTests({ loadOrigins, parseOrigins });

    const scene = new THREE.Scene();
    const element = document.createElement("section");
    const effect = new GlbParticlesEffect();
    effect.create({
      ...makeContext({ src: "/model.glb" }, scene),
      assetResolver: { resolve }
    });

    await effect.preload(makeSnapshot(element), makeRenderContext({ scene }));

    expect(resolve).toHaveBeenCalledWith({
      effect: "glb-particles",
      kind: "glb",
      src: "/model.glb"
    });
    expect(parseOrigins).toHaveBeenCalledOnce();
    expect(loadOrigins).not.toHaveBeenCalled();

    effect.dispose();
  });

  it("retries preload after a failed origin load", async () => {
    const loadOrigins = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(new Float32Array(32 * 32 * 3));
    setGlbParticlesRuntimeForTests({
      createSimulationRunner: () => ({ dispose: vi.fn(), step: vi.fn(), texture: new THREE.Texture() }),
      loadOrigins
    });

    const effect = new GlbParticlesEffect();
    effect.create(makeContext({ src: "/model.glb" }));

    await expect(
      effect.preload(makeSnapshot(document.createElement("section")), makeRenderContext())
    ).rejects.toThrow("network");
    await expect(
      effect.preload(makeSnapshot(document.createElement("section")), makeRenderContext())
    ).resolves.toBeUndefined();

    expect(loadOrigins).toHaveBeenCalledTimes(2);

    effect.dispose();
  });
});

describe("registerBuiltinEffects", () => {
  it("registers glb-particles", () => {
    registerBuiltinEffects();

    expect(resolveEffect("glb-particles")).toBeDefined();
  });
});
