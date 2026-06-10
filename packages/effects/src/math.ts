/**
 * Clamps a numeric value to the [0, 1] range.
 */
export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Frame-rate-independent exponential smoothing.
 *
 * Given a `speed` (half-life in seconds), returns the interpolation factor
 * for the elapsed `deltaTime` so that the result converges at the same rate
 * regardless of frame rate.
 *
 * Example:
 *   const alpha = smoothingAlpha(0.12, dt); // 120 ms half-life
 *   current += (target - current) * alpha;
 */
export function smoothingAlpha(halfLifeSeconds: number, deltaTime: number) {
  if (halfLifeSeconds <= 0) {
    return 1;
  }

  return 1 - Math.pow(0.5, deltaTime / halfLifeSeconds);
}

/**
 * Maps a ScrollTrigger progress value (0–1) to a fade intensity (0–1).
 *
 * Uses a sine curve so the fade peaks at progress = 0.5 (element centered
 * in viewport) and drops to 0 at the entry/exit edges.
 */
export function progressToFade(progress: number) {
  return Math.sin(clamp01(progress) * Math.PI);
}
