import type * as THREE from "three";

import type { RenderContext, TriggerSnapshot } from "@webgl-scroll/core";

import type { WorldBounds } from "./rectMapping";

export type AssetRuntime = {
  object: THREE.Object3D;
  update(bounds: WorldBounds, snapshot: TriggerSnapshot, context: RenderContext): void;
  dispose(): void;
};
