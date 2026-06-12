import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGLBAsset, disposeObject3D } from "./glbAsset";
import type { AssetDescriptor } from "./types";

function makeGLBDescriptor(overrides: Partial<AssetDescriptor> = {}): AssetDescriptor {
  return {
    composite: { feather: 0, mode: "normal", opacity: 1, threshold: 0 },
    id: "model",
    kind: "glb",
    opacity: 1,
    order: 0,
    src: "/model.glb",
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

describe("disposeObject3D", () => {
  it("disposes shared geometries, materials, and textures once", () => {
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const geometry = new THREE.BoxGeometry();
    const root = new THREE.Group();

    root.add(new THREE.Mesh(geometry, material));
    root.add(new THREE.Mesh(geometry, material));

    const disposeTexture = vi.spyOn(texture, "dispose");
    const disposeMaterial = vi.spyOn(material, "dispose");
    const disposeGeometry = vi.spyOn(geometry, "dispose");

    disposeObject3D(root);

    expect(disposeTexture).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
    expect(disposeGeometry).toHaveBeenCalledOnce();
  });
});

describe("createGLBAsset", () => {
  it("does not start GLTFLoader work during creation", () => {
    const load = vi.spyOn(GLTFLoader.prototype, "load");
    const parse = vi.spyOn(GLTFLoader.prototype, "parse");

    const asset = createGLBAsset(makeGLBDescriptor());

    expect(load).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();

    asset.dispose();
  });

  it("uses host-resolved array buffers during preload without URL fallback", async () => {
    const scene = new THREE.Group();
    const load = vi.spyOn(GLTFLoader.prototype, "load");
    const parse = vi
      .spyOn(GLTFLoader.prototype, "parse")
      .mockImplementation((_data, _path, onLoad) => {
        onLoad({ scene } as Parameters<Parameters<GLTFLoader["parse"]>[2]>[0]);
      });
    const resolve = vi.fn().mockResolvedValue({
      kind: "arrayBuffer",
      value: new ArrayBuffer(8)
    });
    const asset = createGLBAsset(makeGLBDescriptor(), {
      assetResolver: { resolve }
    });

    await asset.preload?.(makeSnapshot());

    expect(resolve).toHaveBeenCalledWith({
      effect: "asset-layer",
      id: "model",
      kind: "glb",
      src: "/model.glb"
    });
    expect(load).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledOnce();
    expect(asset.object.children).toContain(scene);

    asset.dispose();
  });
});
