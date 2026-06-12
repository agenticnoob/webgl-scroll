import * as THREE from "three";

import { sharedStateTree, type TriggerSnapshot } from "@webgl-scroll/core";

import type { AssetRuntime, AssetRuntimeFactoryContext } from "./assetRuntime";
import { evaluateAssetOpacity, mapScrollToTime } from "./timeline";
import type { AssetDescriptor } from "./types";

type PlaybackSnapshot = Pick<TriggerSnapshot, "isActive" | "progress">;

export type VideoAssetRuntime = AssetRuntime & {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  object: THREE.Object3D;
  texture: THREE.VideoTexture;
  video: HTMLVideoElement;
  updatePlayback(snapshot: PlaybackSnapshot): void;
};

export function createVideoAsset(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext = {}
): VideoAssetRuntime {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "none";

  const texture = new THREE.VideoTexture(video);
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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = descriptor.order;

  let disposed = false;
  let playedOnce = false;
  let objectUrl: string | undefined;
  let preloadPromise: Promise<void> | undefined;

  async function preload(): Promise<void> {
    if (video.currentSrc || video.src || preloadPromise) {
      return preloadPromise ?? Promise.resolve();
    }

    preloadPromise = resolveVideoSource(descriptor, context)
      .then((src) => {
        if (disposed) {
          if (src.startsWith("blob:")) {
            URL.revokeObjectURL(src);
          }
          return;
        }

        objectUrl = src.startsWith("blob:") ? src : undefined;
        video.preload = "metadata";
        video.src = src;
        video.load();
      })
      .catch((error: unknown) => {
        preloadPromise = undefined;
        throw error;
      });

    return preloadPromise;
  }

  function updatePlayback(snapshot: PlaybackSnapshot): void {
    const playback = descriptor.playback ?? { mode: "loop-while-visible", startTime: 0 };

    if (disposed || sharedStateTree.reducedMotion) {
      video.pause();
      return;
    }

    if (playback.mode === "scroll-scrub") {
      video.pause();

      if (Number.isFinite(video.duration) && video.duration > 0) {
        const endTime = playback.endTime ?? video.duration;
        const target = mapScrollToTime({
          endTime,
          progress: snapshot.progress,
          startTime: playback.startTime
        });

        if (Math.abs(video.currentTime - target) > 0.04) {
          video.currentTime = target;
        }
      }

      return;
    }

    if (playback.mode === "once-on-enter") {
      if (snapshot.isActive && !playedOnce) {
        playedOnce = true;
        void video.play().catch(() => undefined);
      }
      return;
    }

    if (snapshot.isActive) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  return {
    mesh,
    object: mesh,
    texture,
    video,
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      video.pause();
      video.removeAttribute("src");
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      }
      texture.dispose();
      material.dispose();
      mesh.geometry.dispose();
      mesh.removeFromParent();
    },
    preload,
    suspend() {
      video.pause();
    },
    update(bounds, snapshot) {
      const opacity = snapshot.isActive
        ? evaluateAssetOpacity({
            opacity: descriptor.opacity,
            progress: snapshot.progress,
            transform: descriptor.transform
          })
        : 0;

      mesh.position.set(bounds.center.x, bounds.center.y, 0);
      mesh.scale.set(bounds.size.width, bounds.size.height, 1);
      material.opacity = opacity;
      mesh.visible = opacity > 0 && !sharedStateTree.reducedMotion;
      if (snapshot.isActive) {
        void preload().catch(() => undefined);
      }
      updatePlayback(snapshot);
    },
    updatePlayback
  };
}

async function resolveVideoSource(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext
): Promise<string> {
  const resolved = await context.assetResolver?.resolve({
    effect: "asset-layer",
    id: descriptor.id,
    kind: "video",
    src: descriptor.src
  });

  if (resolved?.kind === "blob") {
    return URL.createObjectURL(resolved.value);
  }

  if (resolved?.kind === "video" && resolved.value.currentSrc) {
    return resolved.value.currentSrc;
  }

  if (resolved?.kind === "video" && resolved.value.src) {
    return resolved.value.src;
  }

  return descriptor.src;
}
