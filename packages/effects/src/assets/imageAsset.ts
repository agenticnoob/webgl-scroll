import * as THREE from "three";

import { sharedStateTree, type RenderContext, type TriggerSnapshot } from "@webgl-scroll/core";

import type { AssetRuntime, AssetRuntimeFactoryContext } from "./assetRuntime";
import type { WorldBounds } from "./rectMapping";
import { evaluateAssetOpacity } from "./timeline";
import type { AssetDescriptor } from "./types";

export function createImageAsset(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext = {}
): AssetRuntime {
  const group = new THREE.Group();
  group.renderOrder = descriptor.order;

  let texture: THREE.Texture | undefined;
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
  let disposed = false;
  let preloadPromise: Promise<void> | undefined;

  function attachTexture(loadedTexture: THREE.Texture): void {
    if (disposed) {
      loadedTexture.dispose();
      return;
    }

    texture = loadedTexture;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const material = new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0,
      transparent: true
    });

    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.renderOrder = descriptor.order;
    group.add(mesh);
  }

  function preload(): Promise<void> {
    if (texture || preloadPromise) {
      return preloadPromise ?? Promise.resolve();
    }

    preloadPromise = loadTexture(descriptor, context)
      .then(attachTexture)
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
      mesh?.geometry.dispose();
      if (mesh?.material) {
        mesh.material.dispose();
      }
      texture?.dispose();
      group.removeFromParent();
    },
    preload,
    update(bounds: WorldBounds, snapshot: TriggerSnapshot, _context: RenderContext) {
      group.position.set(bounds.center.x, bounds.center.y, 0);
      group.scale.set(bounds.size.width, bounds.size.height, 1);
      group.visible = snapshot.isActive && !sharedStateTree.reducedMotion;

      if (mesh?.material) {
        mesh.material.opacity = snapshot.isActive
          ? evaluateAssetOpacity({
              opacity: descriptor.opacity,
              progress: snapshot.progress,
              transform: descriptor.transform
            })
          : 0;
      }
    }
  };
}

async function loadTexture(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext
): Promise<THREE.Texture> {
  const resolved = await context.assetResolver?.resolve({
    effect: "asset-layer",
    id: descriptor.id,
    kind: "image",
    src: descriptor.src
  });

  if (resolved?.kind === "texture" && resolved.value instanceof THREE.Texture) {
    return resolved.value;
  }

  if (resolved?.kind === "imageBitmap") {
    const texture = new THREE.Texture(resolved.value);
    texture.needsUpdate = true;
    return texture;
  }

  if (resolved?.kind === "blob") {
    const url = URL.createObjectURL(resolved.value);
    try {
      return await loadTextureFromUrl(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return loadTextureFromUrl(descriptor.src);
}

function loadTextureFromUrl(src: string): Promise<THREE.Texture> {
  const loader = new THREE.TextureLoader();

  return new Promise((resolve, reject) => {
    loader.load(src, resolve, undefined, reject);
  });
}
