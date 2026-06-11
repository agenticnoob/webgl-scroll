import { describe, expect, it } from "vitest";

import { normalizeAssetLayerParams } from "./params";

describe("normalizeAssetLayerParams", () => {
  it("keeps image, video, and glb assets in stable order", () => {
    const params = normalizeAssetLayerParams({
      assets: [
        { id: "model", kind: "glb", src: "/model.glb", order: 2 },
        { id: "image", kind: "image", src: "/image.jpg", order: 0 },
        { id: "video", kind: "video", src: "/video.mp4", order: 1 }
      ]
    });

    expect(params.assets.map((asset) => asset.id)).toEqual(["image", "video", "model"]);
  });

  it("applies safe defaults for placement, playback, opacity, and composite", () => {
    const params = normalizeAssetLayerParams({
      assets: [{ id: "video", kind: "video", src: "/video.mp4" }]
    });

    expect(params.placement.anchor).toBe("element");
    expect(params.placement.fit).toBe("cover");
    expect(params.assets[0]?.opacity).toBe(1);
    expect(params.assets[0]?.playback?.mode).toBe("loop-while-visible");
    expect(params.assets[0]?.composite?.mode).toBe("normal");
  });

  it("drops invalid assets without throwing", () => {
    const params = normalizeAssetLayerParams({
      assets: [
        { id: "valid", kind: "image", src: "/image.jpg" },
        { id: "missing-src", kind: "video" },
        { id: "unknown-kind", kind: "pdf", src: "/file.pdf" }
      ]
    });

    expect(params.assets.map((asset) => asset.id)).toEqual(["valid"]);
  });
});
