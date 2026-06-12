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
  onPreloadSpy = vi.fn();
  onResizeSpy = vi.fn();
  onSuspendSpy = vi.fn();

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

  override onPreload(snapshot: TriggerSnapshot): void | Promise<void> {
    return this.onPreloadSpy(snapshot);
  }

  override onResize(viewport: { height: number; width: number }): void {
    this.onResizeSpy(viewport);
  }

  override onSuspend(snapshot: TriggerSnapshot): void {
    this.onSuspendSpy(snapshot);
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

async function flushPreloadQueue(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// Track mock instances so the router's `new klass()` returns our spies.
let latestMock: MockEffect;
const mockInstances: MockEffect[] = [];

class MockEffectFactory extends MockEffect {
  constructor() {
    super();
    latestMock = this;
    mockInstances.push(this);
  }
}

afterEach(() => {
  clearEffectRegistry();
  mockInstances.length = 0;
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

  it("passes asset resolver to effect create context", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });

    const assetResolver = { resolve: vi.fn() };
    const router = new EffectRouter({ assetResolver });
    const ctx = makeRenderContext();

    router.routeAll([makeSnapshot()], ctx);

    const createContext = latestMock.createSpy.mock.calls[0][0] as EffectContext;

    expect(createContext.assetResolver).toBe(assetResolver);
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

  it("does not create an idle far-away effect", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });
    const router = new EffectRouter();
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 3900,
      height: 100,
      left: 0,
      right: 100,
      top: 3800,
      width: 100,
      x: 0,
      y: 3800,
      toJSON: () => ({})
    });

    router.routeAll([makeSnapshot({ element, isActive: false })], ctx);

    expect(router.size).toBe(0);
  });

  it("creates and preloads an effect inside preload margin", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    });

    router.routeAll([makeSnapshot({ element, isActive: false })], ctx);

    expect(router.size).toBe(1);
    expect(latestMock.createSpy).toHaveBeenCalledOnce();
    expect(latestMock.onPreloadSpy).toHaveBeenCalledOnce();
    expect(latestMock.updateSpy.mock.calls[0][0].lifecycle.phase).toBe("preloading");
    expect(latestMock.updateSpy.mock.calls[0][0].lifecycleConfig.preloadMargin).toBe("100vh");
  });

  it("fires onSuspend when an active effect leaves active range but stays retained", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });
    const router = new EffectRouter();
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 100,
      left: 0,
      right: 100,
      top: 400,
      width: 100,
      x: 0,
      y: 400,
      toJSON: () => ({})
    });

    router.routeAll([makeSnapshot({ element, isActive: true })], ctx);
    router.routeAll([makeSnapshot({ element, isActive: false })], ctx);

    expect(latestMock.onLeaveSpy).toHaveBeenCalledOnce();
    expect(latestMock.onSuspendSpy).toHaveBeenCalledOnce();
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.phase).toBe("suspended");
  });

  it("limits concurrent preload dispatches", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { maxConcurrentPreloads: 1, preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const first = document.createElement("div");
    const second = document.createElement("div");
    const rect = {
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    };
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(rect);

    router.routeAll(
      [
        makeSnapshot({ element: first, id: "a", isActive: false }),
        makeSnapshot({ element: second, id: "b", isActive: false })
      ],
      ctx
    );

    expect(router.size).toBe(2);
    expect(mockInstances[0].onPreloadSpy).toHaveBeenCalledOnce();
    expect(mockInstances[1].onPreloadSpy).not.toHaveBeenCalled();
  });

  it("retries skipped preloads after a preload slot is released", async () => {
    let resolveFirstPreload!: () => void;
    const firstPreload = new Promise<void>((resolve) => {
      resolveFirstPreload = resolve;
    });

    class BlockingPreloadFactory extends MockEffectFactory {
      override onPreload(snapshot: TriggerSnapshot): void | Promise<void> {
        super.onPreload(snapshot);
        return this === mockInstances[0] ? firstPreload : undefined;
      }
    }

    registerEffect({ klass: BlockingPreloadFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { maxConcurrentPreloads: 1, preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const first = document.createElement("div");
    const second = document.createElement("div");
    const rect = {
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    };
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(rect);
    const snapshots = [
      makeSnapshot({ element: first, id: "a", isActive: false }),
      makeSnapshot({ element: second, id: "b", isActive: false })
    ];

    router.routeAll(snapshots, ctx);

    expect(mockInstances[0].onPreloadSpy).toHaveBeenCalledOnce();
    expect(mockInstances[1].onPreloadSpy).not.toHaveBeenCalled();

    resolveFirstPreload();
    await firstPreload;
    await flushPreloadQueue();

    router.routeAll(snapshots, ctx);

    expect(mockInstances[1].onPreloadSpy).toHaveBeenCalledOnce();
  });

  it("releases preload slots when onPreload throws synchronously", async () => {
    const preloadError = new Error("preload failed");

    class ThrowingPreloadFactory extends MockEffectFactory {
      override onPreload(snapshot: TriggerSnapshot): void | Promise<void> {
        super.onPreload(snapshot);

        if (this === mockInstances[0] && this.onPreloadSpy.mock.calls.length === 1) {
          throw preloadError;
        }
      }
    }

    registerEffect({ klass: ThrowingPreloadFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { maxConcurrentPreloads: 1, preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const first = document.createElement("div");
    const second = document.createElement("div");
    const rect = {
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    };
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(rect);
    const snapshots = [
      makeSnapshot({ element: first, id: "a", isActive: false }),
      makeSnapshot({ element: second, id: "b", isActive: false })
    ];

    router.routeAll(snapshots, ctx);
    await flushPreloadQueue();

    router.routeAll([snapshots[1], snapshots[0]], ctx);
    await flushPreloadQueue();
    router.routeAll([snapshots[0], snapshots[1]], ctx);

    expect(mockInstances[0].onPreloadSpy).toHaveBeenCalledTimes(2);
    expect(mockInstances[1].onPreloadSpy).toHaveBeenCalledOnce();
  });

  it("retries a failed preload and clears failure diagnostics after success", async () => {
    const preloadError = new Error("preload failed once");

    class RetryPreloadFactory extends MockEffectFactory {
      override onPreload(snapshot: TriggerSnapshot): void | Promise<void> {
        super.onPreload(snapshot);

        if (this.onPreloadSpy.mock.calls.length === 1) {
          throw preloadError;
        }
      }
    }

    registerEffect({ klass: RetryPreloadFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { maxConcurrentPreloads: 1, preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    });
    const snapshot = makeSnapshot({ element, id: "a", isActive: false });

    router.routeAll([snapshot], ctx);
    await flushPreloadQueue();

    router.routeAll([snapshot], ctx);

    expect(latestMock.onPreloadSpy).toHaveBeenCalledTimes(2);
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle).toMatchObject({
      preloadErrorMessage: "preload failed once",
      preloadFailed: true
    });

    await flushPreloadQueue();
    router.routeAll([snapshot], ctx);

    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.preloadFailed).toBe(false);
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.preloadErrorMessage).toBeUndefined();
  });

  it("keeps preload ready after an inflight preload resolves while suspended", async () => {
    let resolvePreload!: () => void;
    const preload = new Promise<void>((resolve) => {
      resolvePreload = resolve;
    });

    class DeferredPreloadFactory extends MockEffectFactory {
      override onPreload(snapshot: TriggerSnapshot): void | Promise<void> {
        super.onPreload(snapshot);
        return preload;
      }
    }

    registerEffect({ klass: DeferredPreloadFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    const rectSpy = vi.spyOn(element, "getBoundingClientRect");
    const preloadRect = {
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    };
    const suspendedRect = {
      bottom: 2600,
      height: 100,
      left: 0,
      right: 100,
      top: 2500,
      width: 100,
      x: 0,
      y: 2500,
      toJSON: () => ({})
    };
    const snapshot = makeSnapshot({ element, id: "a", isActive: false });

    rectSpy.mockReturnValue(preloadRect);
    router.routeAll([snapshot], ctx);
    expect(latestMock.onPreloadSpy).toHaveBeenCalledOnce();

    rectSpy.mockReturnValue(suspendedRect);
    router.routeAll([snapshot], ctx);
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.phase).toBe("suspended");

    resolvePreload();
    await preload;
    await flushPreloadQueue();

    rectSpy.mockReturnValue(preloadRect);
    router.routeAll([snapshot], ctx);

    expect(latestMock.onPreloadSpy).toHaveBeenCalledOnce();
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.phase).toBe("ready");
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.preloadStatus).toBe("ready");
  });

  it("retries an inflight preload rejection after returning to preload range", async () => {
    let rejectFirstPreload!: (error: Error) => void;
    const firstPreload = new Promise<void>((_resolve, reject) => {
      rejectFirstPreload = reject;
    });

    class RejectingPreloadFactory extends MockEffectFactory {
      override onPreload(snapshot: TriggerSnapshot): void | Promise<void> {
        super.onPreload(snapshot);
        return this.onPreloadSpy.mock.calls.length === 1 ? firstPreload : undefined;
      }
    }

    registerEffect({ klass: RejectingPreloadFactory, type: "mock" });
    const router = new EffectRouter({ lifecycle: { preloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    const rectSpy = vi.spyOn(element, "getBoundingClientRect");
    const preloadRect = {
      bottom: 1700,
      height: 100,
      left: 0,
      right: 100,
      top: 1600,
      width: 100,
      x: 0,
      y: 1600,
      toJSON: () => ({})
    };
    const suspendedRect = {
      bottom: 2600,
      height: 100,
      left: 0,
      right: 100,
      top: 2500,
      width: 100,
      x: 0,
      y: 2500,
      toJSON: () => ({})
    };
    const snapshot = makeSnapshot({ element, id: "a", isActive: false });

    rectSpy.mockReturnValue(preloadRect);
    router.routeAll([snapshot], ctx);
    expect(latestMock.onPreloadSpy).toHaveBeenCalledOnce();

    rectSpy.mockReturnValue(suspendedRect);
    router.routeAll([snapshot], ctx);

    rejectFirstPreload(new Error("deferred preload failed"));
    await firstPreload.catch(() => undefined);
    await flushPreloadQueue();

    rectSpy.mockReturnValue(preloadRect);
    router.routeAll([snapshot], ctx);

    expect(latestMock.onPreloadSpy).toHaveBeenCalledTimes(2);
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle).toMatchObject({
      preloadErrorMessage: "deferred preload failed",
      preloadFailed: true
    });

    await flushPreloadQueue();
    router.routeAll([snapshot], ctx);

    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.preloadFailed).toBe(false);
    expect(latestMock.updateSpy.mock.calls.at(-1)?.[0].lifecycle.preloadStatus).toBe("ready");
  });

  it("disposes a suspended effect after unload margin and idle ttl", () => {
    registerEffect({ klass: MockEffectFactory, type: "mock" });
    let now = 0;
    const router = new EffectRouter({ getNow: () => now, lifecycle: { minIdleMs: 1000, unloadMargin: "100vh" } });
    const ctx = makeRenderContext();
    const element = document.createElement("div");
    const rectSpy = vi.spyOn(element, "getBoundingClientRect");

    rectSpy.mockReturnValue({
      bottom: 500,
      height: 100,
      left: 0,
      right: 100,
      top: 400,
      width: 100,
      x: 0,
      y: 400,
      toJSON: () => ({})
    });
    router.routeAll([makeSnapshot({ element, isActive: true })], ctx);
    const mock = latestMock;

    rectSpy.mockReturnValue({
      bottom: 4000,
      height: 100,
      left: 0,
      right: 100,
      top: 3900,
      width: 100,
      x: 0,
      y: 3900,
      toJSON: () => ({})
    });
    router.routeAll([makeSnapshot({ element, isActive: false })], ctx);
    now = 1001;
    router.routeAll([makeSnapshot({ element, isActive: false })], ctx);

    expect(mock.disposeSpy).toHaveBeenCalledOnce();
    expect(router.size).toBe(0);
  });
});
