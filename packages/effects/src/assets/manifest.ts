import type { EffectDescriptor, WebGLAssetRequest } from "@webgl-scroll/core";

import { normalizeGlbParticlesParams } from "../glbParticles/types";
import { normalizeAssetLayerParams } from "./params";

type EffectAssetDescriptor = Pick<EffectDescriptor, "params" | "type">;

export function collectBuiltinEffectAssetRequests(
  effects: EffectAssetDescriptor[]
): WebGLAssetRequest[] {
  const requests: WebGLAssetRequest[] = [];

  for (const effect of effects) {
    if (effect.type === "asset-layer") {
      requests.push(...collectAssetLayerRequests(effect.params));
      continue;
    }

    if (effect.type === "glb-particles") {
      const request = collectGlbParticlesRequest(effect.params);
      if (request) {
        requests.push(request);
      }
    }
  }

  return requests;
}

function collectAssetLayerRequests(params: Record<string, unknown>): WebGLAssetRequest[] {
  return normalizeAssetLayerParams(params).assets.map((asset) => ({
    effect: "asset-layer",
    id: asset.id,
    kind: asset.kind,
    src: asset.src
  }));
}

function collectGlbParticlesRequest(
  params: Record<string, unknown>
): WebGLAssetRequest | undefined {
  const { src } = normalizeGlbParticlesParams(params);

  if (!isNonEmptyString(src)) {
    return undefined;
  }

  return {
    effect: "glb-particles",
    kind: "glb",
    src
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
