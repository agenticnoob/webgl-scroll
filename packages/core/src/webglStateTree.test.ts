import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WebGLScrollTriggerSnapshot } from "./effectTypes";
import { WebGLStateTree } from "./webglStateTree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRaw(
  overrides: Partial<WebGLScrollTriggerSnapshot> = {}
): WebGLScrollTriggerSnapshot {
  return {
    end: "bottom top",
    id: "scene:trigger:0",
    isActive: false,
    progress: 0,
    scene: "build",
    start: "top bottom",
    trigger: "trigger",
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WebGLStateTree", () => {
  let tree: WebGLStateTree;

  beforeEach(() => {
    tree = new WebGLStateTree();
  });

  // -- basic mutation & version tracking ------------------------------------

  it("starts with version 0 and empty triggers", () => {
    expect(tree.version).toBe(0);
    expect(Object.keys(tree.triggers)).toHaveLength(0);
  });

  it("bumps version on set", () => {
    tree.set("a", makeRaw({ id: "a" }));
    expect(tree.version).toBe(1);

    tree.set("b", makeRaw({ id: "b" }));
    expect(tree.version).toBe(2);
  });

  it("bumps version on delete", () => {
    tree.set("a", makeRaw({ id: "a" }));
    tree.delete("a");
    expect(tree.version).toBe(2);
  });

  it("does not bump version when deleting a non-existent id", () => {
    tree.set("a", makeRaw({ id: "a" }));
    tree.delete("nonexistent");
    expect(tree.version).toBe(1);
  });

  // -- triggers backward-compatible accessor ---------------------------------

  it("exposes triggers via the triggers getter", () => {
    const raw = makeRaw({ id: "a", scene: "build" });
    tree.set("a", raw);

    expect(tree.triggers["a"]).toBe(raw);
  });

  // -- getByScene -----------------------------------------------------------

  describe("getByScene", () => {
    it("returns triggers matching the given scene", () => {
      tree.set("a", makeRaw({ id: "a", scene: "build" }));
      tree.set("b", makeRaw({ id: "b", scene: "design" }));
      tree.set("c", makeRaw({ id: "c", scene: "build" }));

      const results = tree.getByScene("build");

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id).sort()).toEqual(["a", "c"]);
    });

    it("returns empty array for unknown scene", () => {
      tree.set("a", makeRaw({ id: "a", scene: "build" }));

      expect(tree.getByScene("nonexistent")).toEqual([]);
    });

    it("updates index when trigger scene changes", () => {
      tree.set("a", makeRaw({ id: "a", scene: "build" }));
      expect(tree.getByScene("build")).toHaveLength(1);

      // Move trigger to a different scene.
      tree.set("a", makeRaw({ id: "a", scene: "design" }));
      expect(tree.getByScene("build")).toHaveLength(0);
      expect(tree.getByScene("design")).toHaveLength(1);
    });
  });

  // -- getByEffect ----------------------------------------------------------

  describe("getByEffect", () => {
    it("returns triggers matching the given effect type via role mapping", () => {
      tree.set("a", makeRaw({ id: "a", role: "cut" }));
      tree.set("b", makeRaw({ id: "b", role: "title" }));
      tree.set("c", makeRaw({ id: "c", role: "cut" }));

      const cuts = tree.getByEffect("pixelated-wipe");

      expect(cuts).toHaveLength(2);
      expect(cuts.map((r) => r.id).sort()).toEqual(["a", "c"]);
    });

    it("returns triggers with explicit effect field", () => {
      tree.set(
        "a",
        makeRaw({ id: "a", ...{ effect: "fade-title" } } as unknown as WebGLScrollTriggerSnapshot)
      );

      expect(tree.getByEffect("fade-title")).toHaveLength(1);
    });

    it("returns empty array for unknown effect", () => {
      tree.set("a", makeRaw({ id: "a", role: "cut" }));

      expect(tree.getByEffect("nonexistent")).toEqual([]);
    });

    it("updates index when trigger role changes", () => {
      tree.set("a", makeRaw({ id: "a", role: "cut" }));
      expect(tree.getByEffect("pixelated-wipe")).toHaveLength(1);

      tree.set("a", makeRaw({ id: "a", role: "title" }));
      expect(tree.getByEffect("pixelated-wipe")).toHaveLength(0);
      expect(tree.getByEffect("fade-title")).toHaveLength(1);
    });
  });

  // -- registerElement & conversion -----------------------------------------

  describe("registerElement and snapshot conversion", () => {
    it("includes registered element and params in converted snapshots", () => {
      const element = document.createElement("section");
      const params = { fg: "#ff0000" };

      tree.registerElement("a", element, params);
      tree.set("a", makeRaw({ id: "a", scene: "build" }));

      const snapshot = tree.getSnapshot("a");

      expect(snapshot).toBeDefined();
      expect(snapshot!.element).toBe(element);
      expect(snapshot!.params).toEqual({ fg: "#ff0000" });
    });

    it("provides a fallback element when none is registered", () => {
      tree.set("a", makeRaw({ id: "a" }));

      const snapshot = tree.getSnapshot("a");

      expect(snapshot).toBeDefined();
      expect(snapshot!.element).toBeInstanceOf(HTMLElement);
    });

    it("converts role to effect name in snapshots", () => {
      tree.set("a", makeRaw({ id: "a", role: "cut" }));

      const snapshot = tree.getSnapshot("a");

      expect(snapshot!.effect).toBe("pixelated-wipe");
    });

    it("uses explicit effect field over role mapping", () => {
      tree.set(
        "a",
        makeRaw({
          id: "a",
          role: "cut",
          ...{ effect: "custom-effect" }
        } as unknown as WebGLScrollTriggerSnapshot)
      );

      const snapshot = tree.getSnapshot("a");

      expect(snapshot!.effect).toBe("custom-effect");
    });

    it("falls back to 'unknown' when neither effect nor role is set", () => {
      tree.set("a", makeRaw({ id: "a" }));

      const snapshot = tree.getSnapshot("a");

      expect(snapshot!.effect).toBe("unknown");
    });

    it("returns undefined for unknown id", () => {
      expect(tree.getSnapshot("nonexistent")).toBeUndefined();
    });
  });

  // -- getAllSnapshots ------------------------------------------------------

  it("getAllSnapshots returns all triggers as TriggerSnapshot[]", () => {
    tree.set("a", makeRaw({ id: "a", scene: "build" }));
    tree.set("b", makeRaw({ id: "b", scene: "design" }));

    const all = tree.getAllSnapshots();

    expect(all).toHaveLength(2);
    expect(all.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  // -- subscribe / unsubscribe -----------------------------------------------

  describe("subscribe", () => {
    it("notifies listeners on set", () => {
      const listener = vi.fn();
      tree.subscribe(listener);

      tree.set("a", makeRaw({ id: "a" }));

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(1);
    });

    it("notifies listeners on delete", () => {
      tree.set("a", makeRaw({ id: "a" }));

      const listener = vi.fn();
      tree.subscribe(listener);

      tree.delete("a");

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(2);
    });

    it("notifies listeners on reset", () => {
      tree.set("a", makeRaw({ id: "a" }));

      const listener = vi.fn();
      tree.subscribe(listener);

      tree.reset();

      expect(listener).toHaveBeenCalledOnce();
    });

    it("unsubscribe function stops notifications", () => {
      const listener = vi.fn();
      const unsubscribe = tree.subscribe(listener);

      tree.set("a", makeRaw({ id: "a" }));
      expect(listener).toHaveBeenCalledOnce();

      unsubscribe();

      tree.set("b", makeRaw({ id: "b" }));
      expect(listener).toHaveBeenCalledOnce(); // still 1
    });

    it("supports multiple subscribers", () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      tree.subscribe(listenerA);
      tree.subscribe(listenerB);

      tree.set("a", makeRaw({ id: "a" }));

      expect(listenerA).toHaveBeenCalledOnce();
      expect(listenerB).toHaveBeenCalledOnce();
    });
  });

  // -- reset ----------------------------------------------------------------

  it("reset clears triggers, indexes, elements, and reducedMotion", () => {
    tree.reducedMotion = true;
    tree.registerElement("a", document.createElement("div"), { fg: "#fff" });
    tree.set("a", makeRaw({ id: "a", scene: "build", role: "cut" }));

    tree.reset();

    expect(Object.keys(tree.triggers)).toHaveLength(0);
    expect(tree.getByScene("build")).toEqual([]);
    expect(tree.getByEffect("pixelated-wipe")).toEqual([]);
    expect(tree.getSnapshot("a")).toBeUndefined();
    expect(tree.reducedMotion).toBe(false);
  });

  // -- delete ---------------------------------------------------------------

  it("delete removes trigger from indexes", () => {
    tree.set("a", makeRaw({ id: "a", scene: "build", role: "cut" }));
    tree.set("b", makeRaw({ id: "b", scene: "build", role: "title" }));

    tree.delete("a");

    expect(tree.getByScene("build")).toHaveLength(1);
    expect(tree.getByEffect("pixelated-wipe")).toHaveLength(0);
    expect(tree.triggers["a"]).toBeUndefined();
  });

  // -- reducedMotion --------------------------------------------------------

  it("stores reducedMotion flag", () => {
    expect(tree.reducedMotion).toBe(false);
    tree.reducedMotion = true;
    expect(tree.reducedMotion).toBe(true);
  });
});
