import { afterEach, describe, expect, it } from "vitest";

import {
  mergeParams,
  parseEffectDescriptors,
  parseFlattenedParams,
  parseJsonParams,
  parseLegacyParams,
  scanElement,
  scanTriggerElements
} from "./domEffectParser";

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// parseEffectDescriptors
// ---------------------------------------------------------------------------

describe("parseEffectDescriptors", () => {
  it("reads data-webgl-effect as single-effect shorthand", () => {
    const el = document.createElement("div");
    el.dataset.webglEffect = "fade-title";

    expect(parseEffectDescriptors(el)).toEqual([
      { type: "fade-title", params: {} }
    ]);
  });

  it("reads data-webgl-effects as multi-effect JSON", () => {
    const el = document.createElement("section");
    el.dataset.webglEffects = JSON.stringify([
      { type: "fade-title", layer: "content" },
      { type: "dissolve", params: { strength: 0.5 } }
    ]);

    const result = parseEffectDescriptors(el);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "fade-title", layer: "content", params: {} });
    expect(result[1]).toEqual({ type: "dissolve", params: { strength: 0.5 } });
  });

  it("prioritizes data-webgl-effects over data-webgl-effect", () => {
    const el = document.createElement("div");
    el.dataset.webglEffect = "fade-title";
    el.dataset.webglEffects = JSON.stringify([{ type: "dissolve" }]);

    expect(parseEffectDescriptors(el)).toEqual([
      { type: "dissolve", params: {} }
    ]);
  });

  it("falls back to data-webgl-role='cut' → pixelated-wipe", () => {
    const el = document.createElement("div");
    el.dataset.webglRole = "cut";

    expect(parseEffectDescriptors(el)).toEqual([
      { type: "pixelated-wipe", params: {} }
    ]);
  });

  it("falls back to data-webgl-role='title' → fade-title", () => {
    const el = document.createElement("div");
    el.dataset.webglRole = "title";

    expect(parseEffectDescriptors(el)).toEqual([
      { type: "fade-title", params: {} }
    ]);
  });

  it("returns empty array when no effect or role is declared", () => {
    const el = document.createElement("div");

    expect(parseEffectDescriptors(el)).toEqual([]);
  });

  it("returns empty array for invalid data-webgl-effects JSON", () => {
    const el = document.createElement("div");
    el.dataset.webglEffects = "not-json";

    expect(parseEffectDescriptors(el)).toEqual([]);
  });

  it("returns empty array for empty data-webgl-effect string", () => {
    const el = document.createElement("div");
    el.dataset.webglEffect = "";

    expect(parseEffectDescriptors(el)).toEqual([]);
  });

  it("falls through to data-webgl-effect when data-webgl-effects is invalid JSON", () => {
    const el = document.createElement("div");
    el.dataset.webglEffects = "{bad";
    el.dataset.webglEffect = "fade-title";

    expect(parseEffectDescriptors(el)).toEqual([
      { type: "fade-title", params: {} }
    ]);
  });
});

// ---------------------------------------------------------------------------
// parseJsonParams
// ---------------------------------------------------------------------------

