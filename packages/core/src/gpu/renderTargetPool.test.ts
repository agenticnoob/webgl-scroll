import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { RenderTargetPool } from "./renderTargetPool";

describe("RenderTargetPool", () => {
  it("reuses compatible render targets after release", () => {
    const pool = new RenderTargetPool();
    const first = pool.acquire({ height: 8, width: 8, type: THREE.HalfFloatType });

    pool.release(first);
    const second = pool.acquire({ height: 8, width: 8, type: THREE.HalfFloatType });

    expect(second).toBe(first);
  });

  it("does not reuse targets with incompatible size or type", () => {
    const pool = new RenderTargetPool();
    const first = pool.acquire({ height: 8, width: 8, type: THREE.HalfFloatType });

    pool.release(first);
    const differentSize = pool.acquire({ height: 16, width: 16, type: THREE.HalfFloatType });
    const differentType = pool.acquire({ height: 8, width: 8, type: THREE.FloatType });

    expect(differentSize).not.toBe(first);
    expect(differentType).not.toBe(first);
  });

  it("disposes pooled targets", () => {
    const pool = new RenderTargetPool();
    const target = pool.acquire({ height: 8, width: 8, type: THREE.HalfFloatType });
    const dispose = vi.spyOn(target, "dispose");

    pool.release(target);
    pool.dispose();

    expect(dispose).toHaveBeenCalledOnce();
  });
});
