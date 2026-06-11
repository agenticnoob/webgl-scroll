export type WebGLPointerState = {
  idleMs: number;
  isInside: boolean;
  isMoving: boolean;
  lastMoveAt: number;
  ndcX: number;
  ndcY: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

export function createDefaultPointerState(): WebGLPointerState {
  return {
    idleMs: 0,
    isInside: false,
    isMoving: false,
    lastMoveAt: 0,
    ndcX: -1,
    ndcY: 1,
    velocityX: 0,
    velocityY: 0,
    x: 0,
    y: 0
  };
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 1);
}
