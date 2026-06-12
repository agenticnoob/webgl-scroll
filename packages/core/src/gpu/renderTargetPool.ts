import * as THREE from "three";

export type RenderTargetPoolOptions = {
  format?: THREE.PixelFormat;
  height: number;
  magFilter?: THREE.MagnificationTextureFilter;
  minFilter?: THREE.TextureFilter;
  type?: THREE.TextureDataType;
  width: number;
};

export class RenderTargetPool {
  private readonly pooled = new Map<string, THREE.WebGLRenderTarget[]>();

  acquire(options: RenderTargetPoolOptions): THREE.WebGLRenderTarget {
    const key = getRenderTargetKey(options);
    const target = this.pooled.get(key)?.pop();

    if (target) {
      return target;
    }

    return new THREE.WebGLRenderTarget(options.width, options.height, {
      depthBuffer: false,
      format: options.format ?? THREE.RGBAFormat,
      magFilter: options.magFilter ?? THREE.NearestFilter,
      minFilter: options.minFilter ?? THREE.NearestFilter,
      stencilBuffer: false,
      type: options.type ?? THREE.HalfFloatType
    });
  }

  release(target: THREE.WebGLRenderTarget): void {
    const key = getTargetKey(target);
    const targets = this.pooled.get(key) ?? [];
    targets.push(target);
    this.pooled.set(key, targets);
  }

  dispose(): void {
    for (const targets of this.pooled.values()) {
      for (const target of targets) {
        target.dispose();
      }
    }
    this.pooled.clear();
  }
}

function getRenderTargetKey(options: RenderTargetPoolOptions): string {
  return [
    options.width,
    options.height,
    options.format ?? THREE.RGBAFormat,
    options.type ?? THREE.HalfFloatType,
    options.minFilter ?? THREE.NearestFilter,
    options.magFilter ?? THREE.NearestFilter
  ].join(":");
}

function getTargetKey(target: THREE.WebGLRenderTarget): string {
  return [
    target.width,
    target.height,
    target.texture.format,
    target.texture.type,
    target.texture.minFilter,
    target.texture.magFilter
  ].join(":");
}
