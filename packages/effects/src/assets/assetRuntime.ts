import type * as THREE from "three";

import type { EffectContext, RenderContext, TriggerSnapshot } from "@webgl-scroll/core";

import type { WorldBounds } from "./rectMapping";

export type AssetRuntime = {
  object: THREE.Object3D;
  preload?(snapshot: TriggerSnapshot): void | Promise<void>;
  suspend?(snapshot: TriggerSnapshot): void;
  update(bounds: WorldBounds, snapshot: TriggerSnapshot, context: RenderContext): void;
  dispose(): void;
};

export type AssetRuntimeFactoryContext = Partial<Pick<EffectContext, "assetResolver" | "renderer">>;