describe("parseJsonParams", () => {
  it("parses valid JSON params", () => {
    const el = document.createElement("div");
    el.dataset.webglParams = JSON.stringify({ strength: 0.74, font: "bold 120px sans-serif" });

    expect(parseJsonParams(el)).toEqual({ strength: 0.74, font: "bold 120px sans-serif" });
  });

  it("returns empty object when attribute is missing", () => {
    const el = document.createElement("div");

    expect(parseJsonParams(el)).toEqual({});
  });

  it("returns empty object for invalid JSON", () => {
    const el = document.createElement("div");
    el.dataset.webglParams = "not-json";

    expect(parseJsonParams(el)).toEqual({});
  });

  it("returns empty object for JSON array", () => {
    const el = document.createElement("div");
    el.dataset.webglParams = "[1,2,3]";

    expect(parseJsonParams(el)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseFlattenedParams
// ---------------------------------------------------------------------------

describe("parseFlattenedParams", () => {
  it("extracts data-webgl-effect-* attributes as params", () => {
    const el = document.createElement("div");
    el.setAttribute("data-webgl-effect-strength", "0.74");

    const result = parseFlattenedParams(el);

    expect(result).toEqual({ strength: "0.74" });
  });

  it("converts multi-segment kebab-case to camelCase", () => {
    const el = document.createElement("div");
    el.setAttribute("data-webgl-effect-wave-length", "0.5");

    // dataset converts data-webgl-effect-wave-length → webglEffectWaveLength
    // Our parser strips "webglEffect" prefix → "WaveLength" → lowercase first → "waveLength"
    const result = parseFlattenedParams(el);

    expect(result).toEqual({ waveLength: "0.5" });
  });

  it("excludes webglEffect and webglEffects keys", () => {
    const el = document.createElement("div");
    el.dataset.webglEffect = "fade-title";
    el.dataset.webglEffects = "[]";
    el.setAttribute("data-webgl-effect-strength", "0.5");

    const result = parseFlattenedParams(el);

    expect(result).toEqual({ strength: "0.5" });
    expect(result).not.toHaveProperty("effect");
    expect(result).not.toHaveProperty("effects");
  });

  it("returns empty object when no flattened params exist", () => {
    const el = document.createElement("div");
    el.dataset.webglTrigger = "hero";

    expect(parseFlattenedParams(el)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// mergeParams
// ---------------------------------------------------------------------------

describe("mergeParams", () => {
  it("applies correct priority: flattened > descriptor > json", () => {
    const json = { a: 1, b: 2, c: 3 };
    const descriptor = { b: 20, c: 30 };
    const flattened = { c: 300 };

    expect(mergeParams(json, descriptor, flattened)).toEqual({
      a: 1,
      b: 20,
      c: 300
    });
  });

  it("handles empty sources", () => {
    expect(mergeParams({}, {}, {})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseLegacyParams
// ---------------------------------------------------------------------------

describe("parseLegacyParams", () => {
  it("reads data-webgl-cut-index as cutIndex number", () => {
    const el = document.createElement("div");
    el.dataset.webglCutIndex = "3";

    expect(parseLegacyParams(el)).toEqual({ cutIndex: 3 });
  });

  it("returns empty object when cut-index is missing", () => {
    const el = document.createElement("div");

    expect(parseLegacyParams(el)).toEqual({});
  });

  it("returns empty object for non-numeric cut-index", () => {
    const el = document.createElement("div");
    el.dataset.webglCutIndex = "abc";

    expect(parseLegacyParams(el)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// scanElement
// ---------------------------------------------------------------------------

describe("scanElement", () => {
  it("produces ScannedTriggerMetadata with merged params", () => {
    const el = document.createElement("section");
    el.dataset.webglTrigger = "hero";
    el.dataset.webglScene = "intro";
    el.dataset.webglStart = "top 70%";
    el.dataset.webglEnd = "bottom 30%";
    el.dataset.webglEffect = "fade-title";

    const result = scanElement(el, 0);

    expect(result).toEqual({
      effects: [{ type: "fade-title", params: {} }],
      end: "bottom 30%",
      id: "intro:hero:0",
      scene: "intro",
      start: "top 70%",
      trigger: "hero"
    });
  });

  it("merges jsonParams + descriptor params + flattened params", () => {
    const el = document.createElement("div");
    el.dataset.webglTrigger = "hero";
    el.dataset.webglEffects = JSON.stringify([
      { type: "fade-title", params: { opacity: 0.8 } }
    ]);
    el.dataset.webglParams = JSON.stringify({ strength: 0.5, opacity: 0.6 });
    el.setAttribute("data-webgl-effect-strength", "0.9");

    const result = scanElement(el, 0);

    // flattened(strength=0.9) > descriptor(opacity=0.8) > json(strength=0.5, opacity=0.6)
    expect(result.effects[0].params).toEqual({
      opacity: 0.8,
      strength: "0.9"
    });
  });

  it("handles legacy role path with cut-index", () => {
    const el = document.createElement("div");
    el.dataset.webglTrigger = "cut-0";
    el.dataset.webglRole = "cut";
    el.dataset.webglCutIndex = "2";

    const result = scanElement(el, 1);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0].type).toBe("pixelated-wipe");
    expect(result.effects[0].params).toEqual({ cutIndex: 2 });
  });

  it("handles element with no effects declared", () => {
    const el = document.createElement("div");
    el.dataset.webglTrigger = "plain";

    const result = scanElement(el, 0);

    expect(result.effects).toEqual([]);
    expect(result.id).toBe("scene-0:plain:0");
  });
});

// ---------------------------------------------------------------------------
// scanTriggerElements
// ---------------------------------------------------------------------------

describe("scanTriggerElements", () => {
  it("scans all trigger elements under root", () => {
    document.body.innerHTML = `
      <section data-webgl-trigger="hero" data-webgl-effect="fade-title" data-webgl-scene="intro"></section>
      <div data-webgl-trigger="cut-0" data-webgl-effect="pixelated-wipe" data-webgl-scene="intro-to-main"></div>
    `;

    const result = scanTriggerElements(document.body);

    expect(result).toHaveLength(2);
    expect(result[0].effects[0].type).toBe("fade-title");
    expect(result[1].effects[0].type).toBe("pixelated-wipe");
  });

  it("handles multi-effect triggers", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="stacked"
        data-webgl-scene="demo"
        data-webgl-effects='[{"type":"fade-title","layer":"content"},{"type":"dissolve","layer":"overlay","params":{"opacity":0.28}}]'
      ></section>
    `;

    const result = scanTriggerElements(document.body);

    expect(result).toHaveLength(1);
    expect(result[0].effects).toHaveLength(2);
    expect(result[0].effects[0].type).toBe("fade-title");
    expect(result[0].effects[1].type).toBe("dissolve");
    expect(result[0].effects[1].params).toEqual({ opacity: 0.28 });
  });
});
