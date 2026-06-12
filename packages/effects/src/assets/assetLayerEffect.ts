import {
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot,
  WebGLEffect
} from "@webgl-scroll/core";

import type { AssetRuntime, AssetRuntimeFactoryContext } from "./assetRuntime";
import { createGLBAsset } from "./glbAsset";
import { createImageAsset } from "./imageAsset";
import { normalizeAssetLayerParams } from "./params";
import { mapElementRectToWorld } from "./rectMapping";
import type { AssetDescriptor, AssetPlacement } from "./types";
import { createVideoAsset } from "./videoAsset";

type AssetRuntimeFactory = (
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext
) => AssetRuntime;
type AssetLayerRuntimeEntry = {
  placement?: Partial<AssetPlacement>;
  runtime: AssetRuntime;
};

let runtimeFactory: AssetRuntimeFactory = createDefaultRuntime;

export class AssetLayerEffect extends WebGLEffect {
  readonly type = "asset-layer";

  private assets: AssetLayerRuntimeEntry[] = [];
  private placement = normalizeAssetLayerParams({}).placement;

  create(context: EffectContext): void {
    const params = normalizeAssetLayerParams(context.params);
    this.placement = params.placement;
    this.assets = params.assets.map((descriptor) => {
      const runtime = runtimeFactory(descriptor, {
        assetResolver: context.assetResolver,
        renderer: context.renderer
      });
      context.scene.add(runtime.object);
      return { placement: descriptor.placement, runtime };
    });
  }

  onPreload(snapshot: TriggerSnapshot, _context: RenderContext): Promise<void> {
    return Promise.all(
      this.assets.map((asset) => asset.runtime.preload?.(snapshot))
    ).then(() => undefined);
  }

  onEnter(snapshot: TriggerSnapshot): void {
    for (const asset of this.assets) {
      void Promise.resolve(asset.runtime.preload?.(snapshot)).catch(() => undefined);
    }
  }

  onSuspend(snapshot: TriggerSnapshot): void {
    for (const asset of this.assets) {
      asset.runtime.suspend?.(snapshot);
    }
  }

  update(snapshot: TriggerSnapshot, context: RenderContext): void {
    const rect = snapshot.element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    for (const asset of this.assets) {
      const bounds = mapElementRectToWorld({
        placement: { ...this.placement, ...asset.placement },
        rect,
        viewport: context.viewport
      });

      asset.runtime.update(bounds, snapshot, context);
    }
  }

  dispose(): void {
    for (const asset of this.assets) {
      asset.runtime.dispose();
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

function createDefaultRuntime(
  descriptor: AssetDescriptor,
  context: AssetRuntimeFactoryContext
): AssetRuntime {
  switch (descriptor.kind) {
    case "image":
      return createImageAsset(descriptor, context);
    case "video":
      return createVideoAsset(descriptor, context);
    case "glb":
      return createGLBAsset(descriptor, context);
  }
}
