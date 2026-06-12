import * as THREE from "three";

import type { ParticleDataTextures } from "./particleTextures";
import {
  glbParticlesPositionFragmentShader,
  glbParticlesRenderFragmentShader,
  glbParticlesRenderVertexShader,
  glbParticlesSimulationVertexShader,
  glbParticlesVelocityFragmentShader
} from "./shaders";
import type { GlbParticlesParams } from "./types";

export function createVelocityMaterial(
  params: GlbParticlesParams,
  textures: ParticleDataTextures
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: glbParticlesVelocityFragmentShader,
    uniforms: {
      uCurrentPositionTexture: { value: textures.positionTexture },
      uDamping: { value: params.damping },
      uDeltaTime: { value: 0 },
      uHasState: { value: 0 },
      uOriginTexture: { value: textures.originTexture },
      uPointer: { value: new THREE.Vector3() },
      uPointerRadius: { value: params.pointerRadius },
      uPointerStrength: { value: 0 },
      uReturnForce: { value: params.returnForce },
      uScatterForce: { value: params.scatterForce },
      uVelocityTexture: { value: textures.velocityTexture }
    },
    vertexShader: glbParticlesSimulationVertexShader
  });
}

export function createPositionMaterial(textures: ParticleDataTextures): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: glbParticlesPositionFragmentShader,
    uniforms: {
      uHasState: { value: 0 },
      uOriginTexture: { value: textures.originTexture },
      uPositionTexture: { value: textures.positionTexture },
      uVelocityTexture: { value: textures.velocityTexture }
    },
    vertexShader: glbParticlesSimulationVertexShader
  });
}

export function createRenderMaterial(
  params: GlbParticlesParams,
  textures: ParticleDataTextures
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: glbParticlesRenderFragmentShader,
    transparent: true,
    uniforms: {
      uColor: { value: new THREE.Color(params.color) },
      uOriginTexture: { value: textures.originTexture },
      uPointSize: { value: params.pointSize },
      uPointer: { value: new THREE.Vector3() },
      uPointerRadius: { value: params.pointerRadius },
      uPointerStrength: { value: 0 },
      uPositionTexture: { value: textures.positionTexture },
      uRenderScatter: { value: Math.min(params.scatterForce * 0.08, 0.32) },
      uUseSimulationTexture: { value: 0 }
    },
    vertexShader: glbParticlesRenderVertexShader
  });
}
