import * as THREE from "three";

import { createPositionMaterial, createVelocityMaterial } from "./materials";
import type { ParticleDataTextures } from "./particleTextures";
import type { GlbParticlesParams } from "./types";

export type SimulationRuntime = {
  dispose(): void;
  step(renderer: THREE.WebGLRenderer): void;
  texture: THREE.Texture;
};

export type CreateSimulationRunner = (options: {
  material: THREE.ShaderMaterial;
  size: number;
  textureUniformName?: string;
}) => SimulationRuntime;

type CreateGlbParticleSimulationRuntimeOptions = {
  createSimulationRunner: CreateSimulationRunner;
  params: GlbParticlesParams;
  size: number;
  textures: ParticleDataTextures;
};

export type GlbParticleSimulationRuntime = {
  dispose(): void;
  positionMaterial: THREE.ShaderMaterial;
  positionSimulation: SimulationRuntime;
  step(options: { deltaTime: number; renderer: THREE.WebGLRenderer }): THREE.Texture;
  velocityMaterial: THREE.ShaderMaterial;
  velocitySimulation: SimulationRuntime;
};

export function createGlbParticleSimulationRuntime({
  createSimulationRunner,
  params,
  size,
  textures
}: CreateGlbParticleSimulationRuntimeOptions): GlbParticleSimulationRuntime {
  let simulationHasState = false;
  const velocityMaterial = createVelocityMaterial(params, textures);
  const velocitySimulation = createSimulationRunner({
    material: velocityMaterial,
    size,
    textureUniformName: "uVelocityTexture"
  });
  const positionMaterial = createPositionMaterial(textures);
  const positionSimulation = createSimulationRunner({
    material: positionMaterial,
    size
  });

  return {
    dispose: () => {
      positionSimulation.dispose();
      velocitySimulation.dispose();
      positionMaterial.dispose();
      velocityMaterial.dispose();
    },
    positionMaterial,
    positionSimulation,
    step: ({ deltaTime, renderer }) => {
      velocityMaterial.uniforms.uCurrentPositionTexture.value =
        positionSimulation.texture ?? textures.positionTexture;
      velocityMaterial.uniforms.uDeltaTime.value = deltaTime;
      velocityMaterial.uniforms.uHasState.value = simulationHasState ? 1 : 0;
      velocitySimulation.step(renderer);

      positionMaterial.uniforms.uHasState.value = simulationHasState ? 1 : 0;
      positionMaterial.uniforms.uVelocityTexture.value =
        velocitySimulation.texture ?? textures.velocityTexture;
      positionSimulation.step(renderer);
      simulationHasState = true;

      return positionSimulation.texture ?? textures.positionTexture;
    },
    velocityMaterial,
    velocitySimulation
  };
}
