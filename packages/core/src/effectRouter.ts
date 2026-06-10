import { applyDefaults, resolveEffect, validateParams } from "./effectRegistry";
import type { EffectContext, RenderContext, TriggerSnapshot, WebGLEffect } from "./effectTypes";

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
  private instances = new Map<string, { effect: WebGLEffect; wasActive: boolean }>();

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

      if (!entry) {
        entry = this.createInstance(snapshot, renderContext);

        if (!entry) {
          continue;
        }

        this.instances.set(snapshot.id, entry);
      }

      // Fire enter/leave hooks on activity transitions.
      if (snapshot.isActive && !entry.wasActive) {
        entry.effect.onEnter?.(snapshot);
      } else if (!snapshot.isActive && entry.wasActive) {
        entry.effect.onLeave?.(snapshot);
      }

      entry.wasActive = snapshot.isActive;
      entry.effect.update(snapshot, renderContext);
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
      effect.onResize?.(viewport);
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
  ): { effect: WebGLEffect; wasActive: boolean } | undefined {
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

    const effect = new registration.klass();

    const context: EffectContext = {
      element: snapshot.element,
      params,
      renderer: renderContext.renderer,
      scene: renderContext.scene
    };

    effect.create(context);

    return { effect, wasActive: false };
  }
}
