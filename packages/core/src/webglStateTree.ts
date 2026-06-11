import {
  roleToEffect,
  type TriggerSnapshot,
  type WebGLScrollTriggerSnapshot
} from "./effectTypes";
import { createDefaultPointerState, type WebGLPointerState } from "./pointerState";

// ---------------------------------------------------------------------------
// WebGLStateTree
// ---------------------------------------------------------------------------

/**
 * Centralized store for all trigger snapshots with indexed queries and
 * change subscription.
 *
 * Replaces the manual `Object.values(state.triggers).filter(...)` pattern
 * scattered across effect modules. Pure data container — no rendering logic.
 *
 * Lifecycle:
 *   1. `registerElement(id, element, params)` — associate DOM metadata.
 *   2. `set(id, snapshot)` — write or update a trigger's timing data.
 *   3. `getByScene(scene)` / `getByEffect(effect)` — indexed queries.
 *   4. `subscribe(listener)` — react to version changes.
 *   5. `reset()` — clear all data on teardown.
 */
export class WebGLStateTree {
  /** Monotonically increasing counter, bumped on every mutation. */
  version = 0;

  /** Whether reduced motion preference is active. */
  reducedMotion = false;

  /** Latest normalized pointer state, shared by effects that need input. */
  pointer: WebGLPointerState = createDefaultPointerState();

  // -- internal storage -----------------------------------------------------

  private raw: Record<string, WebGLScrollTriggerSnapshot> = {};
  private elements = new Map<string, HTMLElement>();
  private paramsStore = new Map<string, Record<string, unknown>>();

  // -- indexes --------------------------------------------------------------

  private sceneIndex = new Map<string, Set<string>>();
  private effectIndex = new Map<string, Set<string>>();

  // -- subscribers ----------------------------------------------------------

  private listeners = new Set<(version: number) => void>();

  // -- backward-compatible triggers accessor --------------------------------

  /**
   * Read-only view of the raw trigger records. Provided for backward
   * compatibility with legacy code that iterates `Object.values(triggers)`.
   * Prefer the indexed `getByScene` / `getByEffect` methods when possible.
   */
  get triggers(): Readonly<Record<string, WebGLScrollTriggerSnapshot>> {
    return this.raw;
  }

  // -- mutation API ----------------------------------------------------------

  /**
   * Register a DOM element (and optional params) for a trigger id.
   * Called by the bridge layer when creating scroll triggers.
   */
  registerElement(
    id: string,
    element: HTMLElement,
    params: Record<string, unknown> = {}
  ): void {
    this.elements.set(id, element);
    this.paramsStore.set(id, params);
  }

  /**
   * Write or update a single trigger snapshot. Rebuilds indexes for the
   * affected trigger and notifies subscribers.
   */
  set(id: string, snapshot: WebGLScrollTriggerSnapshot): void {
    const old = this.raw[id];

    // Remove stale index entries if the trigger already existed.
    if (old) {
      this.removeFromIndex(old);
    }

    this.raw[id] = snapshot;
    this.addToIndex(snapshot);
    this.bumpVersion();
  }

  /**
   * Remove a trigger by id. Rebuilds indexes and notifies subscribers.
   */
  delete(id: string): void {
    const snapshot = this.raw[id];

    if (snapshot) {
      this.removeFromIndex(snapshot);
      delete this.raw[id];
      this.bumpVersion();
    }
  }

  /**
   * Clear all triggers, indexes, elements, and params. Notifies subscribers.
   */
  reset(): void {
    this.raw = {};
    this.sceneIndex.clear();
    this.effectIndex.clear();
    this.elements.clear();
    this.paramsStore.clear();
    this.reducedMotion = false;
    this.pointer = createDefaultPointerState();
    this.bumpVersion();
  }

  // -- query API ------------------------------------------------------------

  /**
   * Return all trigger snapshots belonging to the given scene, converted
   * to `TriggerSnapshot` (new shape). Returns an empty array if no match.
   */
  getByScene(scene: string): TriggerSnapshot[] {
    const ids = this.sceneIndex.get(scene);

    if (!ids || ids.size === 0) {
      return [];
    }

    return this.snapshotsForIds(ids);
  }

  /**
   * Return all trigger snapshots with the given effect type, converted
   * to `TriggerSnapshot` (new shape). Returns an empty array if no match.
   */
  getByEffect(effect: string): TriggerSnapshot[] {
    const ids = this.effectIndex.get(effect);

    if (!ids || ids.size === 0) {
      return [];
    }

    return this.snapshotsForIds(ids);
  }

  /**
   * Convert a single raw snapshot to a `TriggerSnapshot` using stored
   * element and params. Returns `undefined` if the id is unknown.
   */
  getSnapshot(id: string): TriggerSnapshot | undefined {
    const raw = this.raw[id];

    if (!raw) {
      return undefined;
    }

    return this.convert(raw);
  }

  /**
   * Return all triggers as `TriggerSnapshot[]`.
   */
  getAllSnapshots(): TriggerSnapshot[] {
    return Object.values(this.raw).map((r) => this.convert(r));
  }

  // -- subscription API -----------------------------------------------------

  /**
   * Subscribe to version changes. The listener is called synchronously
   * after every mutation. Returns an unsubscribe function.
   */
  subscribe(listener: (version: number) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  // -- private helpers ------------------------------------------------------

  private addToIndex(snapshot: WebGLScrollTriggerSnapshot): void {
    // Scene index.
    let sceneSet = this.sceneIndex.get(snapshot.scene);

    if (!sceneSet) {
      sceneSet = new Set();
      this.sceneIndex.set(snapshot.scene, sceneSet);
    }

    sceneSet.add(snapshot.id);

    // Effect index: derive from the `effect` field or fall back to role mapping.
    const effect = snapshot.effect ?? roleToEffect(snapshot.role);

    if (effect) {
      let effectSet = this.effectIndex.get(effect);

      if (!effectSet) {
        effectSet = new Set();
        this.effectIndex.set(effect, effectSet);
      }

      effectSet.add(snapshot.id);
    }
  }

  private removeFromIndex(snapshot: WebGLScrollTriggerSnapshot): void {
    this.sceneIndex.get(snapshot.scene)?.delete(snapshot.id);

    const effect = snapshot.effect ?? roleToEffect(snapshot.role);

    if (effect) {
      this.effectIndex.get(effect)?.delete(snapshot.id);
    }
  }

  private convert(raw: WebGLScrollTriggerSnapshot): TriggerSnapshot {
    const element = this.elements.get(raw.id) ?? document.createElement("div");
    const params = this.paramsStore.get(raw.id) ?? {};
    const effect = raw.effect ?? roleToEffect(raw.role) ?? "unknown";

    return {
      cutIndex: raw.cutIndex,
      direction: 0,
      effect,
      element,
      end: raw.end,
      id: raw.id,
      isActive: raw.isActive,
      params,
      progress: raw.progress,
      scene: raw.scene,
      start: raw.start,
      velocity: 0
    };
  }

  private snapshotsForIds(ids: Set<string>): TriggerSnapshot[] {
    const result: TriggerSnapshot[] = [];

    for (const id of ids) {
      const raw = this.raw[id];

      if (raw) {
        result.push(this.convert(raw));
      }
    }

    return result;
  }

  private bumpVersion(): void {
    this.version += 1;

    for (const listener of this.listeners) {
      listener(this.version);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared singleton
// ---------------------------------------------------------------------------

/**
 * Shared `WebGLStateTree` instance used across the application.
 * The GSAP bridge writes to this tree, and effect modules read from it.
 */
export const sharedStateTree = new WebGLStateTree();
