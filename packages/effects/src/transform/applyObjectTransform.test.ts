import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { applyObjectTransform } from "./applyObjectTransform";
import { normalizeObjectTransform } from "./params";

describe("normalizeObjectTransform", () => {
  it("returns stable defaults for missing transform input", () => {
    const transform = normalizeObjectTransform(undefined);

    expect(transform.rotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(transform.scale).toBe(1);
    expect(transform.autoRotate).toBeUndefined();
  });

  it("keeps finite static rotation, scalar scale, and auto-rotation", () => {
    const transform = normalizeObjectTransform({
      autoRotate: { axis: "y", speed: 0.25 },
      rotation: { x: 0.1, y: -0.45, z: 0.2 },
      scale: 1.4
    });

    expect(transform.rotation).toEqual({ x: 0.1, y: -0.45, z: 0.2 });
    expect(transform.scale).toBe(1.4);
    expect(transform.autoRotate).toEqual({ axis: "y", speed: 0.25 });
  });

  it("drops invalid auto-rotation while keeping valid transform values", () => {
    const transform = normalizeObjectTransform({
      autoRotate: { axis: "diagonal", speed: Number.NaN },
      rotation: { x: 0.3, y: "bad", z: 0.1 },
      scale: -2
    });

    expect(transform.rotation).toEqual({ x: 0.3, y: 0, z: 0.1 });
    expect(transform.scale).toBe(1);
    expect(transform.autoRotate).toBeUndefined();
  });
});

describe("applyObjectTransform", () => {
  it("applies declared rotation and scale on top of the placement base scale", () => {
    const object = new THREE.Group();
    const transform = normalizeObjectTransform({
      rotation: { x: 0.1, y: -0.45, z: 0.2 },
      scale: 1.5
    });

    applyObjectTransform(object, { baseScale: 2, time: 4, transform });

    expect(object.scale.x).toBe(3);
    expect(object.scale.y).toBe(3);
    expect(object.scale.z).toBe(3);
    expect(object.rotation.x).toBe(0.1);
    expect(object.rotation.y).toBe(-0.45);
    expect(object.rotation.z).toBe(0.2);
  });

  it("adds auto-rotation to the selected axis without mutating the normalized transform", () => {
    const object = new THREE.Group();
    const transform = normalizeObjectTransform({
      autoRotate: { axis: "y", speed: 0.25 },
      rotation: { y: -0.45 }
    });

    applyObjectTransform(object, { baseScale: 1, time: 2, transform });

    expect(object.rotation.x).toBe(0);
    expect(object.rotation.y).toBeCloseTo(0.05);
    expect(object.rotation.z).toBe(0);
    expect(transform.rotation.y).toBe(-0.45);
  });
});
