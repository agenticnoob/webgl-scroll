import * as THREE from "three";

import { sharedStateTree, type RenderContext, type TriggerSnapshot } from "@webgl-scroll/core";

import type { AssetRuntime } from "./assetRuntime";
import type { WorldBounds } from "./rectMapping";
import { evaluateAssetOpacity } from "./timeline";
import type { AssetDescriptor } from "./types";

export function createImageAsset(descriptor: AssetDescriptor): AssetRuntime {
  const group = new THREE.Group();
  group.renderOrder = descriptor.order;

  const loader = new THREE.TextureLoader();
  let texture: THREE.Texture | undefined;
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
  let disposed = false;

  loader.load(descriptor.src, (loadedTexture) => {
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
  });

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
