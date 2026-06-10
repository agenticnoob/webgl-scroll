import { roleToEffect } from "./effectTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single effect descriptor extracted from DOM attributes.
 * Corresponds to one visual effect that the engine should instantiate.
 */
export type EffectDescriptor = {
  /** Effect type name matching a registered WebGLEffect (e.g. "fade-title"). */
  type: string;
  /** Optional rendering layer hint. */
  layer?: "background" | "content" | "overlay";
  /** Merged parameters from all sources. */
  params: Record<string, unknown>;
};

/**
 * Structured metadata produced by the DOM scanner for a single
 * `[data-webgl-trigger]` element. May contain multiple effect descriptors.
 */
export type ScannedTriggerMetadata = {
  /** One or more effect descriptors declared on this element. */
  effects: EffectDescriptor[];
  /** ScrollTrigger end expression. */
  end: string;
  /** Unique identifier: `${scene}:${trigger}:${index}` */
  id: string;
  /** Scene grouping key. */
  scene: string;
  /** ScrollTrigger start expression. */
  start: string;
  /** Trigger name from `data-webgl-trigger`. */
  trigger: string;
};

// ---------------------------------------------------------------------------
// Effect descriptor parsing
// ---------------------------------------------------------------------------

/**
 * Extract effect descriptors from a DOM element.
 *
 * Priority:
 *   1. `data-webgl-effects` (JSON array) — multi-effect
 *   2. `data-webgl-effect` (string) — single-effect shorthand
 *   3. `data-webgl-role` (legacy) — mapped via `roleToEffect()`
 *
 * Returns an empty array when no effect is declared.
 */
export function parseEffectDescriptors(element: HTMLElement): EffectDescriptor[] {
  const { dataset } = element;

  // Priority 1: multi-effect JSON
  const effectsJson = dataset.webglEffects;

  if (effectsJson != null && effectsJson !== "") {
    try {
      const parsed = JSON.parse(effectsJson) as Array<Record<string, unknown>>;

      if (Array.isArray(parsed)) {
        return parsed.map((entry) => ({
          type: String(entry.type ?? "unknown"),
          ...(entry.layer != null ? { layer: entry.layer as EffectDescriptor["layer"] } : {}),
          params: (entry.params as Record<string, unknown>) ?? {}
        }));
      }
    } catch {
      // Invalid JSON — fall through to next priority
    }
  }

  // Priority 2: single-effect shorthand
  const singleEffect = dataset.webglEffect;

  if (singleEffect != null && singleEffect !== "") {
    return [{ type: singleEffect, params: {} }];
  }

  // Priority 3: legacy role mapping
  const role = dataset.webglRole;

  if (role != null && role !== "") {
    const mapped = roleToEffect(role);

    if (mapped) {
      return [{ type: mapped, params: {} }];
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Parameter parsing
// ---------------------------------------------------------------------------

/**
 * Parse `data-webgl-params` JSON object from the element.
 * Returns `{}` on missing or invalid JSON.
 */
export function parseJsonParams(element: HTMLElement): Record<string, unknown> {
  const raw = element.dataset.webglParams;

  if (raw == null || raw === "") {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Extract flattened `data-webgl-effect-*` attributes from the element's
 * dataset. The `webglEffect` and `webglEffects` keys themselves are excluded.
 *
 * DOM `dataset` auto-camelCases attributes:
 *   `data-webgl-effect-strength` → `dataset.webglEffectStrength`
 *   `data-webgl-effect-wave-length` → `dataset.webglEffectWaveLength`
 *
 * We strip the `webglEffect` prefix and lowercase the first character to
 * recover the parameter name.
 */
export function parseFlattenedParams(element: HTMLElement): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const prefix = "webglEffect";

  for (const key of Object.keys(element.dataset)) {
    if (key === "webglEffect" || key === "webglEffects" || !key.startsWith(prefix)) {
      continue;
    }

    // Strip prefix and lowercase first char: "webglEffectStrength" → "strength"
    const raw = key.slice(prefix.length);

    if (raw.length === 0) {
      continue;
    }

    const paramName = raw[0].toLowerCase() + raw.slice(1);
    result[paramName] = element.dataset[key];
  }

  return result;
}

/**
 * Merge parameters from three sources with strict priority:
 *   flattened (`data-webgl-effect-*`) > descriptor params > json params
 */
export function mergeParams(
  jsonParams: Record<string, unknown>,
  descriptorParams: Record<string, unknown>,
  flattenedParams: Record<string, unknown>
): Record<string, unknown> {
  return { ...jsonParams, ...descriptorParams, ...flattenedParams };
}

/**
 * Legacy: read `data-webgl-cut-index` and return as a params object.
 * Only used when the element uses the old `data-webgl-role` convention.
 */
export function parseLegacyParams(element: HTMLElement): Record<string, unknown> {
  const raw = element.dataset.webglCutIndex;

  if (raw == null || raw === "") {
    return {};
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isNaN(parsed) ? {} : { cutIndex: parsed };
}

// ---------------------------------------------------------------------------
// Full element scan
// ---------------------------------------------------------------------------

/**
 * Scan a single `[data-webgl-trigger]` element and produce structured
 * metadata with fully-resolved effect descriptors and merged params.
 */
export function scanElement(element: HTMLElement, index: number): ScannedTriggerMetadata {
  const trigger = element.dataset.webglTrigger ?? "trigger";
  const scene = element.dataset.webglScene ?? `scene-${index}`;
  const start = element.dataset.webglStart ?? "top bottom";
  const end = element.dataset.webglEnd ?? "bottom top";

  const descriptors = parseEffectDescriptors(element);
  const jsonParams = parseJsonParams(element);
  const flattenedParams = parseFlattenedParams(element);

  // Determine if we came through the legacy role path
  const isLegacyRole =
    descriptors.length > 0 &&
    element.dataset.webglEffect == null &&
    element.dataset.webglEffects == null &&
    element.dataset.webglRole != null;

  const legacyParams = isLegacyRole ? parseLegacyParams(element) : {};

  const effects: EffectDescriptor[] = descriptors.map((desc) => ({
    ...desc,
    params: mergeParams(
      { ...jsonParams, ...legacyParams },
      desc.params,
      flattenedParams
    )
  }));

  return {
    effects,
    end,
    id: `${scene}:${trigger}:${index}`,
    scene,
    start,
    trigger
  };
}

/**
 * Scan all `[data-webgl-trigger]` elements under the given root and return
 * structured metadata for each.
 */
export function scanTriggerElements(root: ParentNode = document): ScannedTriggerMetadata[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-webgl-trigger]")).map(scanElement);
}
