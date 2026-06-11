import {
  GpuSimulationRunner,
  sharedStateTree,
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot,
  WebGLEffect
} from "@webgl-scroll/core";
import * as THREE from "three";

import { mapElementRectToWorld } from "../assets/rectMapping";
import { createParticleDataTextures, type ParticleDataTextures } from "./particleTextures";
import {
  glbParticlesPositionFragmentShader,
  glbParticlesRenderFragmentShader,
  glbParticlesRenderVertexShader,
  glbParticlesSimulationVertexShader,
  glbParticlesVelocityFragmentShader
} from "./shaders";
import { loadGLBParticleOrigins } from "./surfaceSampler";
import { normalizeGlbParticlesParams, type GlbParticlesParams } from "./types";

type SimulationRuntime = {
  dispose(): void;
  step(renderer: THREE.WebGLRenderer): void;
  texture: THREE.Texture;
};

type GlbParticlesRuntime = {
  createSimulationRunner(options: {
    material: THREE.ShaderMaterial;
    size: number;
    textureUniformName?: string;
  }): SimulationRuntime;
  loadOrigins(src: string, size: number): Promise<Float32Array>;
};

const defaultRuntime: GlbParticlesRuntime = {
  createSimulationRunner: ({ material, size, textureUniformName }) =>
    new GpuSimulationRunner({ material, size, textureUniformName }),
  loadOrigins: loadGLBParticleOrigins
};

let runtime: GlbParticlesRuntime = defaultRuntime;

export class GlbParticlesEffect extends WebGLEffect {
  readonly type = "glb-particles";

  private disposed = false;
  private group = new THREE.Group();
  private params: GlbParticlesParams = normalizeGlbParticlesParams({});
  private positionSimulation?: SimulationRuntime;
  private positionSimulationMaterial?: THREE.ShaderMaterial;
  private points?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private pointerActivity = 0;
  private renderMaterial?: THREE.ShaderMaterial;
  private simulationHasState = false;
  private textures?: ParticleDataTextures;
  private velocitySimulation?: SimulationRuntime;
  private velocitySimulationMaterial?: THREE.ShaderMaterial;

  create(context: EffectContext): void {
    this.params = normalizeGlbParticlesParams(context.params);
    this.group.visible = false;
    context.scene.add(this.group);

    if (!this.params.src) {
      return;
    }

    void runtime.loadOrigins(this.params.src, this.params.particleTextureSize).then((origins) => {
      if (this.disposed) {
        return;
      }

      this.createParticles(origins);
    });
  }

  update(snapshot: TriggerSnapshot, context: RenderContext): void {
    if (
      !this.points ||
      !this.textures ||
      !this.renderMaterial ||
      !this.positionSimulationMaterial ||
      !this.velocitySimulationMaterial
    ) {
      return;
    }

    const rect = snapshot.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.group.visible = false;
      return;
    }

    const bounds = mapElementRectToWorld({
      placement: this.params.placement,
      rect,
      viewport: context.viewport
    });
    const baseScale = Math.min(bounds.size.width, bounds.size.height);

    this.group.position.set(bounds.center.x, bounds.center.y, 0);
    this.group.scale.setScalar(baseScale);
    this.group.visible = snapshot.isActive;

    if (!snapshot.isActive || sharedStateTree.reducedMotion) {
      this.pointerActivity = 0;
      return;
    }

