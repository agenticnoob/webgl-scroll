import { describe, expect, it } from "vitest";

import { clamp01, evaluateAssetOpacity, evaluateScrollTuple, mapScrollToTime } from "./timeline";

describe("asset timeline helpers", () => {
  it("clamps progress to the scroll range", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });

  it("maps scroll progress to a video time range", () => {
    expect(mapScrollToTime({ endTime: 6, progress: 0.5, startTime: 2 })).toBe(4);
  });

  it("interpolates scroll transform tuples", () => {
    expect(evaluateScrollTuple(["scroll", 10, 20], 0.25)).toBe(12.5);
  });

  it("preserves explicit opacity when no scroll transform exists", () => {
    expect(evaluateAssetOpacity({ opacity: 0.7, progress: 0.25 })).toBe(0.7);
    expect(
      evaluateAssetOpacity({
        opacity: 0.7,
        progress: 0.25,
        transform: { opacity: ["scroll", 0.2, 1] }
      })
    ).toBe(0.4);
  });
});
