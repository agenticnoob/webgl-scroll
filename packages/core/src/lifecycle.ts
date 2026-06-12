export type LifecyclePhase = "idle" | "preloading" | "ready" | "active" | "suspended" | "disposed";

export type LifecycleMargin = number | `${number}px` | `${number}vh` | `${number}vw` | `${number}%`;

export type WebGLEffectLifecycleConfig = {
  preloadMargin: LifecycleMargin;
  suspendMargin: LifecycleMargin;
  unloadMargin: LifecycleMargin;
  minIdleMs: number;
  maxConcurrentPreloads: number;
};

export type WebGLEffectLifecycleInput = Partial<WebGLEffectLifecycleConfig>;

export type LifecycleViewport = {
  height: number;
  width: number;
};

export type LifecycleRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export type WebGLEffectLifecycleSnapshot = {
  distancePx: number;
  idleMs: number;
  isWithinPreload: boolean;
  isWithinSuspend: boolean;
  isWithinUnload: boolean;
  phase: LifecyclePhase;
};

export const DEFAULT_WEBGL_EFFECT_LIFECYCLE: WebGLEffectLifecycleConfig = {
  maxConcurrentPreloads: 2,
  minIdleMs: 5000,
  preloadMargin: "100vh",
  suspendMargin: "100vh",
  unloadMargin: "250vh"
};

export function normalizeLifecycleConfig(
  globalConfig: WebGLEffectLifecycleInput = {},
  triggerConfig: WebGLEffectLifecycleInput = {},
  effectConfig: WebGLEffectLifecycleInput = {}
): WebGLEffectLifecycleConfig {
  const merged = {
    ...DEFAULT_WEBGL_EFFECT_LIFECYCLE,
    ...globalConfig,
    ...triggerConfig,
    ...effectConfig
  };

  return {
    maxConcurrentPreloads: normalizeNonNegativeInteger(
      merged.maxConcurrentPreloads,
      DEFAULT_WEBGL_EFFECT_LIFECYCLE.maxConcurrentPreloads
    ),
    minIdleMs: normalizeNonNegativeNumber(merged.minIdleMs, DEFAULT_WEBGL_EFFECT_LIFECYCLE.minIdleMs),
    preloadMargin: normalizeMargin(merged.preloadMargin, DEFAULT_WEBGL_EFFECT_LIFECYCLE.preloadMargin),
    suspendMargin: normalizeMargin(merged.suspendMargin, DEFAULT_WEBGL_EFFECT_LIFECYCLE.suspendMargin),
    unloadMargin: normalizeMargin(merged.unloadMargin, DEFAULT_WEBGL_EFFECT_LIFECYCLE.unloadMargin)
  };
}

export function parseLifecycleMargin(margin: LifecycleMargin, viewport: LifecycleViewport): number {
  if (typeof margin === "number") {
    return Math.max(margin, 0);
  }

  const match = margin.trim().match(/^(-?\d+(?:\.\d+)?)(px|vh|vw|%)$/);
  if (!match) {
    return 0;
  }

  const value = Math.max(Number.parseFloat(match[1]), 0);
  const unit = match[2];

  switch (unit) {
    case "px":
      return value;
    case "vh":
      return (viewport.height * value) / 100;
    case "vw":
      return (viewport.width * value) / 100;
    case "%":
      return (viewport.height * value) / 100;
  }

  return 0;
}

export function computeElementViewportDistance(rect: LifecycleRect, viewport: LifecycleViewport): number {
  if (rect.bottom < 0) {
    return Math.abs(rect.bottom);
  }

  if (rect.top > viewport.height) {
    return rect.top - viewport.height;
  }

  return 0;
}

export function isWithinLifecycleMargin(
  distancePx: number,
  margin: LifecycleMargin,
  viewport: LifecycleViewport
): boolean {
  return distancePx <= parseLifecycleMargin(margin, viewport);
}

function normalizeMargin(value: unknown, fallback: LifecycleMargin): LifecycleMargin {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+(?:\.\d+)?(?:px|vh|vw|%)$/.test(value.trim())) {
    return value as LifecycleMargin;
  }

  return fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}
