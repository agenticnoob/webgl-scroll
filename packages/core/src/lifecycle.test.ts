import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEBGL_EFFECT_LIFECYCLE,
  computeElementViewportDistance,
  isWithinLifecycleMargin,
  normalizeLifecycleConfig,
  parseLifecycleMargin
} from "./lifecycle";

describe("lifecycle config", () => {
  it("uses safe defaults", () => {
    expect(normalizeLifecycleConfig({})).toEqual(DEFAULT_WEBGL_EFFECT_LIFECYCLE);
  });

  it("merges global, trigger, and effect config in priority order", () => {
    expect(
      normalizeLifecycleConfig(
        { preloadMargin: "120vh", unloadMargin: "260vh" },
        { preloadMargin: "140vh" },
        { unloadMargin: "320vh", minIdleMs: 9000 }
      )
    ).toMatchObject({
      preloadMargin: "140vh",
      unloadMargin: "320vh",
      minIdleMs: 9000
    });
  });

  it("rejects negative string margins during normalization", () => {
    expect(normalizeLifecycleConfig({ preloadMargin: "-10vh" as any }).preloadMargin).toBe(
      DEFAULT_WEBGL_EFFECT_LIFECYCLE.preloadMargin
    );
  });

  it("parses px, vh, vw, %, and numeric margins", () => {
    const viewport = { height: 800, width: 1200 };
    expect(parseLifecycleMargin(200, viewport)).toBe(200);
    expect(parseLifecycleMargin("240px", viewport)).toBe(240);
    expect(parseLifecycleMargin("50vh", viewport)).toBe(400);
    expect(parseLifecycleMargin("25vw", viewport)).toBe(300);
    expect(parseLifecycleMargin("50%", viewport)).toBe(400);
  });

  it("measures zero distance when an element intersects the viewport", () => {
    const rect = { bottom: 500, height: 400, left: 0, right: 100, top: 100, width: 100 };
    expect(computeElementViewportDistance(rect, { height: 800, width: 1200 })).toBe(0);
  });

  it("measures distance above and below the viewport", () => {
    expect(
      computeElementViewportDistance(
        { bottom: -120, height: 300, left: 0, right: 100, top: -420, width: 100 },
        { height: 800, width: 1200 }
      )
    ).toBe(120);
    expect(
      computeElementViewportDistance(
        { bottom: 1500, height: 300, left: 0, right: 100, top: 1200, width: 100 },
        { height: 800, width: 1200 }
      )
    ).toBe(400);
  });

  it("checks whether distance is inside a configured margin", () => {
    const viewport = { height: 800, width: 1200 };
    expect(isWithinLifecycleMargin(799, "100vh", viewport)).toBe(true);
    expect(isWithinLifecycleMargin(801, "100vh", viewport)).toBe(false);
  });
});
