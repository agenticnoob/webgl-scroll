import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createImageAsset } from "./imageAsset";
import type { AssetDescriptor } from "./types";

function makeImageDescriptor(overrides: Partial<AssetDescriptor> = {}): AssetDescriptor {
  return {
    composite: { feather: 0, mode: "normal", opacity: 1, threshold: 0 },
    id: "image",
    kind: "image",
    opacity: 1,
    order: 0,
    src: "/image.jpg",
    ...overrides
  };
}

function makeSnapshot() {
  return {
    direction: 0 as const,
    effect: "asset-layer",
    element: document.createElement("section"),
    end: "bottom top",
    id: "scene:asset:0",
    isActive: false,
    params: {},
    progress: 0,
    scene: "scene",
    start: "top bottom",
    velocity: 0
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createImageAsset", () => {
  it("does not start TextureLoader work during creation", () => {
    const load = vi.spyOn(THREE.TextureLoader.prototype, "load");

    const asset = createImageAsset(makeImageDescriptor());

    expect(load).not.toHaveBeenCalled();

    asset.dispose();
  });

  it("uses host-resolved textures during preload without loader fallback", async () => {
    const texture = new THREE.Texture();
    const load = vi.spyOn(THREE.TextureLoader.prototype, "load");
    const resolve = vi.fn().mockResolvedValue({ kind: "texture", value: texture });
    const asset = createImageAsset(makeImageDescriptor(), {
      assetResolver: { resolve }
    });

    await asset.preload?.(makeSnapshot());

    expect(resolve).toHaveBeenCalledWith({
      effect: "asset-layer",
      id: "image",
      kind: "image",
      src: "/image.jpg"
    });
    expect(load).not.toHaveBeenCalled();

    asset.dispose();
  });

  it("retries preload after a resolver failure", async () => {
    const texture = new THREE.Texture();
    const resolve = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ kind: "texture", value: texture });
    const asset = createImageAsset(makeImageDescriptor(), {
      assetResolver: { resolve }
    });

    await expect(asset.preload?.(makeSnapshot())).rejects.toThrow("network");
    await expect(asset.preload?.(makeSnapshot())).resolves.toBeUndefined();

    expect(resolve).toHaveBeenCalledTimes(2);

    asset.dispose();
  });
});
