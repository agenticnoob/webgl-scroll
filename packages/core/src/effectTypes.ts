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
  lifecycle?: WebGLEffectLifecycleSnapshot;
  /** Raw lifecycle overrides declared on the trigger or effect. */
  lifecycleConfigInput?: WebGLEffectLifecycleInput;
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
 * Context passed to an effect definition's `create()`. Provides access to the Three.js
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
 * Per-frame rendering context passed to effect instances.
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
// Function effect definitions
// ---------------------------------------------------------------------------

/**
 * Runtime object returned by a function effect definition.
 *
 * Lifecycle:
 *   1. definition `create(ctx)` allocates meshes, shaders, textures, and adds to scene.
 *   2. instance `update(snapshot, ctx)` runs every frame while the trigger exists.
 *   3. instance `dispose()` releases geometry, material, and texture resources.
 *
 * Optional hooks:
 *   - `resize(viewport)` rebuilds when the viewport changes.
 *   - `enter(snapshot)` runs when the trigger element enters the viewport.
 *   - `leave(snapshot)` runs when the trigger element leaves the viewport.
 *   - `preload(snapshot, context)` loads resources before active entry.
 *   - `suspend(snapshot)` releases heavy state while preserving fast-return state.
 */
export type WebGLEffectInstance = {
  update(snapshot: TriggerSnapshot, context: RenderContext): void;
  dispose(): void;
  enter?(snapshot: TriggerSnapshot): void;
  leave?(snapshot: TriggerSnapshot): void;
  preload?(snapshot: TriggerSnapshot, context: RenderContext): void | Promise<void>;
  resize?(viewport: { height: number; width: number }): void;
  suspend?(snapshot: TriggerSnapshot): void;
};

export type WebGLEffectDefinition = {
  type: string;
  schema?: Record<string, ParamDef>;
  create(context: EffectContext): WebGLEffectInstance;
};

export function defineWebGLEffect(definition: WebGLEffectDefinition): WebGLEffectDefinition {
  return definition;
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
    lifecycleConfigInput: snapshot.lifecycle,
    params,
    progress: snapshot.progress,
    scene: snapshot.scene,
    start: snapshot.start,
    velocity: 0
  };
}
