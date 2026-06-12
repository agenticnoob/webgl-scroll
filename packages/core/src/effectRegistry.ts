import type { WebGLEffectDefinition } from "./effectTypes";

// ---------------------------------------------------------------------------
// Effect registration
// ---------------------------------------------------------------------------

/**
 * A single function-first effect definition.
 */
export type EffectRegistration = WebGLEffectDefinition;

// ---------------------------------------------------------------------------
// Registry singleton
// ---------------------------------------------------------------------------

const registrations = new Map<string, EffectRegistration>();

/**
 * Register an effect type so the router can instantiate it when a matching
 * `data-webgl-effect` attribute is found on a trigger element.
 *
 * Throws if the same type is registered twice (prevents silent overrides).
 */
export function registerEffect(registration: EffectRegistration): void {
  if (registrations.has(registration.type)) {
    throw new Error(
      `[effectRegistry] Effect type "${registration.type}" is already registered.`
    );
  }

  registrations.set(registration.type, registration);
}

/**
 * Look up a registration by effect type name.
 * Returns `undefined` when no matching registration exists.
 */
export function resolveEffect(type: string): EffectRegistration | undefined {
  return registrations.get(type);
}

/**
 * Return all currently registered effect types.
 */
export function allEffects(): EffectRegistration[] {
  return Array.from(registrations.values());
}

/**
 * Remove all registrations. Intended for test teardown only.
 */
export function clearEffectRegistry(): void {
  registrations.clear();
}

/**
 * Apply default values from a registration's `paramSchema` to a params bag.
 * Explicit values in `params` always win over schema defaults.
 */
export function applyDefaults(
  type: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  const registration = registrations.get(type);

  if (!registration?.schema) {
    return params;
  }

  const result: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(registration.schema)) {
    if (def.default !== undefined) {
      result[key] = def.default;
    }
  }

  return { ...result, ...params };
}

/**
 * Validate and coerce a params bag against a registration's `paramSchema`.
 * - Numbers are parsed from strings when necessary.
 * - Values outside `[min, max]` are clamped.
 * - Unknown keys pass through untouched.
 */
export function validateParams(
  type: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  const registration = registrations.get(type);

  if (!registration?.schema) {
    return params;
  }

  const result = { ...params };

  for (const [key, def] of Object.entries(registration.schema)) {
    const raw = result[key];

    if (raw === undefined) {
      continue;
    }

    if (def.type === "number") {
      let value = typeof raw === "string" ? Number.parseFloat(raw) : (raw as number);

      if (Number.isNaN(value)) {
        result[key] = def.default;
        continue;
      }

      if (def.min !== undefined) {
        value = Math.max(value, def.min);
      }

      if (def.max !== undefined) {
        value = Math.min(value, def.max);
      }

      result[key] = value;
    } else if (def.type === "boolean") {
      if (typeof raw === "string") {
        result[key] = raw === "true";
      }
    }
    // strings pass through
  }

  return result;
}
