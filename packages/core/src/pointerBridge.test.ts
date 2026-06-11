import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWebGLPointerBridge, sharedStateTree } from "./index";

function setRect(element: HTMLElement, rect: Partial<DOMRect>) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: rect.bottom ?? 120,
    height: rect.height ?? 100,
    left: rect.left ?? 10,
    right: rect.right ?? 210,
    toJSON: () => ({}),
    top: rect.top ?? 20,
    width: rect.width ?? 200,
    x: rect.left ?? 10,
    y: rect.top ?? 20
  } as DOMRect);
}

function pointerEvent(type: string, clientX: number, clientY: number) {
  return new MouseEvent(type, { clientX, clientY, bubbles: true });
}

describe("createWebGLPointerBridge", () => {
  beforeEach(() => {
    sharedStateTree.reset();
    vi.restoreAllMocks();
  });

  it("normalizes pointer coordinates into target space and NDC", () => {
    let now = 100;
    const target = document.createElement("canvas");
    setRect(target, { height: 100, left: 10, top: 20, width: 200 });

    const bridge = createWebGLPointerBridge({
      getNow: () => now,
      target
    });

    target.dispatchEvent(pointerEvent("pointermove", 60, 45));

    expect(sharedStateTree.pointer).toEqual(
      expect.objectContaining({
        idleMs: 0,
        isInside: true,
        isMoving: true,
        lastMoveAt: 100,
        ndcX: -0.5,
        ndcY: 0.5,
        x: 0.25,
        y: 0.25
      })
    );

    now = 140;
    target.dispatchEvent(pointerEvent("pointermove", 110, 70));

    expect(sharedStateTree.pointer).toEqual(
      expect.objectContaining({
        ndcX: 0,
        ndcY: 0,
        velocityX: 6.25,
        velocityY: 6.25,
        x: 0.5,
        y: 0.5
      })
    );

    bridge.dispose();
  });

  it("can listen on window while measuring against the canvas target", () => {
    const target = document.createElement("canvas");
    setRect(target, { height: 100, left: 10, top: 20, width: 200 });

    const bridge = createWebGLPointerBridge({
      eventTarget: window,
      getNow: () => 100,
      target
    });

    window.dispatchEvent(pointerEvent("pointermove", 60, 45));

    expect(sharedStateTree.pointer).toEqual(
      expect.objectContaining({
        isInside: true,
        isMoving: true,
        ndcX: -0.5,
        ndcY: 0.5,
        x: 0.25,
        y: 0.25
      })
    );

    bridge.dispose();
  });

  it("falls back to mouse events for browsers or tools that do not emit pointer events", () => {
    const target = document.createElement("canvas");
    setRect(target, { height: 100, left: 10, top: 20, width: 200 });

    const bridge = createWebGLPointerBridge({
      eventTarget: window,
      getNow: () => 100,
      target
    });

    window.dispatchEvent(pointerEvent("mousemove", 110, 70));

    expect(sharedStateTree.pointer).toEqual(
      expect.objectContaining({
        isInside: true,
        isMoving: true,
        ndcX: 0,
        ndcY: 0,
        x: 0.5,
        y: 0.5
      })
    );

    bridge.dispose();
  });

  it("marks the pointer idle when no movement arrives before update", () => {
    let now = 0;
    const target = document.createElement("canvas");
    setRect(target, {});

    const bridge = createWebGLPointerBridge({ getNow: () => now, idleThresholdMs: 120, target });
    target.dispatchEvent(pointerEvent("pointermove", 60, 45));

    now = 150;
    bridge.update();

    expect(sharedStateTree.pointer).toEqual(
      expect.objectContaining({
        idleMs: 150,
        isMoving: false
      })
    );

    bridge.dispose();
  });

  it("marks pointer outside on leave and stops updating after dispose", () => {
    const target = document.createElement("canvas");
    setRect(target, {});

    const bridge = createWebGLPointerBridge({ getNow: () => 0, target });
    target.dispatchEvent(pointerEvent("pointermove", 60, 45));
    target.dispatchEvent(new Event("pointerleave"));

    expect(sharedStateTree.pointer.isInside).toBe(false);

    bridge.dispose();
    target.dispatchEvent(pointerEvent("pointermove", 110, 70));

    expect(sharedStateTree.pointer.x).toBe(0.25);
  });
});
