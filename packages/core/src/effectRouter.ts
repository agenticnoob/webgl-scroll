import { applyDefaults, resolveEffect, validateParams } from "./effectRegistry";
import type { WebGLAssetResolver } from "./assets";
import type { EffectContext, RenderContext, TriggerSnapshot, WebGLEffectInstance } from "./effectTypes";
import {
  computeElementViewportDistance,
  isWithinLifecycleMargin,
  normalizeLifecycleConfig,
  type LifecyclePhase,
  type PreloadStatus,
  type WebGLEffectLifecycleConfig,
  type WebGLEffectLifecycleInput,
  type WebGLEffectLifecycleSnapshot
} from "./lifecycle";

type EffectRouterEntry = {
  effect: WebGLEffectInstance;
  idleSince?: number;
  phase: LifecyclePhase;
  preloadErrorMessage?: string;
  preloadPromise?: Promise<void>;
  preloadStatus: PreloadStatus;
  wasActive: boolean;
};

export type EffectRouterOptions = {
  assetResolver?: WebGLAssetResolver;
  getNow?: () => number;
  lifecycle?: WebGLEffectLifecycleInput;
};

// ---------------------------------------------------------------------------
// EffectRouter
// ---------------------------------------------------------------------------

/**
 * Manages the lifecycle of WebGLEffect instances.
 *
 * Each frame, call `routeAll()` with the current set of trigger snapshots
 * and the render context. The router will:
 *   - Create new effect instances for triggers that appeared.
 *   - Update existing instances for triggers that persist.
 *   - Fire `onEnter` / `onLeave` hooks on activity transitions.
 *   - Dispose instances for triggers that disappeared.
 */
export class EffectRouter {
  private instances = new Map<string, EffectRouterEntry>();
  private activePreloads = 0;
  private readonly assetResolver?: WebGLAssetResolver;
  private readonly getNow: () => number;
  private readonly lifecycle: WebGLEffectLifecycleInput;

  constructor(options: EffectRouterOptions = {}) {
    this.assetResolver = options.assetResolver;
    this.getNow = options.getNow ?? (() => performance.now());
    this.lifecycle = options.lifecycle ?? {};
  }

  /**
   * Route all current trigger snapshots through their matching effects.
   * Call once per frame before `renderer.render()`.
   */
  routeAll(
    snapshots: TriggerSnapshot[],
    renderContext: RenderContext
  ): void {
    const seen = new Set<string>();

    for (const snapshot of snapshots) {
      seen.add(snapshot.id);

      let entry = this.instances.get(snapshot.id);
      const { config, lifecycle } = this.buildLifecycleSnapshot(snapshot, renderContext, entry);
      const nextSnapshot: TriggerSnapshot = {
        ...snapshot,
        lifecycle,
        lifecycleConfig: config
      };

      if (!entry && lifecycle.phase === "idle") {
        continue;
      }

      if (entry && lifecycle.phase === "disposed") {
        entry.effect.dispose();
        this.instances.delete(snapshot.id);
        continue;
      }

      if (!entry) {
        entry = this.createInstance(nextSnapshot, renderContext);

        if (!entry) {
          continue;
        }

        this.instances.set(snapshot.id, entry);
      }

      if (lifecycle.phase !== "active" && entry.idleSince == null) {
        entry.idleSince = this.getNow();
      }

      if (lifecycle.phase === "active") {
        entry.idleSince = undefined;
      }

      this.dispatchLifecycle(entry, nextSnapshot, renderContext);
      entry.wasActive = snapshot.isActive;
      entry.phase = nextSnapshot.lifecycle?.phase ?? entry.phase;
      entry.effect.update(nextSnapshot, renderContext);
    }

    // Dispose effects whose triggers no longer exist.
    for (const [id, entry] of this.instances) {
      if (!seen.has(id)) {
        entry.effect.dispose();
        this.instances.delete(id);
      }
    }
  }

  /**
   * Handle viewport resize. Forwards to all active effects that implement
   * the optional `onResize` hook.
   */
  resize(viewport: { height: number; width: number }): void {
    for (const { effect } of this.instances.values()) {
      effect.resize?.(viewport);
    }
  }

  /**
   * Dispose all active effect instances and clear the internal map.
   * Call during engine teardown.
   */
  disposeAll(): void {
    for (const { effect } of this.instances.values()) {
      effect.dispose();
    }

    this.instances.clear();
  }

