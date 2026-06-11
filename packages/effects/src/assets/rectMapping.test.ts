import { describe, expect, it } from "vitest";

import { mapElementRectToWorld } from "./rectMapping";

describe("mapElementRectToWorld", () => {
  it("maps a centered element rect into orthographic world bounds", () => {
    const bounds = mapElementRectToWorld({
      placement: {
        anchor: "element",
        fit: "cover",
        height: 1,
        offsetX: 0,
        offsetY: 0,
        width: 1,
        x: 0.5,
        y: 0.5
      },
      rect: { height: 300, left: 250, top: 150, width: 500 },
      viewport: { height: 600, width: 1000 }
    });

    expect(bounds.center.x).toBeCloseTo(0);
    expect(bounds.center.y).toBeCloseTo(0);
    expect(bounds.size.width).toBeCloseTo(500);
    expect(bounds.size.height).toBeCloseTo(300);
  });

  it("supports relative placement inside the anchor rect", () => {
    const bounds = mapElementRectToWorld({
      placement: {
        anchor: "element",
        fit: "contain",
        height: 0.5,
        offsetX: 0,
        offsetY: 0,
        width: 0.5,
        x: 0.25,
        y: 0.25
      },
      rect: { height: 600, left: 0, top: 0, width: 1000 },
      viewport: { height: 600, width: 1000 }
    });

    expect(bounds.center.x).toBeCloseTo(-250);
    expect(bounds.center.y).toBeCloseTo(150);
    expect(bounds.size.width).toBeCloseTo(500);
    expect(bounds.size.height).toBeCloseTo(300);
  });
});
