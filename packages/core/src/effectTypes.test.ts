import { describe, expect, it } from "vitest";

import { roleToEffect, snapshotToTrigger, type WebGLScrollTriggerSnapshot } from "./effectTypes";

describe("roleToEffect", () => {
  it("maps 'cut' to 'pixelated-wipe'", () => {
    expect(roleToEffect("cut")).toBe("pixelated-wipe");
  });

  it("maps 'title' to 'fade-title'", () => {
    expect(roleToEffect("title")).toBe("fade-title");
  });

  it("returns undefined for unknown roles", () => {
    expect(roleToEffect("particle")).toBeUndefined();
    expect(roleToEffect(undefined)).toBeUndefined();
    expect(roleToEffect("")).toBeUndefined();
  });
});

describe("snapshotToTrigger", () => {
  const baseSnapshot: WebGLScrollTriggerSnapshot = {
    cutIndex: 0,
    end: "bottom top",
    id: "scene:cut-0:0",
    isActive: true,
    progress: 0.5,
    role: "cut",
    scene: "scene",
    start: "top bottom",
    trigger: "cut-0"
  };

  it("converts a legacy snapshot using role-to-effect mapping", () => {
    const element = document.createElement("div");
    const result = snapshotToTrigger(baseSnapshot, element);

    expect(result.effect).toBe("pixelated-wipe");
    expect(result.progress).toBe(0.5);
    expect(result.isActive).toBe(true);
    expect(result.element).toBe(element);
    expect(result.id).toBe("scene:cut-0:0");
    expect(result.velocity).toBe(0);
    expect(result.direction).toBe(0);
  });

  it("uses explicit effect when present on snapshot", () => {
    const snapshotWithEffect = { ...baseSnapshot, effect: "dissolve" };
    const element = document.createElement("div");
    const result = snapshotToTrigger(snapshotWithEffect, element);

    expect(result.effect).toBe("dissolve");
  });

  it("merges provided params", () => {
    const element = document.createElement("div");
    const result = snapshotToTrigger(baseSnapshot, element, { strength: 0.8 });

    expect(result.params).toEqual({ strength: 0.8 });
  });

  it("defaults params to empty object", () => {
    const element = document.createElement("div");
    const result = snapshotToTrigger(baseSnapshot, element);

    expect(result.params).toEqual({});
  });

  it("falls back to 'unknown' when no effect or role matches", () => {
    const noRoleSnapshot: WebGLScrollTriggerSnapshot = {
      ...baseSnapshot,
      role: undefined
    };
    const element = document.createElement("div");
    const result = snapshotToTrigger(noRoleSnapshot, element);

    expect(result.effect).toBe("unknown");
  });
});
