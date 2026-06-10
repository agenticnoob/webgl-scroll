import { scanElement, type ScannedTriggerMetadata } from "./domEffectParser";
import { ScrollTrigger } from "./gsap";
import type {
  WebGLScrollTriggerRole,
  WebGLScrollTriggerSnapshot
} from "./effectTypes";
import { sharedStateTree } from "./webglStateTree";

/**
 * Declared purpose of a scroll trigger. Each role is consumed by a dedicated
 * pure-function module that reads from `webglScrollTriggerState`.
 *
 * @deprecated Use `data-webgl-effect` instead of `data-webgl-role`.
 */
export type WebGLScrollTriggerState = {
  reducedMotion: boolean;
  triggers: Record<string, WebGLScrollTriggerSnapshot>;
  version: number;
};

export type SerializedWebGLTrigger = {
  cutIndex?: number;
  effect?: string;
  end: string;
  id: string;
  role?: WebGLScrollTriggerRole;
  scene: string;
  start: string;
  trigger: string;
};

type CreateWebGLScrollTriggerBridgeOptions = {
  root?: ParentNode;
  reducedMotion?: boolean;
};

type TriggerElement = HTMLElement & {
  dataset: DOMStringMap & {
    webglCutIndex?: string;
    webglEffect?: string;
    webglEffects?: string;
    webglEnd?: string;
    webglParams?: string;
    webglRole?: string;
    webglScene?: string;
    webglStart?: string;
    webglTrigger?: string;
  };
};

export const webglScrollTriggerState: WebGLScrollTriggerState = {
  reducedMotion: false,
  triggers: {},
  version: 0
};

// ---------------------------------------------------------------------------
// Legacy helpers (backward-compatible path)
// ---------------------------------------------------------------------------

function parseRole(value: string | undefined): WebGLScrollTriggerRole | undefined {
  if (value === "cut" || value === "title") {
    return value;
  }

  return undefined;
}

function parseCutIndex(value: string | undefined): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeMetadata(element: TriggerElement, index: number): SerializedWebGLTrigger {
  const trigger = element.dataset.webglTrigger ?? "trigger";
  const scene = element.dataset.webglScene ?? `scene-${index}`;
  const role = parseRole(element.dataset.webglRole);
  const cutIndex = parseCutIndex(element.dataset.webglCutIndex);

  // Also read the new effect attribute for forward compatibility
  const effect = element.dataset.webglEffect ?? undefined;

  return {
    ...(cutIndex != null ? { cutIndex } : {}),
    ...(effect ? { effect } : {}),
    end: element.dataset.webglEnd ?? "bottom top",
    id: `${scene}:${trigger}:${index}`,
    ...(role ? { role } : {}),
    scene,
    start: element.dataset.webglStart ?? "top bottom",
    trigger
  };
}

// ---------------------------------------------------------------------------
// Expanded snapshot writer (multi-effect support)
// ---------------------------------------------------------------------------

/**
 * Write one snapshot per effect descriptor. Each gets a unique ID:
 *   `${baseId}:${effectType}:${effectIndex}`
 *
 * For single-effect triggers from the legacy role path, the old ID format
 * (without effect suffix) is preserved for backward compatibility.
 */
