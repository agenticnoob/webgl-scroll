import { describe, expect, it } from "vitest";

import { getActiveThemeTokens, getThemeTransitionFromTriggers, getThemeTransitionState, mixHexColor } from "./themeTransitionState";

const sections = [
  { accent: "#ffffff", bg: "#111111", fg: "#eeeeee", title: "One" },
  { accent: "#111111", bg: "#eeeeee", fg: "#111111", title: "Two" },
  { accent: "#ffffff", bg: "#223344", fg: "#ffffff", title: "Three" }
];

describe("getThemeTransitionState", () => {
  it("returns the current section before a transition band starts", () => {
    const state = getThemeTransitionState({
      cuts: [{ bottom: 1400, top: 1000 }],
      scrollY: 320,
      sections
    });

    expect(state).toMatchObject({
      currentIndex: 0,
      nextIndex: 1,
      from: sections[0],
      to: sections[1],
      progress: 0
    });
  });

  it("normalizes progress while the viewport center crosses a cut band", () => {
    const state = getThemeTransitionState({
      cuts: [{ bottom: 1400, top: 1000 }],
      scrollY: 1200,
      sections
    });

    expect(state.currentIndex).toBe(0);
    expect(state.nextIndex).toBe(1);
    expect(state.progress).toBeCloseTo(0.5);
  });

  it("selects the next transition after the first cut has completed", () => {
    const state = getThemeTransitionState({
      cuts: [
        { bottom: 1400, top: 1000 },
        { bottom: 2400, top: 2000 }
      ],
      scrollY: 1700,
      sections
    });

    expect(state).toMatchObject({
      currentIndex: 1,
      nextIndex: 2,
      from: sections[1],
      to: sections[2],
      progress: 0
    });
  });

  it("clamps to the final section after the last transition", () => {
    const state = getThemeTransitionState({
      cuts: [
        { bottom: 1400, top: 1000 },
        { bottom: 2400, top: 2000 }
      ],
      scrollY: 2600,
      sections
    });

    expect(state).toMatchObject({
      currentIndex: 2,
      nextIndex: 2,
      from: sections[2],
      to: sections[2],
      progress: 1
    });
  });
});

describe("theme color interpolation", () => {
  it("mixes hex colors through a clamped progress value", () => {
    expect(mixHexColor("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHexColor("#000", "#fff", -1)).toBe("#000000");
    expect(mixHexColor("#000", "#fff", 2)).toBe("#ffffff");
  });

  it("derives active root tokens from the same transition state", () => {
    const state = getThemeTransitionState({
      cuts: [{ bottom: 1400, top: 1000 }],
      scrollY: 1200,
      sections
    });

    expect(getActiveThemeTokens(state)).toEqual({
      accent: "#888888",
      bg: "#808080",
      fg: "#808080"
    });
  });
});

describe("getThemeTransitionFromTriggers", () => {
  it("returns the first section when no cuts have progress", () => {
    const state = getThemeTransitionFromTriggers({
      cuts: [{ cutIndex: 0, progress: 0 }],
      sections
    });

    expect(state).toMatchObject({
      currentIndex: 0,
      nextIndex: 1,
      from: sections[0],
      to: sections[1],
      progress: 0
    });
  });

  it("maps ScrollTrigger progress directly to transition progress", () => {
    const state = getThemeTransitionFromTriggers({
      cuts: [{ cutIndex: 0, progress: 0.5 }],
      sections
    });

    expect(state.currentIndex).toBe(0);
    expect(state.nextIndex).toBe(1);
    expect(state.progress).toBeCloseTo(0.5);
  });

  it("advances to the next section after a cut completes", () => {
    const state = getThemeTransitionFromTriggers({
      cuts: [
        { cutIndex: 0, progress: 1 },
        { cutIndex: 1, progress: 0 }
      ],
      sections
    });

    expect(state).toMatchObject({
      currentIndex: 1,
      nextIndex: 2,
      from: sections[1],
      to: sections[2],
      progress: 0
    });
  });

  it("clamps to the final section after all cuts complete", () => {
    const state = getThemeTransitionFromTriggers({
      cuts: [
        { cutIndex: 0, progress: 1 },
        { cutIndex: 1, progress: 1 }
      ],
      sections
    });

    expect(state).toMatchObject({
      currentIndex: 2,
      nextIndex: 2,
      from: sections[2],
      to: sections[2],
      progress: 1
    });
  });

  it("derives active tokens from trigger-based state", () => {
    const state = getThemeTransitionFromTriggers({
      cuts: [{ cutIndex: 0, progress: 0.5 }],
      sections
    });

    expect(getActiveThemeTokens(state)).toEqual({
      accent: "#888888",
      bg: "#808080",
      fg: "#808080"
    });
  });
});
