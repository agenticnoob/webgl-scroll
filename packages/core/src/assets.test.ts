import { describe, expect, it, vi } from "vitest";

import type { WebGLAssetRequest, WebGLAssetResolver } from "./assets";

describe("asset resolver types", () => {
  it("allows a host resolver to return a cached array buffer", async () => {
    const request: WebGLAssetRequest = {
      effect: "glb-particles",
      kind: "glb",
      src: "/glb/human_2.glb"
    };
    const buffer = new ArrayBuffer(8);
    const resolver: WebGLAssetResolver = {
      resolve: vi.fn(async () => ({ kind: "arrayBuffer", value: buffer }) as const)
    };

    await expect(resolver.resolve(request)).resolves.toEqual({ kind: "arrayBuffer", value: buffer });
  });
});
