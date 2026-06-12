import { afterEach, describe, expect, it } from "vitest";

import {
  createWebGLScrollTriggerBridge,
  resetWebGLScrollTriggerState,
  scanTriggerElements,
  serializeWebGLTriggerMetadata,
  webglScrollTriggerState
} from "./webglScrollTriggers";

afterEach(() => {
  document.body.innerHTML = "";
  resetWebGLScrollTriggerState();
});

describe("serializeWebGLTriggerMetadata", () => {
  it("reads trigger metadata once from declarative DOM anchors", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="title"
        data-webgl-scene="build"
        data-webgl-start="top 70%"
        data-webgl-end="bottom 30%"
      ></section>
      <div data-webgl-trigger="cut-0" data-webgl-scene="build-to-blocks"></div>
    `;

    expect(serializeWebGLTriggerMetadata(document.body)).toEqual([
      {
        end: "bottom 30%",
        id: "build:title:0",
        scene: "build",
        start: "top 70%",
        trigger: "title"
      },
      {
        end: "bottom top",
        id: "build-to-blocks:cut-0:1",
        scene: "build-to-blocks",
        start: "top bottom",
        trigger: "cut-0"
      }
    ]);
  });

  it("reads role and cutIndex from data attributes", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="title"
        data-webgl-role="title"
        data-webgl-scene="build"
      ></section>
      <div
        data-webgl-trigger="cut-0"
        data-webgl-role="cut"
        data-webgl-cut-index="0"
        data-webgl-scene="build-to-blocks"
      ></div>
    `;

    expect(serializeWebGLTriggerMetadata(document.body)).toEqual([
      {
        end: "bottom top",
        id: "build:title:0",
        role: "title",
        scene: "build",
        start: "top bottom",
        trigger: "title"
      },
      {
        cutIndex: 0,
        end: "bottom top",
        id: "build-to-blocks:cut-0:1",
        role: "cut",
        scene: "build-to-blocks",
        start: "top bottom",
        trigger: "cut-0"
      }
    ]);
  });
});

describe("scanTriggerElements", () => {
  it("reads data-webgl-effect as single effect", () => {
    document.body.innerHTML = `
      <section data-webgl-trigger="hero" data-webgl-effect="fade-title" data-webgl-scene="intro"></section>
    `;

    const result = scanTriggerElements(document.body);

    expect(result).toHaveLength(1);
    expect(result[0].effects).toEqual([{ type: "fade-title", params: {} }]);
  });

  it("reads data-webgl-effects JSON for multi-effect", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="stacked"
        data-webgl-scene="demo"
        data-webgl-effects='[{"type":"fade-title","layer":"content"},{"type":"dissolve","params":{"strength":0.5}}]'
      ></section>
    `;

    const result = scanTriggerElements(document.body);

    expect(result).toHaveLength(1);
    expect(result[0].effects).toHaveLength(2);
    expect(result[0].effects[0].type).toBe("fade-title");
    expect(result[0].effects[1].type).toBe("dissolve");
  });

  it("merges data-webgl-params with descriptor params", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="hero"
        data-webgl-scene="intro"
        data-webgl-effects='[{"type":"fade-title","params":{"opacity":0.8}}]'
        data-webgl-params='{"strength":0.5}'
      ></section>
    `;

    const result = scanTriggerElements(document.body);

    expect(result[0].effects[0].params).toEqual({ opacity: 0.8, strength: 0.5 });
  });

  it("backward-compat: data-webgl-role maps to effect type", () => {
    document.body.innerHTML = `
      <div data-webgl-trigger="cut-0" data-webgl-role="cut" data-webgl-cut-index="0" data-webgl-scene="cut-scene"></div>
    `;

    const result = scanTriggerElements(document.body);

    expect(result).toHaveLength(1);
    expect(result[0].effects[0].type).toBe("pixelated-wipe");
    expect(result[0].effects[0].params).toEqual({ cutIndex: 0 });
  });
});

