import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { createParticleDataTextures } from "./particleTextures";

describe("createParticleDataTextures", () => {
  it("packs origin, initial position, and velocity textures", () => {
    const textures = createParticleDataTextures({
      origins: new Float32Array([
        1, 2, 3,
        4, 5, 6
      ]),
      size: 2
    });

    expect(textures.originTexture).toBeInstanceOf(THREE.DataTexture);
    expect(textures.positionTexture).toBeInstanceOf(THREE.DataTexture);
    expect(textures.velocityTexture).toBeInstanceOf(THREE.DataTexture);
    expect(textures.originData.slice(0, 8)).toEqual(new Float32Array([1, 2, 3, 1, 4, 5, 6, 1]));
    expect(textures.positionData.slice(0, 8)).toEqual(new Float32Array([1, 2, 3, 1, 4, 5, 6, 1]));
    expect(textures.velocityData.slice(0, 8)).toEqual(new Float32Array(8));
  });
});
