import { clamp01, progressToFade } from "./math";

// ---------------------------------------------------------------------------
// DOM-based cut types (used by legacy path and tests)
// ---------------------------------------------------------------------------

export type WeightedCutInput = {
  bottom: number;
  index: number;
  top: number;
};

export type WeightedCut<TCut extends WeightedCutInput = WeightedCutInput> = TCut & {
  fade: number;
  score: number;
};

// ---------------------------------------------------------------------------
// ScrollTrigger-based cut types
// ---------------------------------------------------------------------------

export type ScrollTriggerCut = {
  cutIndex: number;
  isActive: boolean;
  progress: number;
};

export type ActiveScrollTriggerCut = {
  cutIndex: number;
  fade: number;
  progress: number;
};

const DEFAULT_FADE_RATIO = 0.24;
const MAX_FADE_DISTANCE = 220;
const SWITCH_MARGIN = 0.08;

function smootherStep(value: number) {
  const x = clamp01(value);

  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function getCutFade(cut: Pick<WeightedCutInput, "bottom" | "top">, viewportHeight: number) {
  const fadeDistance = Math.min(viewportHeight * DEFAULT_FADE_RATIO, MAX_FADE_DISTANCE);
  const visibleTop = Math.max(cut.top, 0);
  const visibleBottom = Math.min(cut.bottom, viewportHeight);
  const visibleHeight = Math.max(visibleBottom - visibleTop, 0);

  if (visibleHeight <= 0) {
    return 0;
  }

  return smootherStep(visibleHeight / Math.max(fadeDistance, 1));
}

function getCutScore(cut: WeightedCutInput, viewportHeight: number) {
  const viewportMiddle = viewportHeight * 0.5;
  const cutMiddle = (cut.top + cut.bottom) * 0.5;
  const distance = Math.abs(cutMiddle - viewportMiddle);
  const centerWeight = 1 - clamp01(distance / Math.max(viewportHeight * 0.72, 1));

  return getCutFade(cut, viewportHeight) * centerWeight;
}

export function chooseWeightedCut<TCut extends WeightedCutInput>(
  cuts: TCut[],
  viewportHeight: number,
  previousIndex?: number
): WeightedCut<TCut> | undefined {
  const weightedCuts = cuts
    .map((cut) => ({
      ...cut,
      fade: getCutFade(cut, viewportHeight),
      score: getCutScore(cut, viewportHeight)
    }))
    .filter((cut) => cut.fade > 0);

  if (weightedCuts.length === 0) {
    return undefined;
  }

  const strongestCut = weightedCuts.reduce((best, cut) => (cut.score > best.score ? cut : best));
  const previousCut = weightedCuts.find((cut) => cut.index === previousIndex);

  if (previousCut && strongestCut.index !== previousCut.index && strongestCut.score < previousCut.score + SWITCH_MARGIN) {
    return previousCut;
  }

  return strongestCut;
}

// ---------------------------------------------------------------------------
// ScrollTrigger-based cut selection
// ---------------------------------------------------------------------------

/**
 * Selects the most visually prominent cut from ScrollTrigger snapshots.
 *
 * The fade is derived from ScrollTrigger `progress` (sine curve, peaking at
 * 0.5) instead of DOM bounding-rect measurements. Hysteresis via
 * `previousIndex` prevents rapid switching when two cuts overlap.
 */
export function chooseActiveCutFromTriggers(
  cuts: ScrollTriggerCut[],
  previousIndex?: number
): ActiveScrollTriggerCut | undefined {
  const scored = cuts
    .map((cut) => ({
      cutIndex: cut.cutIndex,
      fade: progressToFade(cut.progress),
      progress: cut.progress
    }))
    .filter((cut) => cut.fade > 0.001);

  if (scored.length === 0) {
    return undefined;
  }

  const strongest = scored.reduce((best, cut) => (cut.fade > best.fade ? cut : best));
  const previous = scored.find((cut) => cut.cutIndex === previousIndex);

  if (previous && strongest.cutIndex !== previous.cutIndex && strongest.fade < previous.fade + SWITCH_MARGIN) {
    return previous;
  }

  return strongest;
}
