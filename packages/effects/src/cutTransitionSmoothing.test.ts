import { describe, expect, it } from "vitest";

import { chooseActiveCutFromTriggers, chooseWeightedCut, getCutFade } from "./cutTransitionSmoothing";

describe("getCutFade", () => {
  it("softens cut entry and exit near the viewport edges", () => {
    expect(getCutFade({ bottom: 20, top: -80 }, 800)).toBeGreaterThan(0);
    expect(getCutFade({ bottom: 20, top: -80 }, 800)).toBeLessThan(1);
    expect(getCutFade({ bottom: 500, top: 200 }, 800)).toBe(1);
    expect(getCutFade({ bottom: 880, top: 780 }, 800)).toBeGreaterThan(0);
    expect(getCutFade({ bottom: 880, top: 780 }, 800)).toBeLessThan(1);
    expect(getCutFade({ bottom: -20, top: -120 }, 800)).toBe(0);
  });
});

describe("chooseWeightedCut", () => {
  it("keeps the previous cut through near-ties to avoid centerline popping", () => {
    const cuts = [
      { bottom: 250, index: 0, top: -50 },
      { bottom: 850, index: 1, top: 550 }
    ];

    expect(chooseWeightedCut(cuts, 800, 0)?.index).toBe(0);
  });

  it("switches when the incoming cut is clearly more present", () => {
    const cuts = [
      { bottom: 80, index: 0, top: -220 },
      { bottom: 760, index: 1, top: 460 }
    ];

    expect(chooseWeightedCut(cuts, 800, 0)?.index).toBe(1);
  });
});

describe("chooseActiveCutFromTriggers", () => {
  it("returns undefined when no cuts have meaningful progress", () => {
    const cuts = [
      { cutIndex: 0, isActive: false, progress: 0 },
      { cutIndex: 1, isActive: false, progress: 0 }
    ];

    expect(chooseActiveCutFromTriggers(cuts)).toBeUndefined();
  });

  it("selects the cut closest to center (progress ≈ 0.5)", () => {
    const cuts = [
      { cutIndex: 0, isActive: true, progress: 0.1 },
      { cutIndex: 1, isActive: true, progress: 0.5 }
    ];

    expect(chooseActiveCutFromTriggers(cuts)?.cutIndex).toBe(1);
  });

  it("keeps the previous cut through near-ties to avoid flicker", () => {
    const cuts = [
      { cutIndex: 0, isActive: true, progress: 0.48 },
      { cutIndex: 1, isActive: true, progress: 0.52 }
    ];

    expect(chooseActiveCutFromTriggers(cuts, 0)?.cutIndex).toBe(0);
  });

  it("switches when the incoming cut is clearly more prominent", () => {
    const cuts = [
      { cutIndex: 0, isActive: true, progress: 0.15 },
      { cutIndex: 1, isActive: true, progress: 0.5 }
    ];

    expect(chooseActiveCutFromTriggers(cuts, 0)?.cutIndex).toBe(1);
  });
});
