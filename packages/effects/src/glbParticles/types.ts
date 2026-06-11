import type { AssetAnchor, AssetFit, AssetPlacement } from "../assets/types";

const ANCHORS = new Set<AssetAnchor>(["element", "viewport"]);
const FITS = new Set<AssetFit>(["cover", "contain", "stretch"]);

export type GlbParticlesParams = {
  color: string;
  damping: number;
  particleTextureSize: number;
  placement: AssetPlacement;
  pointSize: number;
  pointerRadius: number;
  returnForce: number;
  scatterForce: number;
  src: string;
};

export function normalizeGlbParticlesParams(input: unknown): GlbParticlesParams {
  const record = asRecord(input);

  return {
    color: asString(record?.color, "#ffffff"),
    damping: asFiniteNumber(record?.damping, 0.92),
    particleTextureSize: normalizeTextureSize(record?.particleTextureSize),
    placement: normalizePlacement(record?.placement),
    pointSize: asFiniteNumber(record?.pointSize, 2),
    pointerRadius: asFiniteNumber(record?.pointerRadius, 0.18),
    returnForce: asFiniteNumber(record?.returnForce, 0.9),
    scatterForce: asFiniteNumber(record?.scatterForce, 1.4),
    src: asString(record?.src, "")
  };
}

function normalizePlacement(input: unknown): AssetPlacement {
  const record = asRecord(input);

  return {
    anchor: asEnum(record?.anchor, ANCHORS) ?? "element",
    fit: asEnum(record?.fit, FITS) ?? "contain",
    height: asFiniteNumber(record?.height, 1),
    offsetX: asFiniteNumber(record?.offsetX, 0),
    offsetY: asFiniteNumber(record?.offsetY, 0),
    width: asFiniteNumber(record?.width, 1),
    x: asFiniteNumber(record?.x, 0.5),
    y: asFiniteNumber(record?.y, 0.5)
  };
}

function normalizeTextureSize(input: unknown): number {
  const value = asFiniteNumber(input, 32);
  const clamped = Math.min(Math.max(value, 32), 512);
  const powers = [32, 64, 128, 256, 512];

  return powers.reduce((nearest, current) =>
    Math.abs(current - clamped) < Math.abs(nearest - clamped) ? current : nearest
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asEnum<T extends string>(value: unknown, values: Set<T>): T | undefined {
  return typeof value === "string" && values.has(value as T) ? (value as T) : undefined;
}
