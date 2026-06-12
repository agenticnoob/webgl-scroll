import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EffectContext, RenderContext, TriggerSnapshot } from "@webgl-scroll/core";

import { AssetLayerEffect, resetAssetLayerRuntimeFactoryForTests, setAssetLayerRuntimeFactoryForTests } from "./assetLayerEffect";
import type { AssetRuntime } from "./assetRuntime";

function makeRenderContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    deltaTime: 0.016,
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    time: 0,
    viewport: { height: 600, width: 1000 },
    ...overrides
  };
}

function makeSnapshot(element: HTMLElement, overrides: Partial<TriggerSnapshot> = {}): TriggerSnapshot {
  return {
    direction: 0,
    effect: "asset-layer",
    element,
    end: "bottom top",
    id: "scene:asset:0",
    isActive: true,
    params: {},
    progress: 0.5,
    scene: "scene",
    start: "top bottom",
    velocity: 0,
    ...overrides
  };
}

afterEach(() => {
  resetAssetLayerRuntimeFactoryForTests();
  vi.restoreAllMocks();
});

describe("AssetLayerEffect", () => {
  it("normalizes params and creates child assets in order", () => {
    const created: string[] = [];
    setAssetLayerRuntimeFactoryForTests((descriptor) => {
      created.push(descriptor.id);
      return makeRuntime();
    });

    const effect = new AssetLayerEffect();
    effect.create(makeContext({
      assets: [
        { id: "video", kind: "video", order: 2, src: "/video.mp4" },
        { id: "image", kind: "image", order: 1, src: "/image.jpg" }
      ]
    }));

    expect(created).toEqual(["image", "video"]);

    effect.dispose();
  });

  it("maps the trigger rect once and updates all child assets with shared bounds", () => {
    const updates: Array<Parameters<AssetRuntime["update"]>[0]> = [];
    setAssetLayerRuntimeFactoryForTests(() => makeRuntime({ update: (bounds) => updates.push(bounds) }));

    const element = document.createElement("section");
    const getBoundingClientRect = vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 450,
      height: 300,
      left: 250,
      right: 750,
      top: 150,
      width: 500,
      x: 250,
      y: 150,
      toJSON: () => ({})
    });

    const scene = new THREE.Scene();
    const effect = new AssetLayerEffect();
    effect.create(makeContext({
      assets: [
        { id: "image", kind: "image", src: "/image.jpg" },
        { id: "video", kind: "video", src: "/video.mp4" }
      ]
    }, element, scene));

    effect.update(makeSnapshot(element, { progress: 0.25 }), makeRenderContext({ scene }));

    expect(getBoundingClientRect).toHaveBeenCalledOnce();
    expect(updates).toHaveLength(2);
    expect(updates[0]).toEqual(updates[1]);
    expect(updates[0]?.center.x).toBeCloseTo(0);
    expect(updates[0]?.center.y).toBeCloseTo(0);
    expect(updates[0]?.size.width).toBeCloseTo(1);
    expect(updates[0]?.size.height).toBeCloseTo(1);

    effect.dispose();
  });

  it("applies per-asset placement overrides on top of shared placement", () => {
    const updates: Record<string, Parameters<AssetRuntime["update"]>[0]> = {};
    setAssetLayerRuntimeFactoryForTests((descriptor) =>
      makeRuntime({ update: (bounds) => { updates[descriptor.id] = bounds; } })
    );

    const element = document.createElement("section");
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

    const effect = new AssetLayerEffect();
    effect.create(makeContext({
      assets: [
        { id: "base", kind: "video", src: "/base.mp4" },
        {
          id: "small-left",
          kind: "video",
          placement: { height: 0.5, width: 0.5, x: 0.25, y: 0.25 },
          src: "/small.mp4"
        }
      ],
      placement: { height: 1, width: 1, x: 0.5, y: 0.5 }
    }, element));

    effect.update(makeSnapshot(element), makeRenderContext());

    expect(updates.base.center.x).toBeCloseTo(0);
    expect(updates.base.center.y).toBeCloseTo(0);
    expect(updates.base.size.width).toBeCloseTo(2);
    expect(updates.base.size.height).toBeCloseTo(2);
    expect(updates["small-left"].center.x).toBeCloseTo(-0.5);
    expect(updates["small-left"].center.y).toBeCloseTo(0.5);
    expect(updates["small-left"].size.width).toBeCloseTo(1);
    expect(updates["small-left"].size.height).toBeCloseTo(1);

    effect.dispose();
  });

  it("disposes every child asset", () => {
    const disposers = [vi.fn(), vi.fn()];
    setAssetLayerRuntimeFactoryForTests(() => makeRuntime({ dispose: disposers.shift() }));

    const effect = new AssetLayerEffect();
    effect.create(makeContext({
      assets: [
        { id: "image", kind: "image", src: "/image.jpg" },
        { id: "video", kind: "video", src: "/video.mp4" }
      ]
    }));

    effect.dispose();

    expect(disposers).toHaveLength(0);
  });

  it("forwards lifecycle hooks to child assets", async () => {
    const preload = vi.fn().mockResolvedValue(undefined);
    const suspend = vi.fn();
    setAssetLayerRuntimeFactoryForTests(() => makeRuntime({ preload, suspend }));

    const element = document.createElement("section");
    const effect = new AssetLayerEffect();
    const snapshot = makeSnapshot(element);
    effect.create(makeContext({
      assets: [
        { id: "image", kind: "image", src: "/image.jpg" },
        { id: "video", kind: "video", src: "/video.mp4" }
      ]
    }, element));

    await effect.onPreload(snapshot, makeRenderContext());
    effect.onSuspend(snapshot);

    expect(preload).toHaveBeenCalledTimes(2);
    expect(preload).toHaveBeenNthCalledWith(1, snapshot);
    expect(suspend).toHaveBeenCalledTimes(2);

    effect.dispose();
  });

  it("starts child preloads when entering without waiting for preload range", () => {
    const preload = vi.fn();
    setAssetLayerRuntimeFactoryForTests(() => makeRuntime({ preload }));

    const element = document.createElement("section");
    const effect = new AssetLayerEffect();
    const snapshot = makeSnapshot(element);
    effect.create(makeContext({
      assets: [{ id: "image", kind: "image", src: "/image.jpg" }]
    }, element));

    effect.onEnter(snapshot);

    expect(preload).toHaveBeenCalledOnce();
    expect(preload).toHaveBeenCalledWith(snapshot);

    effect.dispose();
  });

  it("swallows enter fallback preload failures so router preload remains authoritative", async () => {
    const preload = vi.fn().mockRejectedValue(new Error("network"));
    setAssetLayerRuntimeFactoryForTests(() => makeRuntime({ preload }));

    const element = document.createElement("section");
    const effect = new AssetLayerEffect();
    effect.create(makeContext({
      assets: [{ id: "image", kind: "image", src: "/image.jpg" }]
    }, element));

    effect.onEnter(makeSnapshot(element));
    await Promise.resolve();

    expect(preload).toHaveBeenCalledOnce();

    effect.dispose();
  });
});

function makeContext(
  params: Record<string, unknown>,
  element: HTMLElement = document.createElement("section"),
  scene: THREE.Scene = new THREE.Scene()
): EffectContext {
  return {
    element,
    params,
    renderer: {} as THREE.WebGLRenderer,
    scene
  };
}

function makeRuntime(overrides: Partial<AssetRuntime> = {}): AssetRuntime {
  return {
    dispose: vi.fn(),
    object: new THREE.Object3D(),
    update: vi.fn(),
    ...overrides
  };
}
