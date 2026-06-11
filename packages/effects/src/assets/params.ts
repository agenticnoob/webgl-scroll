import type {
  AssetAnchor,
  AssetComposite,
  AssetDescriptor,
  AssetFit,
  AssetKind,
  AssetLayerParams,
  AssetPlacement,
  AssetPlayback,
  AssetTransform,
  CompositeMode,
  ScrollTransformTuple,
  VideoPlaybackMode
} from "./types";

const ASSET_KINDS = new Set<AssetKind>(["image", "video", "glb"]);
const ANCHORS = new Set<AssetAnchor>(["element", "viewport"]);
const FITS = new Set<AssetFit>(["cover", "contain", "stretch"]);
const PLAYBACK_MODES = new Set<VideoPlaybackMode>([
  "loop-while-visible",
  "once-on-enter",
  "scroll-scrub"
]);
const COMPOSITE_MODES = new Set<CompositeMode>([
  "normal",
  "luma-mask",
  "alpha-mask",
  "multiply",
  "screen"
]);

const DEFAULT_PLACEMENT: AssetPlacement = {
  anchor: "element",
  fit: "cover",
  height: 1,
  offsetX: 0,
  offsetY: 0,
  width: 1,
  x: 0.5,
  y: 0.5
};

const DEFAULT_COMPOSITE: AssetComposite = {
  feather: 0,
  mode: "normal",
  opacity: 1,
  threshold: 0
};

export function normalizeAssetLayerParams(input: unknown): AssetLayerParams {
  const record = asRecord(input);
  const placement = normalizePlacement(record?.placement);
  const rawAssets = Array.isArray(record?.assets) ? record.assets : [];

  return {
    assets: rawAssets
      .map((asset, index) => normalizeAsset(asset, index))
      .filter((asset): asset is AssetDescriptor => asset !== null)
      .sort((a, b) => a.order - b.order),
    placement
  };
}

function normalizeAsset(input: unknown, index: number): AssetDescriptor | null {
  const record = asRecord(input);

  if (!record) {
    return null;
  }

  const id = asNonEmptyString(record?.id);
  const kind = asEnum(record?.kind, ASSET_KINDS);
  const src = asNonEmptyString(record?.src);

  if (!id || !kind || !src) {
    return null;
  }

  const opacity = asFiniteNumber(record.opacity, 1);

  return {
    composite: normalizeComposite(record.composite, opacity),
    id,
    kind,
    opacity,
    order: asFiniteNumber(record.order, index),
    placement: record.placement ? normalizePlacement(record.placement) : undefined,
    playback: kind === "video" ? normalizePlayback(record.playback) : undefined,
    src,
    transform: normalizeTransform(record.transform)
  };
}

function normalizePlacement(input: unknown): AssetPlacement {
  const record = asRecord(input);

  return {
    anchor: asEnum(record?.anchor, ANCHORS) ?? DEFAULT_PLACEMENT.anchor,
    fit: asEnum(record?.fit, FITS) ?? DEFAULT_PLACEMENT.fit,
    height: asFiniteNumber(record?.height, DEFAULT_PLACEMENT.height),
    offsetX: asFiniteNumber(record?.offsetX, DEFAULT_PLACEMENT.offsetX),
    offsetY: asFiniteNumber(record?.offsetY, DEFAULT_PLACEMENT.offsetY),
    width: asFiniteNumber(record?.width, DEFAULT_PLACEMENT.width),
    x: asFiniteNumber(record?.x, DEFAULT_PLACEMENT.x),
    y: asFiniteNumber(record?.y, DEFAULT_PLACEMENT.y)
  };
}

function normalizePlayback(input: unknown): AssetPlayback {
  const record = asRecord(input);
  const endTime = asOptionalFiniteNumber(record?.endTime);

  return {
    ...(endTime === undefined ? {} : { endTime }),
    mode: asEnum(record?.mode, PLAYBACK_MODES) ?? "loop-while-visible",
    startTime: asFiniteNumber(record?.startTime, 0)
  };
}

function normalizeComposite(input: unknown, opacity: number): AssetComposite {
  const record = asRecord(input);

  return {
    feather: asFiniteNumber(record?.feather, DEFAULT_COMPOSITE.feather),
    mode: asEnum(record?.mode, COMPOSITE_MODES) ?? DEFAULT_COMPOSITE.mode,
    opacity: asFiniteNumber(record?.opacity, opacity),
    threshold: asFiniteNumber(record?.threshold, DEFAULT_COMPOSITE.threshold)
  };
}

function normalizeTransform(input: unknown): AssetTransform | undefined {
  const record = asRecord(input);

  if (!record) {
    return undefined;
  }

  const transform: AssetTransform = {};
  const keys = ["opacity", "rotateX", "rotateY", "rotateZ", "scale"] as const;

  for (const key of keys) {
    const tuple = normalizeScrollTuple(record[key]);
    if (tuple) {
      transform[key] = tuple;
    }
  }

  return Object.keys(transform).length > 0 ? transform : undefined;
}

function normalizeScrollTuple(input: unknown): ScrollTransformTuple | undefined {
  if (!Array.isArray(input) || input.length !== 3 || input[0] !== "scroll") {
    return undefined;
  }

  const from = asOptionalFiniteNumber(input[1]);
  const to = asOptionalFiniteNumber(input[2]);

  if (from === undefined || to === undefined) {
    return undefined;
  }

  return ["scroll", from, to];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return asOptionalFiniteNumber(value) ?? fallback;
}

function asOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asEnum<T extends string>(value: unknown, values: Set<T>): T | undefined {
  return typeof value === "string" && values.has(value as T) ? (value as T) : undefined;
}
