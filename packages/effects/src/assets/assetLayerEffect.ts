import {
  defineWebGLEffect,
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot
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

export const assetLayerEffect = defineWebGLEffect({
  type: "asset-layer",
  create(context: EffectContext) {
    let assets: AssetLayerRuntimeEntry[] = [];
    const params = normalizeAssetLayerParams(context.params);
    const placement = params.placement;
    assets = params.assets.map((descriptor) => {
      const runtime = runtimeFactory(descriptor, {
        assetResolver: context.assetResolver,
        renderer: context.renderer
      });
      context.scene.add(runtime.object);
      return { placement: descriptor.placement, runtime };
    });

    return {
      preload(snapshot: TriggerSnapshot, _context: RenderContext): Promise<void> {
        return Promise.all(
          assets.map((asset) => asset.runtime.preload?.(snapshot))
        ).then(() => undefined);
      },

      enter(snapshot: TriggerSnapshot): void {
        for (const asset of assets) {
          void Promise.resolve(asset.runtime.preload?.(snapshot)).catch(() => undefined);
        }
      },

      suspend(snapshot: TriggerSnapshot): void {
        for (const asset of assets) {
          asset.runtime.suspend?.(snapshot);
        }
      },

      update(snapshot: TriggerSnapshot, renderContext: RenderContext): void {
        const rect = snapshot.element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        for (const asset of assets) {
          const bounds = mapElementRectToWorld({
            placement: { ...placement, ...asset.placement },
            rect,
            viewport: renderContext.viewport
          });

          asset.runtime.update(bounds, snapshot, renderContext);
        }
      },

      dispose(): void {
        for (const asset of assets) {
          asset.runtime.dispose();
        }
        assets = [];
      }
    };
  }
});

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
