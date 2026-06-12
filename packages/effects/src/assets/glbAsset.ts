import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { sharedStateTree, type RenderContext, type TriggerSnapshot } from "@webgl-scroll/core";

import type { AssetRuntime, AssetRuntimeFactoryContext } from "./assetRuntime";
import type { WorldBounds } from "./rectMapping";
import { evaluateAssetOpacity, evaluateScrollTuple } from "./timeline";
import type { AssetDescriptor } from "./types";

export function createGLBAsset(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext = {}
): AssetRuntime {
  const group = new THREE.Group();
  group.renderOrder = descriptor.order;

  let loadedScene: THREE.Object3D | undefined;
  let disposed = false;
  let preloadPromise: Promise<void> | undefined;

  function attachScene(scene: THREE.Object3D): void {
    if (disposed) {
      disposeObject3D(scene);
      return;
    }

    loadedScene = scene;
    group.add(loadedScene);
  }

  function preload(): Promise<void> {
    if (loadedScene || preloadPromise) {
      return preloadPromise ?? Promise.resolve();
    }

    preloadPromise = loadGLBScene(descriptor, context)
      .then(attachScene)
      .catch((error: unknown) => {
        preloadPromise = undefined;
        throw error;
      });
    return preloadPromise;
  }

  return {
    object: group,
    dispose() {
      disposed = true;
      if (loadedScene) {
        disposeObject3D(loadedScene);
      }
      group.removeFromParent();
    },
    preload,
    update(bounds: WorldBounds, snapshot: TriggerSnapshot, _context: RenderContext) {
      const baseScale = Math.min(bounds.size.width, bounds.size.height);
      const transform = descriptor.transform;

      group.position.set(bounds.center.x, bounds.center.y, 0);
      group.scale.setScalar(
        transform?.scale ? evaluateScrollTuple(transform.scale, snapshot.progress) * baseScale : baseScale
      );
      group.rotation.x = transform?.rotateX
        ? evaluateScrollTuple(transform.rotateX, snapshot.progress)
        : 0;
      group.rotation.y = transform?.rotateY
        ? evaluateScrollTuple(transform.rotateY, snapshot.progress)
        : 0;
      group.rotation.z = transform?.rotateZ
        ? evaluateScrollTuple(transform.rotateZ, snapshot.progress)
        : 0;
      group.visible = snapshot.isActive && !sharedStateTree.reducedMotion;

      const opacity = snapshot.isActive
        ? evaluateAssetOpacity({
            opacity: descriptor.opacity,
            progress: snapshot.progress,
            transform
          })
        : 0;
      applyOpacity(group, opacity);
    }
  };
}

async function loadGLBScene(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext
): Promise<THREE.Object3D> {
  const resolved = await context.assetResolver?.resolve({
    effect: "asset-layer",
    id: descriptor.id,
    kind: "glb",
    src: descriptor.src
  });

  if (resolved?.kind === "arrayBuffer") {
    return parseGLBArrayBuffer(resolved.value);
  }

  if (resolved?.kind === "blob") {
    const buffer = await resolved.value.arrayBuffer();
    return parseGLBArrayBuffer(buffer);
  }

  return loadGLBFromUrl(descriptor.src);
}

function loadGLBFromUrl(src: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(src, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

function parseGLBArrayBuffer(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.parse(buffer, "", (gltf) => resolve(gltf.scene), reject);
  });
}

export function disposeObject3D(object: THREE.Object3D): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    disposeMaterial(mesh.material, disposedMaterials, disposedTextures);
  });
}

function applyOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    for (const material of materials) {
      if ("opacity" in material) {
        material.transparent = true;
        material.opacity = opacity;
      }
    }
  });
}

function disposeMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
  disposedMaterials: Set<THREE.Material>,
  disposedTextures: Set<THREE.Texture>
): void {
  const materials = Array.isArray(material) ? material : material ? [material] : [];

  for (const item of materials) {
    if (disposedMaterials.has(item)) {
      continue;
    }

    disposedMaterials.add(item);

    for (const value of Object.values(item)) {
      if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
        disposedTextures.add(value);
        value.dispose();
      }
    }
    item.dispose();
  }
}
