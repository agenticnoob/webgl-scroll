import { describe, expect, it } from "vitest";

import {
  calculatePointerActivity,
  mapPointerToParticleSpace
} from "./pointerMapping";

describe("calculatePointerActivity", () => {
  it("returns zero when the effect is inactive or reduced motion is enabled", () => {
    const pointer = { idleMs: 0, isInside: true, isMoving: true, ndcX: 0.5, ndcY: 0.5 };

    expect(
      calculatePointerActivity({
        deltaTime: 0.016,
        isActive: false,
        pointer,
        previousActivity: 1,
        reducedMotion: false
      })
    ).toBe(0);
    expect(
      calculatePointerActivity({
        deltaTime: 0.016,
        isActive: true,
        pointer,
        previousActivity: 1,
        reducedMotion: true
      })
    ).toBe(0);
  });

  it("keeps moving pointers at full strength and decays idle hover activity", () => {
    const movingPointer = { idleMs: 0, isInside: true, isMoving: true, ndcX: 0.5, ndcY: 0.5 };
    const idlePointer = { ...movingPointer, idleMs: 300, isMoving: false };

    expect(
      calculatePointerActivity({
        deltaTime: 0.016,
        isActive: true,
        pointer: movingPointer,
        previousActivity: 0.2,
        reducedMotion: false
      })
    ).toBe(1);
    expect(
      calculatePointerActivity({
        deltaTime: 0.1,
        isActive: true,
        pointer: idlePointer,
        previousActivity: 0.9,
        reducedMotion: false
      })
    ).toBeCloseTo(0.785);
  });
});

describe("mapPointerToParticleSpace", () => {
  it("maps viewport NDC into model-local particle space", () => {
    expect(
      mapPointerToParticleSpace({
        baseScale: 0.5,
        boundsCenter: { x: 0.25, y: -0.25 },
        pointer: { idleMs: 0, isInside: true, isMoving: true, ndcX: 0.75, ndcY: 0.25 }
      })
    ).toEqual({ x: 1, y: 1, z: 0 });
  });
});
