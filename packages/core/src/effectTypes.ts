import type * as THREE from "three";

import type { WebGLAssetResolver } from "./assets";
import type {
  WebGLEffectLifecycleConfig,
  WebGLEffectLifecycleInput,
  WebGLEffectLifecycleSnapshot
} from "./lifecycle";

export type WebGLScrollTriggerRole = "cut" | "title";

export type WebGLScrollTriggerSnapshot = {
  cutIndex?: number;
  effect?: string;
  end: string;
  id: string;
  isActive: boolean;
  lifecycle?: WebGLEffectLifecycleInput;
  progress: number;
  role?: WebGLScrollTriggerRole;
  scene: string;
  start: string;
  trigger: string;
};

// ---------------------------------------------------------------------------
// Trigger metadata extracted from DOM
// ---------------------------------------------------------------------------

/**
 * Structured metadata extracted from a single `[data-webgl-trigger]` element.
 * Produced by the DOM scanning layer and consumed by the GSAP bridge and
 * Effect router.
 */
export type TriggerMetadata = {
  /** Legacy cut index, present when the trigger maps to a section cut. */
  cutIndex?: number;
  /** Effect type name matching a registered WebGLEffect (e.g. "fade-title"). */
  effect: string;
  /** Reference to the source DOM element. */
  element: HTMLElement;
  /** ScrollTrigger end expression (e.g. "bottom top"). */
  end: string;
  /** Unique identifier: `${scene}:${trigger}:${index}` */
  id: string;
  /** Raw lifecycle overrides declared on the trigger or effect. */
  lifecycle?: WebGLEffectLifecycleInput;
  /** Merged effect parameters from `data-webgl-params` and `data-webgl-effect-*`. */
  params: Record<string, unknown>;
  /** Scene grouping key (e.g. "build"). */
  scene: string;
  /** ScrollTrigger start expression (e.g. "top bottom"). */
  start: string;
};

// ---------------------------------------------------------------------------
// Per-frame trigger snapshot
// ---------------------------------------------------------------------------

/**
 * Runtime snapshot for a single trigger, combining static metadata with
 * per-frame timing data written by the GSAP bridge.
 */
export type TriggerSnapshot = Omit<TriggerMetadata, "lifecycle"> & {
  /** Normalized scroll progress in [0, 1]. */
  progress: number;
  /** Whether the trigger element is currently within the viewport. */
  isActive: boolean;
  /** Runtime lifecycle phase snapshot. */
  lifecycle?: WebGLEffectLifecycleInput | WebGLEffectLifecycleSnapshot;
  /** Normalized lifecycle configuration used to compute lifecycle phase. */
  lifecycleConfig?: WebGLEffectLifecycleConfig;
  /** Scroll velocity in px/s (positive = scrolling down). */
  velocity: number;
  /** Scroll direction: 1 (down), -1 (up), or 0 (idle). */
  direction: 1 | -1 | 0;
};

// ---------------------------------------------------------------------------
// Effect lifecycle context
// ---------------------------------------------------------------------------

/**
 * Context passed to `WebGLEffect.create()`. Provides access to the Three.js
 * scene, renderer, and the trigger's own metadata and parameters.
 */
export type EffectContext = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  /** Optional host-managed asset resolver. */
  assetResolver?: WebGLAssetResolver;
  /** The trigger's merged parameters. */
  params: Record<string, unknown>;
  /** The DOM element that declared this effect. */
  element: HTMLElement;
};

// ---------------------------------------------------------------------------
// Render context available each frame
// ---------------------------------------------------------------------------

/**
 * Per-frame rendering context passed to `WebGLEffect.update()`.
 */
export type RenderContext = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  viewport: { width: number; height: number };
  deltaTime: number;
  time: number;
};

// ---------------------------------------------------------------------------
// Parameter definition for schema validation
// ---------------------------------------------------------------------------

export type ParamDef = {
  type: "boolean" | "number" | "string";
  default?: unknown;
  max?: number;
  min?: number;
};

// ---------------------------------------------------------------------------
// Abstract Effect base class
// ---------------------------------------------------------------------------

/**
 * Base class for all WebGL visual effects.
 *
 * Lifecycle:
 *   1. `create(ctx)` — allocate meshes, shaders, textures; add to scene.
 *   2. `update(snapshot, ctx)` — called every frame while the trigger exists.
 *   3. `dispose()` — release geometry, material, and texture resources.
 *
 * Optional hooks:
 *   - `onResize(viewport)` — rebuild when the viewport changes.
 *   - `onEnter(snapshot)` — trigger element enters the viewport.
 *   - `onLeave(snapshot)` — trigger element leaves the viewport.
 */
export abstract class WebGLEffect {
  /** Effect type name, must match the registered `data-webgl-effect` value. */
  abstract readonly type: string;

  /** Allocate GPU resources and add meshes to the scene. */
  abstract create(context: EffectContext): void;

  /** Per-frame update. Read snapshot timing, write uniforms / transforms. */
  abstract update(snapshot: TriggerSnapshot, context: RenderContext): void;

  /** Release all GPU resources (geometry, material, texture). */
  abstract dispose(): void;

  /** Optional: rebuild on viewport resize. */
  onResize?(viewport: { height: number; width: number }): void;

  /** Optional: trigger element enters viewport. */
  onEnter?(snapshot: TriggerSnapshot): void;

  /** Optional: trigger element leaves viewport. */
  onLeave?(snapshot: TriggerSnapshot): void;

  /** Optional: preload resources before the trigger becomes active. */
  onPreload?(snapshot: TriggerSnapshot, context: RenderContext): void | Promise<void>;

  /** Optional: suspend resources while keeping fast-return state available. */
  onSuspend?(snapshot: TriggerSnapshot): void;
}

// ---------------------------------------------------------------------------
// Backward-compatibility helpers
// ---------------------------------------------------------------------------

/**
 * Map a legacy `data-webgl-role` value to the corresponding `effect` type.
 * Used during the transition period while both conventions coexist.
 */
export function roleToEffect(role: string | undefined): string | undefined {
  switch (role) {
    case "cut":
      return "pixelated-wipe";
    case "title":
      return "fade-title";
    default:
      return undefined;
  }
}

/**
 * Convert a `WebGLScrollTriggerSnapshot` (current shape) into the new
 * `TriggerSnapshot` interface. This allows existing trigger state to be
 * consumed by the Effect router without rewriting the bridge layer.
 */
export function snapshotToTrigger(
  snapshot: WebGLScrollTriggerSnapshot,
  element: HTMLElement,
  params: Record<string, unknown> = {}
): TriggerSnapshot {
  const effect = snapshot.effect ?? roleToEffect(snapshot.role) ?? "unknown";

  return {
    cutIndex: snapshot.cutIndex,
    direction: 0,
    effect,
    element,
    end: snapshot.end,
    id: snapshot.id,
    isActive: snapshot.isActive,
    lifecycle: snapshot.lifecycle,
    params,
    progress: snapshot.progress,
    scene: snapshot.scene,
    start: snapshot.start,
    velocity: 0
  };
}
