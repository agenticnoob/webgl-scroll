import { afterEach, describe, expect, it } from "vitest";

import {
  allEffects,
  applyDefaults,
  clearEffectRegistry,
  registerEffect,
  resolveEffect,
  validateParams
} from "./effectRegistry";

class StubEffect {
  readonly type = "stub";
  create(_context?: unknown): void {}
  update(): void {}
  dispose(): void {}
}

afterEach(() => {
  clearEffectRegistry();
});

describe("registerEffect", () => {
  it("registers and resolves an effect by type", () => {
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" });

    const resolved = resolveEffect("stub");

    expect(resolved).toBeDefined();
    expect(resolved?.type).toBe("stub");
    expect(typeof resolved?.create).toBe("function");
  });

  it("throws when registering a duplicate type", () => {
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" });

    expect(() => registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" })).toThrow(
      'Effect type "stub" is already registered.'
    );
  });

  it("can explicitly ignore duplicate registrations", () => {
    const first = { create: (context?: unknown) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" };
    const second = { create: (context?: unknown) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" };

    registerEffect(first);
    registerEffect(second, { onDuplicate: "ignore" });

    expect(resolveEffect("stub")).toBe(first);
  });

  it("returns undefined for unregistered types", () => {
    expect(resolveEffect("nonexistent")).toBeUndefined();
  });
});

describe("allEffects", () => {
  it("returns all registered effects", () => {
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "a" });
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "b" });

    const all = allEffects();

    expect(all).toHaveLength(2);
    expect(all.map((e) => e.type)).toEqual(["a", "b"]);
  });

  it("returns empty array when nothing is registered", () => {
    expect(allEffects()).toEqual([]);
  });
});

describe("clearEffectRegistry", () => {
  it("removes all registrations", () => {
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" });
    clearEffectRegistry();

    expect(resolveEffect("stub")).toBeUndefined();
    expect(allEffects()).toEqual([]);
  });
});

describe("applyDefaults", () => {
  it("fills in defaults from paramSchema", () => {
    registerEffect({
      create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; },
      schema: {
        opacity: { default: 0.8, type: "number" },
        strength: { default: 1.0, type: "number" }
      },
      type: "stub"
    });

    const result = applyDefaults("stub", { strength: 0.5 });

    expect(result).toEqual({ opacity: 0.8, strength: 0.5 });
  });

  it("returns params as-is when no schema exists", () => {
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" });

    const params = { foo: "bar" };

    expect(applyDefaults("stub", params)).toEqual(params);
  });

  it("returns params as-is for unregistered types", () => {
    const params = { foo: "bar" };

    expect(applyDefaults("unknown", params)).toEqual(params);
  });
});

describe("validateParams", () => {
  it("clamps numbers within min/max", () => {
    registerEffect({
      create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; },
      schema: {
        strength: { default: 0.5, max: 1.0, min: 0.1, type: "number" }
      },
      type: "stub"
    });

    expect(validateParams("stub", { strength: 2.0 })).toEqual({ strength: 1.0 });
    expect(validateParams("stub", { strength: -1.0 })).toEqual({ strength: 0.1 });
    expect(validateParams("stub", { strength: 0.5 })).toEqual({ strength: 0.5 });
  });

  it("parses string numbers", () => {
    registerEffect({
      create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; },
      schema: {
        strength: { default: 0.5, type: "number" }
      },
      type: "stub"
    });

    expect(validateParams("stub", { strength: "0.75" })).toEqual({ strength: 0.75 });
  });

  it("falls back to default for NaN number strings", () => {
    registerEffect({
      create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; },
      schema: {
        strength: { default: 0.5, type: "number" }
      },
      type: "stub"
    });

    expect(validateParams("stub", { strength: "not-a-number" })).toEqual({
      strength: 0.5
    });
  });

  it("coerces string booleans", () => {
    registerEffect({
      create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; },
      schema: {
        enabled: { default: true, type: "boolean" }
      },
      type: "stub"
    });

    expect(validateParams("stub", { enabled: "false" })).toEqual({ enabled: false });
    expect(validateParams("stub", { enabled: "true" })).toEqual({ enabled: true });
  });

  it("passes through unknown keys untouched", () => {
    registerEffect({
      create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; },
      schema: {
        strength: { default: 0.5, type: "number" }
      },
      type: "stub"
    });

    const result = validateParams("stub", { extra: "hello", strength: 0.7 });

    expect(result).toEqual({ extra: "hello", strength: 0.7 });
  });

  it("returns params as-is when no schema exists", () => {
    registerEffect({ create: (context) => { const effect = new StubEffect(); effect.create(context); return effect; }, type: "stub" });

    const params = { foo: 42 };

    expect(validateParams("stub", params)).toEqual(params);
  });
});
