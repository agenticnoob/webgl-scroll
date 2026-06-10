/**
 * Shared color utilities for hex parsing, luminance, and interpolation.
 */

import { clamp01 } from "./math";

export type RgbColor = {
  b: number;
  g: number;
  r: number;
};

/**
 * Normalizes a hex color string to a 6-character lowercase hex string (no `#`).
 * Supports 3-character shorthand (`#abc` → `aabbcc`).
 */
export function normalizeHexColor(color: string) {
  const hex = color.trim().replace("#", "");

  if (hex.length === 3) {
    return hex
      .split("")
      .map((character) => character + character)
      .join("");
  }

  return hex.padEnd(6, "0").slice(0, 6).toLowerCase();
}

/**
 * Parses a hex color string into its RGB channels (0–255).
 */
export function hexToRgb(color: string): RgbColor {
  const hex = normalizeHexColor(color);

  return {
    b: Number.parseInt(hex.slice(4, 6), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    r: Number.parseInt(hex.slice(0, 2), 16)
  };
}

function channelToHex(channel: number) {
  return Math.round(channel).toString(16).padStart(2, "0");
}

/**
 * Converts an RGB object back to a hex color string.
 */
export function rgbToHex({ b, g, r }: RgbColor) {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

/**
 * Computes the relative luminance of a hex color using the BT.601 formula.
 * Returns a value in roughly [0, 255].
 */
export function getRelativeLuminance(color: string) {
  const { b, g, r } = hexToRgb(color);

  return r * 0.299 + g * 0.587 + b * 0.114;
}

/**
 * Linearly interpolates between two hex colors by `progress` (clamped to [0, 1]).
 */
export function mixHexColors(from: string, to: string, progress: number) {
  const amount = clamp01(progress);
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  return rgbToHex({
    b: fromRgb.b + (toRgb.b - fromRgb.b) * amount,
    g: fromRgb.g + (toRgb.g - fromRgb.g) * amount,
    r: fromRgb.r + (toRgb.r - fromRgb.r) * amount
  });
}
