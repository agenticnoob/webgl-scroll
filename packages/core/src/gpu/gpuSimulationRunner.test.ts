import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { GpuSimulationRunner } from "./gpuSimulationRunner";
import { RenderTargetPool } from "./renderTargetPool";

type FakeRenderer = {
  getRenderTarget: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  setRenderTarget: ReturnType<typeof vi.fn>;
};

function createRenderer(previousTarget: THREE.WebGLRenderTarget | null = null): FakeRenderer {
  return {
    getRenderTarget: vi.fn(() => previousTarget),
    render: vi.fn(),
    setRenderTarget: vi.fn()
  };
}

describe("GpuSimulationRunner", () => {
  it("alternates read and write targets on each step", () => {
    const material = new THREE.ShaderMaterial({ uniforms: { uPositionTexture: { value: null } } });
    const runner = new GpuSimulationRunner({ material, size: 8 });
    const renderer = createRenderer();
    const firstTexture = runner.texture;

    runner.step(renderer as unknown as THREE.WebGLRenderer);
    const secondTexture = runner.texture;
    runner.step(renderer as unknown as THREE.WebGLRenderer);

    expect(secondTexture).not.toBe(firstTexture);
    expect(runner.texture).toBe(firstTexture);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(renderer.setRenderTarget).toHaveBeenCalledTimes(4);
  });

  it("restores the renderer's previous render target after stepping", () => {
    const previousTarget = new THREE.WebGLRenderTarget(4, 4);
    const runner = new GpuSimulationRunner({ material: new THREE.ShaderMaterial(), size: 8 });
    const renderer = createRenderer(previousTarget);

    runner.step(renderer as unknown as THREE.WebGLRenderer);

    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(previousTarget);
  });

  it("can write the previous state texture into a custom uniform", () => {
    const material = new THREE.ShaderMaterial({
      uniforms: { uVelocityTexture: { value: null } }
    });
    const runner = new GpuSimulationRunner({
      material,
      size: 8,
      textureUniformName: "uVelocityTexture"
    });

    runner.step(createRenderer() as unknown as THREE.WebGLRenderer);

    expect(material.uniforms.uVelocityTexture.value).toBeInstanceOf(THREE.Texture);
  });

  it("releases targets and disposes owned resources", () => {
    const pool = new RenderTargetPool();
    const material = new THREE.ShaderMaterial();
    const materialDispose = vi.spyOn(material, "dispose");
    const poolRelease = vi.spyOn(pool, "release");
    const runner = new GpuSimulationRunner({ material, pool, size: 8 });

    runner.dispose();

    expect(poolRelease).toHaveBeenCalledTimes(2);
    expect(materialDispose).toHaveBeenCalledOnce();
  });
});
