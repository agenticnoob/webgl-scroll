import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { createParticleDataTextures } from "./particleTextures";
import { createGlbParticleSimulationRuntime } from "./simulationRuntime";
import { normalizeGlbParticlesParams } from "./types";

describe("createGlbParticleSimulationRuntime", () => {
  it("steps velocity before position and marks subsequent frames as stateful", () => {
    const calls: string[] = [];
    const textures = createParticleDataTextures({
      origins: new Float32Array(16),
      size: 2
    });
    const runtime = createGlbParticleSimulationRuntime({
      createSimulationRunner: ({ textureUniformName }) => ({
        dispose: vi.fn(),
        step: vi.fn(() => {
          calls.push(textureUniformName ?? "position");
        }),
        texture: new THREE.Texture()
      }),
      params: normalizeGlbParticlesParams({}),
      size: 2,
      textures
    });
    const renderer = {} as THREE.WebGLRenderer;

    runtime.step({ deltaTime: 0.016, renderer });

    expect(calls).toEqual(["uVelocityTexture", "position"]);
    expect(runtime.velocityMaterial.uniforms.uHasState.value).toBe(0);
    expect(runtime.positionMaterial.uniforms.uHasState.value).toBe(0);

    runtime.step({ deltaTime: 0.016, renderer });

    expect(runtime.velocityMaterial.uniforms.uHasState.value).toBe(1);
    expect(runtime.positionMaterial.uniforms.uHasState.value).toBe(1);
  });
});
