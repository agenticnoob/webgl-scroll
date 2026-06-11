import type { ObjectAutoRotateAxis, ObjectTransform } from "./types";

const AUTO_ROTATE_AXES = new Set<ObjectAutoRotateAxis>(["x", "y", "z"]);

export function normalizeObjectTransform(input: unknown): ObjectTransform {
  const record = asRecord(input);
  const rotation = asRecord(record?.rotation);
  const autoRotate = asRecord(record?.autoRotate);
  const axis = asEnum(autoRotate?.axis, AUTO_ROTATE_AXES);
  const speed = asOptionalFiniteNumber(autoRotate?.speed);

  return {
    ...(axis && speed !== undefined ? { autoRotate: { axis, speed } } : {}),
    rotation: {
      x: asFiniteNumber(rotation?.x, 0),
      y: asFiniteNumber(rotation?.y, 0),
      z: asFiniteNumber(rotation?.z, 0)
    },
    scale: asPositiveNumber(record?.scale, 1)
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return asOptionalFiniteNumber(value) ?? fallback;
}

function asOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  const number = asOptionalFiniteNumber(value);

  return number !== undefined && number > 0 ? number : fallback;
}

function asEnum<T extends string>(value: unknown, values: Set<T>): T | undefined {
  return typeof value === "string" && values.has(value as T) ? (value as T) : undefined;
}
