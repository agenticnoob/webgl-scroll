import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  beginPixelatedWipeFrame,
  disposePixelatedWipeCoordinator,
  ensurePixelatedWipeResources,
  getPixelatedWipeMaterialFromCoordinator,
  updatePixelatedWipeCoordinator
} from "./pixelatedWipeCoordinator";

describe("pixelatedWipeCoordinator", () => {
  it("allows only one cut-specific write per frame and resets on dispose", () => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    const first = document.createElement("div");
    const second = document.createElement("div");

    first.dataset.themeCut = "true";
    second.dataset.themeCut = "true";
    document.body.append(first, second);
    first.getBoundingClientRect = () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100, x: 0, y: 0, toJSON: () => ({}) });
    second.getBoundingClientRect = () => ({ bottom: 200, height: 100, left: 0, right: 100, top: 100, width: 100, x: 0, y: 100, toJSON: () => ({}) });

    beginPixelatedWipeFrame();
    ensurePixelatedWipeResources(scene, []);

    const firstDidWrite = updatePixelatedWipeCoordinator({
      context: {
        camera,
        deltaTime: 0.016,
        renderer: {} as THREE.WebGLRenderer,
        scene,
        time: 1,
        viewport: { height: 800, width: 1200 }
      },
      cutSnapshots: [{ cutIndex: 0, fade: 1, isActive: true, progress: 0.5 }],
      previousActiveCutIndex: undefined,
      sections: []
    });
    const secondDidWrite = updatePixelatedWipeCoordinator({
      context: {
        camera,
        deltaTime: 0.016,
        renderer: {} as THREE.WebGLRenderer,
        scene,
        time: 1,
        viewport: { height: 800, width: 1200 }
      },
      cutSnapshots: [{ cutIndex: 1, fade: 1, isActive: true, progress: 0.5 }],
      previousActiveCutIndex: 0,
      sections: []
    });

    expect(firstDidWrite).toBe(true);
    expect(secondDidWrite).toBe(false);
    expect(getPixelatedWipeMaterialFromCoordinator()).not.toBeNull();

    disposePixelatedWipeCoordinator();

    expect(getPixelatedWipeMaterialFromCoordinator()).toBeNull();
  });
});