    const pointer = sharedStateTree.pointer;
    const idleHoverStrength = pointer.isInside ? Math.max(1 - pointer.idleMs / 600, 0) : 0;
    this.pointerActivity = pointer.isInside && pointer.isMoving
      ? 1
      : Math.max(idleHoverStrength, this.pointerActivity - context.deltaTime * 1.15, 0);
    this.velocitySimulationMaterial.uniforms.uCurrentPositionTexture.value =
      this.positionSimulation?.texture ?? this.textures.positionTexture;
    this.velocitySimulationMaterial.uniforms.uDeltaTime.value = context.deltaTime;
    this.velocitySimulationMaterial.uniforms.uHasState.value = this.simulationHasState ? 1 : 0;
    const pointerPosition = this.velocitySimulationMaterial.uniforms.uPointer.value as THREE.Vector3;
    pointerPosition.set(
      (pointer.ndcX - bounds.center.x) / Math.max(baseScale, 0.001),
      (pointer.ndcY - bounds.center.y) / Math.max(baseScale, 0.001),
      0
    );
    this.velocitySimulationMaterial.uniforms.uPointerRadius.value = this.params.pointerRadius;
    this.velocitySimulationMaterial.uniforms.uPointerStrength.value = this.pointerActivity;
    this.renderMaterial.uniforms.uPointer.value.copy(pointerPosition);
    this.renderMaterial.uniforms.uPointerRadius.value = this.params.pointerRadius;
    this.renderMaterial.uniforms.uPointerStrength.value = this.pointerActivity;

    this.velocitySimulation?.step(context.renderer);
    this.positionSimulationMaterial.uniforms.uHasState.value = this.simulationHasState ? 1 : 0;
    this.positionSimulationMaterial.uniforms.uVelocityTexture.value =
      this.velocitySimulation?.texture ?? this.textures.velocityTexture;
    this.positionSimulation?.step(context.renderer);
    this.simulationHasState = true;

    this.renderMaterial.uniforms.uPositionTexture.value =
      this.positionSimulation?.texture ?? this.textures.positionTexture;
    this.renderMaterial.uniforms.uUseSimulationTexture.value = 1;
  }

  dispose(): void {
    this.disposed = true;
    this.group.removeFromParent();
    this.points?.geometry.dispose();
    this.renderMaterial?.dispose();
    this.positionSimulationMaterial?.dispose();
    this.velocitySimulationMaterial?.dispose();
    this.positionSimulation?.dispose();
    this.velocitySimulation?.dispose();
    this.textures?.originTexture.dispose();
    this.textures?.positionTexture.dispose();
    this.textures?.velocityTexture.dispose();
  }

  private createParticles(origins: Float32Array): void {
    const size = this.params.particleTextureSize;
    this.textures = createParticleDataTextures({ origins, size });
    this.velocitySimulationMaterial = createVelocityMaterial(this.params, this.textures);
    this.velocitySimulation = runtime.createSimulationRunner({
      material: this.velocitySimulationMaterial,
      size,
      textureUniformName: "uVelocityTexture"
    });
    this.positionSimulationMaterial = createPositionMaterial(this.textures);
    this.positionSimulation = runtime.createSimulationRunner({
      material: this.positionSimulationMaterial,
      size
    });
    this.renderMaterial = createRenderMaterial(this.params, this.textures);
    this.points = new THREE.Points(createParticleGeometry(size), this.renderMaterial);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }
}

export function setGlbParticlesRuntimeForTests(nextRuntime: Partial<GlbParticlesRuntime>): void {
  runtime = { ...defaultRuntime, ...nextRuntime };
}

export function resetGlbParticlesRuntimeForTests(): void {
  runtime = defaultRuntime;
}

function createVelocityMaterial(
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

function createPositionMaterial(textures: ParticleDataTextures): THREE.ShaderMaterial {
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

function createRenderMaterial(
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

function createParticleGeometry(size: number): THREE.BufferGeometry {
  const particleCount = size * size;
  const positions = new Float32Array(particleCount * 3);
  const particleUvs = new Float32Array(particleCount * 2);

  for (let index = 0; index < particleCount; index++) {
    const x = index % size;
    const y = Math.floor(index / size);
    particleUvs[index * 2] = (x + 0.5) / size;
    particleUvs[index * 2 + 1] = (y + 0.5) / size;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aParticleUv", new THREE.BufferAttribute(particleUvs, 2));

  return geometry;
}
