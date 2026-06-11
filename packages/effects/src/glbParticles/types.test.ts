import { describe, expect, it } from "vitest";

import { normalizeGlbParticlesParams } from "./types";

describe("normalizeGlbParticlesParams", () => {
  it("normalizes defaults for a GPU GLB particle effect", () => {
    const params = normalizeGlbParticlesParams({ src: "/model.glb" });

    expect(params).toEqual({
      color: "#ffffff",
      damping: 0.92,
      particleTextureSize: 32,
      placement: {
        anchor: "element",
        fit: "contain",
        height: 1,
        offsetX: 0,
        offsetY: 0,
        width: 1,
        x: 0.5,
        y: 0.5
      },
      pointSize: 2,
      pointerRadius: 0.18,
      returnForce: 0.9,
      scatterForce: 1.4,
      src: "/model.glb"
    });
  });

  it("clamps particle texture size to a power-of-two range", () => {
    expect(normalizeGlbParticlesParams({ particleTextureSize: 1000, src: "/model.glb" }).particleTextureSize).toBe(512);
    expect(normalizeGlbParticlesParams({ particleTextureSize: 2, src: "/model.glb" }).particleTextureSize).toBe(32);
  });
});
