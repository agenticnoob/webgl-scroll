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
import { applyObjectTransform } from "../transform/applyObjectTransform";
import { createRenderMaterial } from "./materials";
import { createParticleDataTextures, type ParticleDataTextures } from "./particleTextures";
import { calculatePointerActivity, mapPointerToParticleSpace } from "./pointerMapping";
import { createParticleGeometry } from "./particleGeometry";
import {
  createGlbParticleSimulationRuntime,
  type CreateSimulationRunner,
  type GlbParticleSimulationRuntime
} from "./simulationRuntime";
import { loadGLBParticleOrigins, parseGLBParticleOrigins } from "./surfaceSampler";
import { normalizeGlbParticlesParams, type GlbParticlesParams } from "./types";

type GlbParticlesRuntime = {
  createSimulationRunner: CreateSimulationRunner;
  loadOrigins(src: string, size: number): Promise<Float32Array>;
  parseOrigins(buffer: ArrayBuffer, size: number): Promise<Float32Array>;
};

const defaultRuntime: GlbParticlesRuntime = {
  createSimulationRunner: ({ material, size, textureUniformName }) =>
    new GpuSimulationRunner({ material, size, textureUniformName }),
  loadOrigins: loadGLBParticleOrigins,
  parseOrigins: parseGLBParticleOrigins
};

let runtime: GlbParticlesRuntime = defaultRuntime;

export class GlbParticlesEffect extends WebGLEffect {
  readonly type = "glb-particles";

  private disposed = false;
  private group = new THREE.Group();
  private params: GlbParticlesParams = normalizeGlbParticlesParams({});
  private points?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private pointerActivity = 0;
  private preloadPromise?: Promise<void>;
  private renderMaterial?: THREE.ShaderMaterial;
  private resolver?: EffectContext["assetResolver"];
  private simulationRuntime?: GlbParticleSimulationRuntime;
  private textures?: ParticleDataTextures;

  create(context: EffectContext): void {
    this.params = normalizeGlbParticlesParams(context.params);
    this.resolver = context.assetResolver;
    this.group.visible = false;
    context.scene.add(this.group);
  }

  onPreload(_snapshot: TriggerSnapshot, _context: RenderContext): Promise<void> {
    if (!this.params.src) {
      return Promise.resolve();
    }

    if (this.points || this.preloadPromise) {
      return this.preloadPromise ?? Promise.resolve();
    }

    this.preloadPromise = this.loadOrigins()
      .then((origins) => {
        if (this.disposed) {
          return;
        }

        this.createParticles(origins);
      })
      .catch((error: unknown) => {
        this.preloadPromise = undefined;
        throw error;
      });

    return this.preloadPromise;
  }

  onEnter(snapshot: TriggerSnapshot): void {
    void this.onPreload(snapshot, createFallbackRenderContext()).catch(() => undefined);
  }

  onSuspend(_snapshot: TriggerSnapshot): void {
    this.group.visible = false;
  }

  update(snapshot: TriggerSnapshot, context: RenderContext): void {
    if (snapshot.isActive && !this.points) {
      void this.onPreload(snapshot, context).catch(() => undefined);
    }

    if (
      !this.points ||
      !this.textures ||
      !this.renderMaterial ||
      !this.simulationRuntime
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
    applyObjectTransform(this.group, {
      baseScale,
      time: context.time,
      transform: this.params.transform
    });
    this.group.visible = snapshot.isActive;

    this.pointerActivity = calculatePointerActivity({
      deltaTime: context.deltaTime,
      isActive: snapshot.isActive,
      pointer: sharedStateTree.pointer,
      previousActivity: this.pointerActivity,
      reducedMotion: sharedStateTree.reducedMotion
    });

    if (this.pointerActivity === 0 && (!snapshot.isActive || sharedStateTree.reducedMotion)) {
      return;
    }

    const pointerPosition = mapPointerToParticleSpace({
      baseScale,
      boundsCenter: bounds.center,
      pointer: sharedStateTree.pointer
    });
    const simulationPointer = this.simulationRuntime.velocityMaterial.uniforms.uPointer.value as THREE.Vector3;
    simulationPointer.set(pointerPosition.x, pointerPosition.y, pointerPosition.z);
    this.simulationRuntime.velocityMaterial.uniforms.uPointerRadius.value = this.params.pointerRadius;
    this.simulationRuntime.velocityMaterial.uniforms.uPointerStrength.value = this.pointerActivity;
    const renderPointer = this.renderMaterial.uniforms.uPointer.value as THREE.Vector3;
    renderPointer.set(pointerPosition.x, pointerPosition.y, pointerPosition.z);
    this.renderMaterial.uniforms.uPointerRadius.value = this.params.pointerRadius;
    this.renderMaterial.uniforms.uPointerStrength.value = this.pointerActivity;

    this.renderMaterial.uniforms.uPositionTexture.value = this.simulationRuntime.step({
      deltaTime: context.deltaTime,
      renderer: context.renderer
    });
    this.renderMaterial.uniforms.uUseSimulationTexture.value = 1;
  }

  dispose(): void {
    this.disposed = true;
    this.group.removeFromParent();
    this.points?.geometry.dispose();
    this.renderMaterial?.dispose();
    this.simulationRuntime?.dispose();
    this.textures?.originTexture.dispose();
    this.textures?.positionTexture.dispose();
    this.textures?.velocityTexture.dispose();
  }

  private async loadOrigins(): Promise<Float32Array> {
    const resolved = await this.resolver?.resolve({
      effect: "glb-particles",
      kind: "glb",
      src: this.params.src
    });

    if (resolved?.kind === "arrayBuffer") {
      return runtime.parseOrigins(resolved.value, this.params.particleTextureSize);
    }

    if (resolved?.kind === "blob") {
      return runtime.parseOrigins(await resolved.value.arrayBuffer(), this.params.particleTextureSize);
    }

    return runtime.loadOrigins(this.params.src, this.params.particleTextureSize);
  }

  private createParticles(origins: Float32Array): void {
    if (this.points) {
      return;
    }

    const size = this.params.particleTextureSize;
    this.textures = createParticleDataTextures({ origins, size });
    this.simulationRuntime = createGlbParticleSimulationRuntime({
      createSimulationRunner: runtime.createSimulationRunner,
      params: this.params,
      size,
      textures: this.textures
    });
    this.renderMaterial = createRenderMaterial(this.params, this.textures);
    this.points = new THREE.Points(createParticleGeometry(size), this.renderMaterial);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }
}

function createFallbackRenderContext(): RenderContext {
  return {
    camera: new THREE.OrthographicCamera(),
    deltaTime: 0,
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    time: 0,
    viewport: { height: 0, width: 0 }
  };
}

export function setGlbParticlesRuntimeForTests(nextRuntime: Partial<GlbParticlesRuntime>): void {
  runtime = { ...defaultRuntime, ...nextRuntime };
}

export function resetGlbParticlesRuntimeForTests(): void {
  runtime = defaultRuntime;
}
