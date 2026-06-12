import { describe, expect, it } from "vitest";

import { collectBuiltinEffectAssetRequests } from "./manifest";

describe("collectBuiltinEffectAssetRequests", () => {
  it("collects asset-layer assets in normalized order", () => {
    expect(
      collectBuiltinEffectAssetRequests([
        {
          type: "asset-layer",
          params: {
            assets: [
              { id: "video", kind: "video", order: 2, src: "/video/intro.mp4" },
              { id: "image", kind: "image", order: 1, src: "/images/hero.webp" },
              { id: "model", kind: "glb", order: 3, src: "/glb/human.glb" }
            ]
          }
        }
      ])
    ).toEqual([
      { effect: "asset-layer", id: "image", kind: "image", src: "/images/hero.webp" },
      { effect: "asset-layer", id: "video", kind: "video", src: "/video/intro.mp4" },
      { effect: "asset-layer", id: "model", kind: "glb", src: "/glb/human.glb" }
    ]);
  });

  it("collects glb-particles src as a glb request", () => {
    expect(
      collectBuiltinEffectAssetRequests([
        { type: "glb-particles", params: { src: "/glb/human_2.glb" } }
      ])
    ).toEqual([{ effect: "glb-particles", kind: "glb", src: "/glb/human_2.glb" }]);
  });

  it("ignores effects without declared built-in assets", () => {
    expect(
      collectBuiltinEffectAssetRequests([
        { type: "fade-title", params: { text: "hello" } },
        { type: "pixelated-wipe", params: { cutIndex: 0 } },
        { type: "unknown", params: { src: "/ignored.bin" } }
      ])
    ).toEqual([]);
  });

  it("drops invalid asset-layer assets and missing glb-particles src", () => {
    expect(
      collectBuiltinEffectAssetRequests([
        {
          type: "asset-layer",
          params: {
            assets: [
              { id: "ok", kind: "image", src: "/ok.webp" },
              { id: "missing-src", kind: "video" },
              { id: "bad-kind", kind: "font", src: "/font.woff2" }
            ]
          }
        },
        { type: "glb-particles", params: {} }
      ])
    ).toEqual([{ effect: "asset-layer", id: "ok", kind: "image", src: "/ok.webp" }]);
  });
});
