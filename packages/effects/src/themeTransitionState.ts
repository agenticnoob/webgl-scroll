import { clamp01 } from "./math";
import { mixHexColors } from "./color";

export type ThemeSection = {
  accent: string;
  bg: string;
  fg: string;
  title?: string;
};

export type ThemeCutBounds = {
  bottom: number;
  top: number;
};

export type ThemeTransitionState<TSection extends ThemeSection = ThemeSection> = {
  currentIndex: number;
  from: TSection;
  nextIndex: number;
  progress: number;
  to: TSection;
};

export type ThemeTransitionStateOptions<TSection extends ThemeSection = ThemeSection> = {
  cuts: ThemeCutBounds[];
  scrollY: number;
  sections: TSection[];
};

export type ActiveThemeTokens = {
  accent: string;
  bg: string;
  fg: string;
};

export { mixHexColors as mixHexColor };

export function getActiveThemeTokens<TSection extends ThemeSection>({
  from,
  progress,
  to
}: ThemeTransitionState<TSection>): ActiveThemeTokens {
  return {
    accent: mixHexColors(from.accent, to.accent, progress),
    bg: mixHexColors(from.bg, to.bg, progress),
    fg: mixHexColors(from.fg, to.fg, progress)
  };
}

export function getThemeTransitionState<TSection extends ThemeSection>({
  cuts,
  scrollY,
  sections
}: ThemeTransitionStateOptions<TSection>): ThemeTransitionState<TSection> {
  if (sections.length === 0) {
    throw new Error("getThemeTransitionState requires at least one section");
  }

  for (let index = 0; index < cuts.length; index += 1) {
    const cut = cuts[index];
    const from = sections[index] ?? sections[sections.length - 1];
    const to = sections[index + 1] ?? from;
    const start = Math.min(cut.top, cut.bottom);
    const end = Math.max(cut.top, cut.bottom);

    if (scrollY < start) {
      return {
        currentIndex: index,
        from,
        nextIndex: Math.min(index + 1, sections.length - 1),
        progress: 0,
        to
      };
    }

    if (scrollY <= end) {
      return {
        currentIndex: index,
        from,
        nextIndex: Math.min(index + 1, sections.length - 1),
        progress: (scrollY - start) / Math.max(end - start, 1),
        to
      };
    }
  }

  const lastIndex = sections.length - 1;
  const last = sections[lastIndex];

  return {
    currentIndex: lastIndex,
    from: last,
    nextIndex: lastIndex,
    progress: 1,
    to: last
  };
}

// ---------------------------------------------------------------------------
// ScrollTrigger-based theme transition
// ---------------------------------------------------------------------------

export type ThemeTriggerCut = {
  cutIndex: number;
  progress: number;
};

export type ThemeTransitionFromTriggersOptions<TSection extends ThemeSection = ThemeSection> = {
  cuts: ThemeTriggerCut[];
  sections: TSection[];
};

/**
 * Derives theme transition state from ScrollTrigger cut snapshots.
 *
 * Each cut trigger's `progress` (0–1) maps directly to the transition
 * progress between `sections[cutIndex]` and `sections[cutIndex + 1]`.
 * This eliminates per-frame DOM measurements in favor of ScrollTrigger's
 * internally cached bounds.
 */
export function getThemeTransitionFromTriggers<TSection extends ThemeSection>({
  cuts,
  sections
}: ThemeTransitionFromTriggersOptions<TSection>): ThemeTransitionState<TSection> {
  if (sections.length === 0) {
    throw new Error("getThemeTransitionFromTriggers requires at least one section");
  }

  const sorted = [...cuts].sort((a, b) => a.cutIndex - b.cutIndex);

  for (const cut of sorted) {
    const index = cut.cutIndex;
    const from = sections[index] ?? sections[sections.length - 1];
    const to = sections[index + 1] ?? from;
    const progress = clamp01(cut.progress);

    if (progress > 0 && progress < 1) {
      return {
        currentIndex: index,
        from,
        nextIndex: Math.min(index + 1, sections.length - 1),
        progress,
        to
      };
    }

    if (progress >= 1) {
      continue;
    }

    return {
      currentIndex: index,
      from,
      nextIndex: Math.min(index + 1, sections.length - 1),
      progress: 0,
      to
    };
  }

  const lastCompletedIndex = sorted.length > 0
    ? Math.min(sorted[sorted.length - 1].cutIndex + 1, sections.length - 1)
    : 0;
  const lastSection = sections[lastCompletedIndex] ?? sections[sections.length - 1];

  return {
    currentIndex: lastCompletedIndex,
    from: lastSection,
    nextIndex: lastCompletedIndex,
    progress: 1,
    to: lastSection
  };
}