describe("createWebGLScrollTriggerBridge with effects", () => {
  it("writes expanded snapshots for multi-effect triggers", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="stacked"
        data-webgl-scene="demo"
        data-webgl-effects='[{"type":"fade-title"},{"type":"dissolve"}]'
      ></section>
    `;

    const cleanup = createWebGLScrollTriggerBridge({
      reducedMotion: true,
      root: document.body
    });

    // Two effects → two snapshots with suffixed IDs
    expect(webglScrollTriggerState.triggers["demo:stacked:0:fade-title:0"]).toMatchObject({
      effect: "fade-title",
      isActive: false,
      progress: 1
    });
    expect(webglScrollTriggerState.triggers["demo:stacked:0:dissolve:1"]).toMatchObject({
      effect: "dissolve",
      isActive: false,
      progress: 1
    });

    cleanup();
  });

  it("preserves legacy ID format for data-webgl-role triggers", () => {
    document.body.innerHTML = `
      <section data-webgl-trigger="title" data-webgl-role="title" data-webgl-scene="build"></section>
    `;

    const cleanup = createWebGLScrollTriggerBridge({
      reducedMotion: true,
      root: document.body
    });

    // Legacy role path keeps old ID format
    expect(webglScrollTriggerState.triggers["build:title:0"]).toMatchObject({
      effect: "fade-title",
      isActive: false,
      progress: 1
    });

    cleanup();
  });

  it("registers per-effect params in state tree", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="hero"
        data-webgl-scene="intro"
        data-webgl-effects='[{"type":"fade-title","params":{"strength":0.74}}]'
      ></section>
    `;

    const cleanup = createWebGLScrollTriggerBridge({
      reducedMotion: true,
      root: document.body
    });

    const triggerKeys = Object.keys(webglScrollTriggerState.triggers);
    expect(triggerKeys.length).toBeGreaterThan(0);

    cleanup();
  });

  it("writes trigger lifecycle config to expanded snapshots", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="tree"
        data-webgl-scene="demo"
        data-webgl-lifecycle='{"preloadMargin":"120vh","unloadMargin":"300vh","minIdleMs":8000}'
        data-webgl-effects='[{"type":"glb-particles","params":{"src":"/glb/a.glb"}}]'
      ></section>
    `;

    const cleanup = createWebGLScrollTriggerBridge({
      reducedMotion: true,
      root: document.body
    });

    expect(webglScrollTriggerState.triggers["demo:tree:0:glb-particles:0"]).toMatchObject({
      lifecycle: {
        minIdleMs: 8000,
        preloadMargin: "120vh",
        unloadMargin: "300vh"
      }
    });

    cleanup();
  });

  it("lets effect lifecycle config override trigger lifecycle config", () => {
    document.body.innerHTML = `
      <section
        data-webgl-trigger="tree"
        data-webgl-scene="demo"
        data-webgl-lifecycle='{"preloadMargin":"120vh","suspendMargin":"100vh","unloadMargin":"300vh"}'
        data-webgl-effects='[{"type":"glb-particles","lifecycle":{"preloadMargin":"180vh","unloadMargin":"350vh"},"params":{"src":"/glb/a.glb"}}]'
      ></section>
    `;

    const cleanup = createWebGLScrollTriggerBridge({
      reducedMotion: true,
      root: document.body
    });

    expect(webglScrollTriggerState.triggers["demo:tree:0:glb-particles:0"]).toMatchObject({
      lifecycle: {
        preloadMargin: "180vh",
        suspendMargin: "100vh",
        unloadMargin: "350vh"
      }
    });

    cleanup();
  });
});

describe("createWebGLScrollTriggerBridge", () => {
  it("short-circuits trigger progress for reduced motion without DOM style writes", () => {
    document.body.innerHTML = `
      <section data-webgl-trigger="title" data-webgl-scene="build"></section>
    `;
    const cleanup = createWebGLScrollTriggerBridge({
      reducedMotion: true,
      root: document.body
    });

    expect(webglScrollTriggerState.reducedMotion).toBe(true);
    expect(webglScrollTriggerState.triggers["build:title:0"]).toMatchObject({
      isActive: false,
      progress: 1
    });
    expect(document.body.querySelector("section")?.getAttribute("style")).toBeNull();

    cleanup();
    expect(webglScrollTriggerState.triggers).toEqual({});
  });
});
