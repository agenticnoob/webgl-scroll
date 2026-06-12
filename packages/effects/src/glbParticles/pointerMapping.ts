import type { WebGLPointerState } from "@webgl-scroll/core";

type ParticleSpacePointer = Pick<WebGLPointerState, "idleMs" | "isInside" | "isMoving" | "ndcX" | "ndcY">;

type CalculatePointerActivityOptions = {
  deltaTime: number;
  isActive: boolean;
  pointer: ParticleSpacePointer;
  previousActivity: number;
  reducedMotion: boolean;
};

type MapPointerToParticleSpaceOptions = {
  baseScale: number;
  boundsCenter: { x: number; y: number };
  pointer: ParticleSpacePointer;
};

export function calculatePointerActivity({
  deltaTime,
  isActive,
  pointer,
  previousActivity,
  reducedMotion
}: CalculatePointerActivityOptions): number {
  if (!isActive || reducedMotion) {
    return 0;
  }

  const idleHoverStrength = pointer.isInside ? Math.max(1 - pointer.idleMs / 600, 0) : 0;

  return pointer.isInside && pointer.isMoving
    ? 1
    : Math.max(idleHoverStrength, previousActivity - deltaTime * 1.15, 0);
}

export function mapPointerToParticleSpace({
  baseScale,
  boundsCenter,
  pointer
}: MapPointerToParticleSpaceOptions): { x: number; y: number; z: 0 } {
  const scale = Math.max(baseScale, 0.001);

  return {
    x: (pointer.ndcX - boundsCenter.x) / scale,
    y: (pointer.ndcY - boundsCenter.y) / scale,
    z: 0
  };
}