  /**
   * Return the number of currently active effect instances.
   */
  get size(): number {
    return this.instances.size;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private createInstance(
    snapshot: TriggerSnapshot,
    renderContext: RenderContext
  ): EffectRouterEntry | undefined {
    const registration = resolveEffect(snapshot.effect);

    if (!registration) {
      // Unknown effect type — skip silently so unregistered triggers
      // do not crash the render loop.
      return undefined;
    }

    const params = validateParams(
      snapshot.effect,
      applyDefaults(snapshot.effect, snapshot.params)
    );

    const context: EffectContext = {
      assetResolver: this.assetResolver,
      element: snapshot.element,
      params,
      renderer: renderContext.renderer,
      scene: renderContext.scene
    };

    const effect = registration.create(context);

    return { effect, phase: "idle", preloadStatus: "idle", wasActive: false };
  }

  private buildLifecycleSnapshot(
    snapshot: TriggerSnapshot,
    renderContext: RenderContext,
    entry: EffectRouterEntry | undefined
  ): { config: WebGLEffectLifecycleConfig; lifecycle: WebGLEffectLifecycleSnapshot } {
    const config = normalizeLifecycleConfig(
      this.lifecycle,
      snapshot.lifecycleConfigInput,
      readEffectLifecycle(snapshot.params)
    );
    const rect = snapshot.element.getBoundingClientRect();
    const distancePx = computeElementViewportDistance(rect, renderContext.viewport);
    const isWithinPreload = isWithinLifecycleMargin(distancePx, config.preloadMargin, renderContext.viewport);
    const isWithinSuspend = isWithinLifecycleMargin(distancePx, config.suspendMargin, renderContext.viewport);
    const isWithinUnload = isWithinLifecycleMargin(distancePx, config.unloadMargin, renderContext.viewport);
    const now = this.getNow();
    const idleMs = entry?.idleSince == null ? 0 : Math.max(now - entry.idleSince, 0);
    const phase = choosePhase({
      entryPhase: entry?.phase,
      idleMs,
      isActive: snapshot.isActive,
      isWithinPreload,
      isWithinSuspend,
      isWithinUnload,
      minIdleMs: config.minIdleMs,
      preloadStatus: entry?.preloadStatus ?? "idle"
    });

    return {
      config,
      lifecycle: {
        distancePx,
        idleMs,
        isWithinPreload,
        isWithinSuspend,
        isWithinUnload,
        phase,
        preloadStatus: entry?.preloadStatus ?? "idle",
        ...(entry?.preloadErrorMessage
          ? {
              preloadErrorMessage: entry.preloadErrorMessage,
              preloadFailed: true
            }
          : { preloadFailed: false })
      }
    };
  }

  private dispatchLifecycle(
    entry: EffectRouterEntry,
    snapshot: TriggerSnapshot,
    renderContext: RenderContext
  ): void {
    if (
      snapshot.lifecycle?.phase === "preloading" &&
      entry.preloadStatus !== "loading" &&
      entry.preloadStatus !== "ready" &&
      !entry.preloadPromise
    ) {
      const maxConcurrentPreloads = snapshot.lifecycleConfig?.maxConcurrentPreloads ?? 0;

      if (this.activePreloads < maxConcurrentPreloads) {
        this.activePreloads += 1;
        entry.preloadStatus = "loading";

        let preloadResult: void | Promise<void>;

        try {
          preloadResult = entry.effect.preload?.(snapshot, renderContext);
        } catch (error) {
          preloadResult = Promise.reject(error);
        }

        entry.preloadPromise = Promise.resolve(preloadResult)
          .then(() => {
            entry.preloadErrorMessage = undefined;
            entry.preloadStatus = "ready";
            if (entry.phase === "preloading") {
              entry.phase = "ready";
            }
          })
          .catch((error: unknown) => {
            entry.preloadErrorMessage = formatPreloadError(error);
            entry.preloadStatus = "failed";
          })
          .finally(() => {
            this.activePreloads = Math.max(this.activePreloads - 1, 0);
            entry.preloadPromise = undefined;
          });
      }
    }

    if (snapshot.isActive && !entry.wasActive) {
      entry.effect.enter?.(snapshot);
    } else if (!snapshot.isActive && entry.wasActive) {
      entry.effect.leave?.(snapshot);
    }

    if (snapshot.lifecycle?.phase === "suspended" && entry.phase !== "suspended") {
      entry.effect.suspend?.(snapshot);
    }
  }
}

function readEffectLifecycle(params: Record<string, unknown>): WebGLEffectLifecycleInput {
  const lifecycle = params.lifecycle;

  return typeof lifecycle === "object" && lifecycle !== null && !Array.isArray(lifecycle)
    ? (lifecycle as WebGLEffectLifecycleInput)
    : {};
}

function formatPreloadError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return "Effect preload failed";
}

function choosePhase(input: {
  entryPhase?: LifecyclePhase;
  idleMs: number;
  isActive: boolean;
  isWithinPreload: boolean;
  isWithinSuspend: boolean;
  isWithinUnload: boolean;
  minIdleMs: number;
  preloadStatus: PreloadStatus;
}): LifecyclePhase {
  if (input.isActive) {
    return "active";
  }

  if (!input.isWithinUnload && input.idleMs >= input.minIdleMs) {
    return "disposed";
  }

  if (input.entryPhase === "active") {
    return input.isWithinSuspend || input.isWithinUnload ? "suspended" : "idle";
  }

  if (input.isWithinPreload) {
    return input.preloadStatus === "ready" ? "ready" : "preloading";
  }

  if (input.entryPhase === "suspended") {
    return input.isWithinSuspend || input.isWithinUnload ? "suspended" : "idle";
  }

  if (input.entryPhase === "ready" || input.entryPhase === "preloading") {
    return input.isWithinSuspend || input.isWithinUnload ? "suspended" : "idle";
  }

  return "idle";
}
