import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { WebGLRendererLoop } from "./webglRendererLoop";

type FakeRenderer = {
  dispose: ReturnType<typeof vi.fn>;
  domElement: HTMLCanvasElement;
  outputColorSpace?: THREE.ColorSpace;
  render: ReturnType<typeof vi.fn>;
  setAnimationLoop: ReturnType<typeof vi.fn>;
  setPixelRatio: ReturnType<typeof vi.fn>;
  setSize: ReturnType<typeof vi.fn>;
};

function createFakeRenderer(canvas: HTMLCanvasElement): FakeRenderer {
  return {
    dispose: vi.fn(),
    domElement: canvas,
    render: vi.fn(),
    setAnimationLoop: vi.fn(),
    setPixelRatio: vi.fn(),
    setSize: vi.fn()
  };
}

describe("WebGLRendererLoop", () => {
  it("creates a renderer scene and orthographic camera with capped DPR sizing", () => {
    const canvas = document.createElement("canvas");
    const renderer = createFakeRenderer(canvas);

    const loop = new WebGLRendererLoop(canvas, {
      getDevicePixelRatio: () => 3,
      getViewport: () => ({ height: 600, width: 800 }),
      rendererFactory: () => renderer as unknown as THREE.WebGLRenderer
    });

    expect(loop.context.scene).toBeInstanceOf(THREE.Scene);
    expect(loop.context.camera).toBeInstanceOf(THREE.OrthographicCamera);
    expect(loop.context.renderer).toBe(renderer);
    expect(loop.context.viewport).toEqual({ height: 600, width: 800 });
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(renderer.setSize).toHaveBeenCalledWith(800, 600, false);
  });

  it("runs frame callbacks before rendering with time and deltaTime", () => {
    const canvas = document.createElement("canvas");
    const renderer = createFakeRenderer(canvas);
    const frameCallback = vi.fn();
    let now = 1000;

    const loop = new WebGLRendererLoop(canvas, {
      getNow: () => now,
      getViewport: () => ({ height: 600, width: 800 }),
      rendererFactory: () => renderer as unknown as THREE.WebGLRenderer
    });

    loop.start(frameCallback);
    const animate = renderer.setAnimationLoop.mock.calls[0][0] as () => void;

    now = 1250;
    animate();

    expect(frameCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        deltaTime: 0.25,
        time: 0.25,
        viewport: { height: 600, width: 800 }
      })
    );
    expect(renderer.render).toHaveBeenCalledWith(loop.context.scene, loop.context.camera);
    expect(frameCallback.mock.invocationCallOrder[0]).toBeLessThan(
      renderer.render.mock.invocationCallOrder[0]
    );
  });

  it("stops and disposes the underlying renderer", () => {
    const canvas = document.createElement("canvas");
    const renderer = createFakeRenderer(canvas);
    const loop = new WebGLRendererLoop(canvas, {
      getViewport: () => ({ height: 600, width: 800 }),
      rendererFactory: () => renderer as unknown as THREE.WebGLRenderer
    });

    loop.start(vi.fn());
    loop.stop();
    loop.dispose();

    expect(renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });
});
