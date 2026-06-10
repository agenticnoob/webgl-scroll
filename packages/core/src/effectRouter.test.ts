import { afterEach, describe, expect, it, vi } from "vitest";

import { clearEffectRegistry, registerEffect } from "./effectRegistry";
import { EffectRouter } from "./effectRouter";
import type { EffectContext, RenderContext, TriggerSnapshot } from "./effectTypes";
import { WebGLEffect } from "./effectTypes";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

class MockEffect extends WebGLEffect {
  readonly type = "mock";
  createSpy = vi.fn();
  updateSpy = vi.fn();
  disposeSpy = vi.fn();
  onEnterSpy = vi.fn();
  onLeaveSpy = vi.fn();
  onResizeSpy = vi.fn();

  create(context: EffectContext): void {
    this.createSpy(context);
  }

  update(snapshot: TriggerSnapshot, context: RenderContext): void {
    this.updateSpy(snapshot, context);
  }

  dispose(): void {
    this.disposeSpy();
  }

  override onEnter(snapshot: TriggerSnapshot): void {
    this.onEnterSpy(snapshot);
  }

  override onLeave(snapshot: TriggerSnapshot): void {
    this.onLeaveSpy(snapshot);
  }

  override onResize(viewport: { height: number; width: number }): void {
    this.onResizeSpy(viewport);
  }
}

function makeSnapshot(overrides: Partial<TriggerSnapshot> = {}): TriggerSnapshot {
  return {
    direction: 0,
    effect: "mock",
    element: document.createElement("div"),
    end: "bottom top",
    id: "scene:trigger:0",
    isActive: false,
    params: {},
    progress: 0,
    scene: "scene",
    start: "top bottom",
    velocity: 0,
    ...overrides
  };
}

function makeRenderContext(): RenderContext {
  return {
    camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    deltaTime: 0.016,
    renderer: { scene: new THREE.Scene() } as unknown as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    time: 0,
    viewport: { height: 900, width: 1440 }
  };
}

// Track mock instances so the router's `new klass()` returns our spies.
let latestMock: MockEffect;

class MockEffectFactory extends MockEffect {
  constructor() {
    super();
    latestMock = this;
  }
}

afterEach(() => {
  clearEffectRegistry();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EffectRouter", () => {
  it("creates an effect instance when a new trigger appears", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const snapshot = makeSnapshot();
    const ctx = makeRenderContext();

    router.routeAll([snapshot], ctx);

    expect(router.size).toBe(1);
    expect(latestMock.createSpy).toHaveBeenCalledOnce();
    expect(latestMock.updateSpy).toHaveBeenCalledOnce();
  });

  it("reuses existing effect instance on subsequent frames", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const snapshot = makeSnapshot();
    const ctx = makeRenderContext();

    router.routeAll([snapshot], ctx);
    const firstMock = latestMock;

    router.routeAll([snapshot], ctx);

    expect(router.size).toBe(1);
    expect(latestMock).toBe(firstMock);
    expect(firstMock.createSpy).toHaveBeenCalledOnce();
    expect(firstMock.updateSpy).toHaveBeenCalledTimes(2);
  });

  it("disposes effect when trigger disappears", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const snapshot = makeSnapshot();
    const ctx = makeRenderContext();

    router.routeAll([snapshot], ctx);
    const mock = latestMock;

    // Empty snapshot list — trigger gone.
    router.routeAll([], ctx);

    expect(mock.disposeSpy).toHaveBeenCalledOnce();
    expect(router.size).toBe(0);
  });

  it("skips unknown effect types without crashing", () => {
    // Nothing registered for "mock".
    const router = new EffectRouter();
    const snapshot = makeSnapshot();
    const ctx = makeRenderContext();

    router.routeAll([snapshot], ctx);

    expect(router.size).toBe(0);
  });

  it("fires onEnter when trigger becomes active", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    // Frame 1: inactive.
    router.routeAll([makeSnapshot({ isActive: false })], ctx);
    expect(latestMock.onEnterSpy).not.toHaveBeenCalled();

    // Frame 2: active.
    router.routeAll([makeSnapshot({ isActive: true })], ctx);
    expect(latestMock.onEnterSpy).toHaveBeenCalledOnce();
  });

  it("fires onLeave when trigger becomes inactive", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    // Frame 1: active.
    router.routeAll([makeSnapshot({ isActive: true })], ctx);
    expect(latestMock.onLeaveSpy).not.toHaveBeenCalled();

    // Frame 2: inactive.
    router.routeAll([makeSnapshot({ isActive: false })], ctx);
    expect(latestMock.onLeaveSpy).toHaveBeenCalledOnce();
  });

  it("does not re-fire onEnter/onLeave when activity state stays the same", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    router.routeAll([makeSnapshot({ isActive: true })], ctx);
    router.routeAll([makeSnapshot({ isActive: true })], ctx);
    router.routeAll([makeSnapshot({ isActive: true })], ctx);

    expect(latestMock.onEnterSpy).toHaveBeenCalledOnce();
    expect(latestMock.onLeaveSpy).not.toHaveBeenCalled();
  });

  it("forwards resize to all active effects", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    router.routeAll([makeSnapshot()], ctx);

    router.resize({ height: 600, width: 800 });

    expect(latestMock.onResizeSpy).toHaveBeenCalledWith({ height: 600, width: 800 });
  });

  it("disposeAll clears all instances", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    router.routeAll([makeSnapshot({ id: "a" }), makeSnapshot({ id: "b" })], ctx);

    expect(router.size).toBe(2);

    router.disposeAll();

    expect(router.size).toBe(0);
  });

  it("applies paramSchema defaults to effect context", () => {
    registerEffect({
      klass: MockEffectFactory,
      paramSchema: {
        strength: { default: 0.8, type: "number" }
      },
      type: "mock"
    });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    router.routeAll([makeSnapshot({ params: {} })], ctx);

    const createContext = latestMock.createSpy.mock.calls[0][0] as EffectContext;

    expect(createContext.params.strength).toBe(0.8);
  });

  it("handles multiple effect types independently", () => {
    class OtherEffect extends WebGLEffect {
      readonly type = "other";
      createSpy = vi.fn();
      updateSpy = vi.fn();
      disposeSpy = vi.fn();

      create(): void {
        this.createSpy();
      }
      update(): void {
        this.updateSpy();
      }
      dispose(): void {
        this.disposeSpy();
      }
    }

    let otherInstance: OtherEffect;

    class OtherFactory extends OtherEffect {
      constructor() {
        super();
        otherInstance = this;
      }
    }

    registerEffect({ klass: MockEffectFactory, type: "mock" });
    registerEffect({ klass: OtherFactory, type: "other" });

    const router = new EffectRouter();
    const ctx = makeRenderContext();

    router.routeAll(
      [
        makeSnapshot({ effect: "mock", id: "a" }),
        makeSnapshot({ effect: "other", id: "b" })
      ],
      ctx
    );

    expect(router.size).toBe(2);
    expect(latestMock.createSpy).toHaveBeenCalledOnce();
    expect(otherInstance!.createSpy).toHaveBeenCalledOnce();

    // Remove only the "other" trigger.
    router.routeAll([makeSnapshot({ effect: "mock", id: "a" })], ctx);

    expect(otherInstance!.disposeSpy).toHaveBeenCalledOnce();
    expect(latestMock.disposeSpy).not.toHaveBeenCalled();
    expect(router.size).toBe(1);
  });
});
