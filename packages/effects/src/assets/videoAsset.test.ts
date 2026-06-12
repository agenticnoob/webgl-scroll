import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createVideoAsset } from "./videoAsset";
import type { AssetDescriptor } from "./types";

function makeVideoDescriptor(overrides: Partial<AssetDescriptor> = {}): AssetDescriptor {
  return {
    composite: { feather: 0, mode: "normal", opacity: 1, threshold: 0 },
    id: "video",
    kind: "video",
    opacity: 1,
    order: 0,
    playback: { mode: "loop-while-visible", startTime: 0 },
    src: "/video.mp4",
    ...overrides
  };
}

function makeSnapshot(overrides: { isActive?: boolean; progress?: number } = {}) {
  return {
    isActive: true,
    progress: 0.5,
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createVideoAsset", () => {
  it("creates a muted inline video texture without starting network preload", () => {
    const asset = createVideoAsset(makeVideoDescriptor());
    vi.spyOn(asset.video, "pause").mockImplementation(() => undefined);

    expect(asset.video.muted).toBe(true);
    expect(asset.video.playsInline).toBe(true);
    expect(asset.video.preload).toBe("none");
    expect(asset.video.src).toBe("");
    expect(asset.texture).toBeInstanceOf(THREE.VideoTexture);

    asset.dispose();
  });

  it("attaches src when preloaded", async () => {
    const asset = createVideoAsset(makeVideoDescriptor());
    const load = vi.spyOn(asset.video, "load").mockImplementation(() => undefined);
    vi.spyOn(asset.video, "pause").mockImplementation(() => undefined);

    await asset.preload?.({
      direction: 0,
      effect: "asset-layer",
      element: document.createElement("section"),
      end: "bottom top",
      id: "scene:asset:0",
      isActive: false,
      params: {},
      progress: 0,
      scene: "scene",
      start: "top bottom",
      velocity: 0
    });

    expect(asset.video.preload).toBe("metadata");
    expect(asset.video.src).toContain("/video.mp4");
    expect(load).toHaveBeenCalledOnce();

    asset.dispose();
  });

  it("plays while visible and pauses while inactive", () => {
    const asset = createVideoAsset(makeVideoDescriptor());
    const play = vi.spyOn(asset.video, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(asset.video, "pause").mockImplementation(() => undefined);

    asset.updatePlayback(makeSnapshot({ isActive: true }));
    asset.updatePlayback(makeSnapshot({ isActive: false }));

    expect(play).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();

    asset.dispose();
  });

  it("maps scroll-scrub progress to currentTime", () => {
    const asset = createVideoAsset(
      makeVideoDescriptor({
        playback: { endTime: 4, mode: "scroll-scrub", startTime: 1 }
      })
    );
    vi.spyOn(asset.video, "pause").mockImplementation(() => undefined);
    Object.defineProperty(asset.video, "duration", { configurable: true, value: 10 });

    asset.updatePlayback(makeSnapshot({ isActive: true, progress: 0.5 }));

    expect(asset.video.currentTime).toBeCloseTo(2.5);

    asset.dispose();
  });

  it("pauses and disposes the video texture", () => {
    const asset = createVideoAsset(makeVideoDescriptor());
    const pause = vi.spyOn(asset.video, "pause").mockImplementation(() => undefined);
    const dispose = vi.spyOn(asset.texture, "dispose");

    asset.dispose();

    expect(pause).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
