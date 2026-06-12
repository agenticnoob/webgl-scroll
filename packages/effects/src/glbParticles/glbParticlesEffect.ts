import {
  defineWebGLEffect,
  GpuSimulationRunner,
  sharedStateTree,
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot
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

export const glbParticlesEffect = defineWebGLEffect({
  type: "glb-particles",
  create(context: EffectContext) {
    let disposed = false;
    const group = new THREE.Group();
    const params: GlbParticlesParams = normalizeGlbParticlesParams(context.params);
    let points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined;
    let pointerActivity = 0;
    let preloadPromise: Promise<void> | undefined;
    let renderMaterial: THREE.ShaderMaterial | undefined;
    const resolver = context.assetResolver;
    let simulationRuntime: GlbParticleSimulationRuntime | undefined;
    let textures: ParticleDataTextures | undefined;

    group.visible = false;
    context.scene.add(group);

    const loadOrigins = async (): Promise<Float32Array> => {
      const resolved = await resolver?.resolve({
        effect: "glb-particles",
        kind: "glb",
        src: params.src
      });

      if (resolved?.kind === "arrayBuffer") {
        return runtime.parseOrigins(resolved.value, params.particleTextureSize);
      }

      if (resolved?.kind === "blob") {
        return runtime.parseOrigins(await resolved.value.arrayBuffer(), params.particleTextureSize);
      }

      return runtime.loadOrigins(params.src, params.particleTextureSize);
    };

    const createParticles = (origins: Float32Array): void => {
      if (points) {
        return;
      }

      const size = params.particleTextureSize;
      textures = createParticleDataTextures({ origins, size });
      simulationRuntime = createGlbParticleSimulationRuntime({
        createSimulationRunner: runtime.createSimulationRunner,
        params,
        size,
        textures
      });
      renderMaterial = createRenderMaterial(params, textures);
      points = new THREE.Points(createParticleGeometry(size), renderMaterial);
      points.frustumCulled = false;
      group.add(points);
    };

    const preload = (_snapshot: TriggerSnapshot, _context: RenderContext): Promise<void> => {
      if (!params.src) {
        return Promise.resolve();
      }

      if (points || preloadPromise) {
        return preloadPromise ?? Promise.resolve();
      }

      preloadPromise = loadOrigins()
        .then((origins) => {
          if (disposed) {
            return;
          }

          createParticles(origins);
        })
        .catch((error: unknown) => {
          preloadPromise = undefined;
          throw error;
        });

      return preloadPromise;
    };

    return {
      preload,

      enter(snapshot: TriggerSnapshot): void {
        void preload(snapshot, createFallbackRenderContext()).catch(() => undefined);
      },

      suspend(_snapshot: TriggerSnapshot): void {
        group.visible = false;
      },

      update(snapshot: TriggerSnapshot, renderContext: RenderContext): void {
        if (snapshot.isActive && !points) {
          void preload(snapshot, renderContext).catch(() => undefined);
        }

        if (!points || !textures || !renderMaterial || !simulationRuntime) {
          return;
        }

        const rect = snapshot.element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          group.visible = false;
          return;
        }

        const bounds = mapElementRectToWorld({
          placement: params.placement,
          rect,
          viewport: renderContext.viewport
        });
        const baseScale = Math.min(bounds.size.width, bounds.size.height);

        group.position.set(bounds.center.x, bounds.center.y, 0);
        applyObjectTransform(group, {
          baseScale,
          time: renderContext.time,
          transform: params.transform
        });
        group.visible = snapshot.isActive;

        pointerActivity = calculatePointerActivity({
          deltaTime: renderContext.deltaTime,
          isActive: snapshot.isActive,
          pointer: sharedStateTree.pointer,
          previousActivity: pointerActivity,
          reducedMotion: sharedStateTree.reducedMotion
        });

        if (pointerActivity === 0 && (!snapshot.isActive || sharedStateTree.reducedMotion)) {
          return;
        }

        const pointerPosition = mapPointerToParticleSpace({
          baseScale,
          boundsCenter: bounds.center,
          pointer: sharedStateTree.pointer
        });
        const simulationPointer = simulationRuntime.velocityMaterial.uniforms.uPointer.value as THREE.Vector3;
        simulationPointer.set(pointerPosition.x, pointerPosition.y, pointerPosition.z);
        simulationRuntime.velocityMaterial.uniforms.uPointerRadius.value = params.pointerRadius;
        simulationRuntime.velocityMaterial.uniforms.uPointerStrength.value = pointerActivity;
        const renderPointer = renderMaterial.uniforms.uPointer.value as THREE.Vector3;
        renderPointer.set(pointerPosition.x, pointerPosition.y, pointerPosition.z);
        renderMaterial.uniforms.uPointerRadius.value = params.pointerRadius;
        renderMaterial.uniforms.uPointerStrength.value = pointerActivity;

        renderMaterial.uniforms.uPositionTexture.value = simulationRuntime.step({
          deltaTime: renderContext.deltaTime,
          renderer: renderContext.renderer
        });
        renderMaterial.uniforms.uUseSimulationTexture.value = 1;
      },

      dispose(): void {
        disposed = true;
        group.removeFromParent();
        points?.geometry.dispose();
        renderMaterial?.dispose();
        simulationRuntime?.dispose();
        textures?.originTexture.dispose();
        textures?.positionTexture.dispose();
        textures?.velocityTexture.dispose();
      }
    };
  }
});

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
