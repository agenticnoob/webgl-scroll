import * as THREE from "three";

import { RenderTargetPool } from "./renderTargetPool";

export type GpuSimulationRunnerOptions = {
  material: THREE.ShaderMaterial;
  pool?: RenderTargetPool;
  size: number;
  textureUniformName?: string;
  type?: THREE.TextureDataType;
};

export class GpuSimulationRunner {
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private readonly material: THREE.ShaderMaterial;
  private readonly ownsPool: boolean;
  private readonly pool: RenderTargetPool;
  private readonly scene = new THREE.Scene();
  private readonly textureUniformName: string;
  private readTarget: THREE.WebGLRenderTarget;
  private writeTarget: THREE.WebGLRenderTarget;

  constructor({
    material,
    pool,
    size,
    textureUniformName = "uPositionTexture",
    type
  }: GpuSimulationRunnerOptions) {
    this.material = material;
    this.ownsPool = !pool;
    this.pool = pool ?? new RenderTargetPool();
    this.textureUniformName = textureUniformName;
    this.readTarget = this.pool.acquire({ height: size, type, width: size });
    this.writeTarget = this.pool.acquire({ height: size, type, width: size });
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
  }

  get texture(): THREE.Texture {
    return this.readTarget.texture;
  }

  step(renderer: THREE.WebGLRenderer): void {
    const previousTarget = renderer.getRenderTarget();

    const textureUniform = this.material.uniforms[this.textureUniformName];
    if (textureUniform) {
      textureUniform.value = this.readTarget.texture;
    }

    renderer.setRenderTarget(this.writeTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previousTarget);
    this.swapTargets();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.pool.release(this.readTarget);
    this.pool.release(this.writeTarget);

    if (this.ownsPool) {
      this.pool.dispose();
    }
  }

  private swapTargets(): void {
    const target = this.readTarget;
    this.readTarget = this.writeTarget;
    this.writeTarget = target;
  }
}
