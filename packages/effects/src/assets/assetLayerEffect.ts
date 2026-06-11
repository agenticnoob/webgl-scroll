import {
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot,
  WebGLEffect
} from "@webgl-scroll/core";

import type { AssetRuntime } from "./assetRuntime";
import { createGLBAsset } from "./glbAsset";
import { createImageAsset } from "./imageAsset";
import { normalizeAssetLayerParams } from "./params";
import { mapElementRectToWorld } from "./rectMapping";
import type { AssetDescriptor } from "./types";
import { createVideoAsset } from "./videoAsset";

type AssetRuntimeFactory = (descriptor: AssetDescriptor) => AssetRuntime;

let runtimeFactory: AssetRuntimeFactory = createDefaultRuntime;

export class AssetLayerEffect extends WebGLEffect {
  readonly type = "asset-layer";

  private assets: AssetRuntime[] = [];
  private placement = normalizeAssetLayerParams({}).placement;

  create(context: EffectContext): void {
    const params = normalizeAssetLayerParams(context.params);
    this.placement = params.placement;
    this.assets = params.assets.map((descriptor) => {
      const runtime = runtimeFactory(descriptor);
      context.scene.add(runtime.object);
      return runtime;
    });
  }

  update(snapshot: TriggerSnapshot, context: RenderContext): void {
    const rect = snapshot.element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const bounds = mapElementRectToWorld({
      placement: this.placement,
      rect,
      viewport: context.viewport
    });

    for (const asset of this.assets) {
      asset.update(bounds, snapshot, context);
    }
  }

  dispose(): void {
    for (const asset of this.assets) {
      asset.dispose();
    }
    this.assets = [];
  }
}

export function setAssetLayerRuntimeFactoryForTests(factory: AssetRuntimeFactory): void {
  runtimeFactory = factory;
}

export function resetAssetLayerRuntimeFactoryForTests(): void {
  runtimeFactory = createDefaultRuntime;
}

function createDefaultRuntime(descriptor: AssetDescriptor): AssetRuntime {
  switch (descriptor.kind) {
    case "image":
      return createImageAsset(descriptor);
    case "video":
      return createVideoAsset(descriptor);
    case "glb":
      return createGLBAsset(descriptor);
  }
}