function writeExpandedSnapshots(
  metadata: ScannedTriggerMetadata,
  progress: number,
  isActive: boolean,
  isLegacyRole: boolean
) {
  const { effects } = metadata;

  if (effects.length === 0) {
    // No effects declared — write a single snapshot with the base ID
    const snapshot: WebGLScrollTriggerSnapshot = {
      end: metadata.end,
      id: metadata.id,
      isActive,
      progress,
      scene: metadata.scene,
      start: metadata.start,
      trigger: metadata.trigger
    };
    webglScrollTriggerState.triggers[metadata.id] = snapshot;
    webglScrollTriggerState.version += 1;
    sharedStateTree.set(metadata.id, snapshot);

    return;
  }

  for (let i = 0; i < effects.length; i++) {
    const desc = effects[i];
    // Legacy single-effect: keep old ID format; new/multi: append effect suffix
    const effectId =
      isLegacyRole && effects.length === 1
        ? metadata.id
        : `${metadata.id}:${desc.type}:${i}`;

    const cutIndex =
      typeof desc.params.cutIndex === "number"
        ? desc.params.cutIndex
        : undefined;

    const snapshot: WebGLScrollTriggerSnapshot = {
      ...(cutIndex != null ? { cutIndex } : {}),
      effect: desc.type,
      end: metadata.end,
      id: effectId,
      isActive,
      progress,
      scene: metadata.scene,
      start: metadata.start,
      trigger: metadata.trigger
    };

    webglScrollTriggerState.triggers[effectId] = snapshot;
    webglScrollTriggerState.version += 1;
    sharedStateTree.set(effectId, snapshot);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan all `[data-webgl-trigger]` elements and return structured metadata
 * with resolved effect descriptors and merged params.
 */
export { scanTriggerElements } from "./domEffectParser";

/**
 * Legacy serialization — returns flat `SerializedWebGLTrigger[]` for
 * backward compatibility. New code should prefer `scanTriggerElements()`.
 */
export function serializeWebGLTriggerMetadata(root: ParentNode = document): SerializedWebGLTrigger[] {
  return Array.from(root.querySelectorAll<TriggerElement>("[data-webgl-trigger]")).map(normalizeMetadata);
}

export function resetWebGLScrollTriggerState() {
  webglScrollTriggerState.reducedMotion = false;
  webglScrollTriggerState.triggers = {};
  webglScrollTriggerState.version += 1;
  sharedStateTree.reset();
}

export function createWebGLScrollTriggerBridge({
  root = document,
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
}: CreateWebGLScrollTriggerBridgeOptions = {}) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-webgl-trigger]"));
  const triggers: ScrollTrigger[] = [];

  resetWebGLScrollTriggerState();
  webglScrollTriggerState.reducedMotion = reducedMotion;
  sharedStateTree.reducedMotion = reducedMotion;

  elements.forEach((element, index) => {
    const scannedMeta = scanElement(element, index);

    // Determine if this element uses the legacy role convention
    const isLegacyRole =
      scannedMeta.effects.length > 0 &&
      element.dataset.webglEffect == null &&
      element.dataset.webglEffects == null &&
      element.dataset.webglRole != null;

    // Register element and params in the state tree for each effect
    for (let i = 0; i < scannedMeta.effects.length; i++) {
      const desc = scannedMeta.effects[i];
      const effectId =
        isLegacyRole && scannedMeta.effects.length === 1
          ? scannedMeta.id
          : `${scannedMeta.id}:${desc.type}:${i}`;

      sharedStateTree.registerElement(effectId, element, desc.params);
    }

    // If no effects were declared, still register the base element
    if (scannedMeta.effects.length === 0) {
      sharedStateTree.registerElement(scannedMeta.id, element, {});
    }

    if (reducedMotion) {
      writeExpandedSnapshots(scannedMeta, 1, false, isLegacyRole);
      return;
    }

    writeExpandedSnapshots(scannedMeta, 0, false, isLegacyRole);
    triggers.push(
      ScrollTrigger.create({
        end: scannedMeta.end,
        id: scannedMeta.id,
        onRefresh: (self) => {
          writeExpandedSnapshots(scannedMeta, self.progress, self.isActive, isLegacyRole);
        },
        onToggle: (self) => {
          writeExpandedSnapshots(scannedMeta, self.progress, self.isActive, isLegacyRole);
        },
        onUpdate: (self) => {
          writeExpandedSnapshots(scannedMeta, self.progress, self.isActive, isLegacyRole);
        },
        start: scannedMeta.start,
        trigger: element
      })
    );
  });

  if (!reducedMotion) {
    ScrollTrigger.refresh();
  }

  return () => {
    triggers.forEach((trigger) => {
      trigger.kill();
    });
    resetWebGLScrollTriggerState();
  };
}
