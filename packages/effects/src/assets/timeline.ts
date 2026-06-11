import type { AssetTransform, ScrollTransformTuple } from "./types";

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function mapScrollToTime(options: {
  progress: number;
  startTime: number;
  endTime: number;
}): number {
  const progress = clamp01(options.progress);
  return options.startTime + (options.endTime - options.startTime) * progress;
}

export function evaluateScrollTuple(tuple: ScrollTransformTuple, progress: number): number {
  const [, from, to] = tuple;
  return from + (to - from) * clamp01(progress);
}

export function evaluateAssetOpacity(options: {
  opacity: number;
  progress: number;
  transform?: AssetTransform;
}): number {
  if (!options.transform?.opacity) {
    return options.opacity;
  }

  return evaluateScrollTuple(options.transform.opacity, options.progress);
}
