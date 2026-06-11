import type { AssetPlacement } from "./types";

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type WorldBounds = {
  center: { x: number; y: number };
  size: { width: number; height: number };
};

export function mapElementRectToWorld(options: {
  rect: RectLike;
  viewport: ViewportSize;
  placement: AssetPlacement;
}): WorldBounds {
  const anchor =
    options.placement.anchor === "viewport"
      ? { height: options.viewport.height, left: 0, top: 0, width: options.viewport.width }
      : options.rect;

  const screenCenterX = anchor.left + anchor.width * options.placement.x + options.placement.offsetX;
  const screenCenterY = anchor.top + anchor.height * options.placement.y + options.placement.offsetY;

  return {
    center: {
      x: screenCenterX - options.viewport.width / 2,
      y: options.viewport.height / 2 - screenCenterY
    },
    size: {
      height: anchor.height * options.placement.height,
      width: anchor.width * options.placement.width
    }
  };
}
