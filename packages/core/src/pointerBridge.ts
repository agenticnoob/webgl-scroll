import { clamp01 } from "./pointerState";
import { sharedStateTree } from "./webglStateTree";

export type WebGLPointerBridgeOptions = {
  eventTarget?: HTMLElement | Window;
  getNow?: () => number;
  idleThresholdMs?: number;
  target: HTMLElement;
};

export type WebGLPointerBridge = {
  dispose(): void;
  update(): void;
};

const DEFAULT_IDLE_THRESHOLD_MS = 80;

export function createWebGLPointerBridge(options: WebGLPointerBridgeOptions): WebGLPointerBridge {
  const {
    getNow = () => performance.now(),
    idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS,
    target
  } = options;
  const eventTarget = options.eventTarget ?? target;
  let disposed = false;
  let lastX = sharedStateTree.pointer.x;
  let lastY = sharedStateTree.pointer.y;
  let lastMoveAt = sharedStateTree.pointer.lastMoveAt;

  const handlePointerMove: EventListener = (event) => {
    if (disposed) {
      return;
    }

    const pointerEvent = event as PointerEvent | MouseEvent;
    const now = getNow();
    const rect = target.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    const x = clamp01((pointerEvent.clientX - rect.left) / width);
    const y = clamp01((pointerEvent.clientY - rect.top) / height);
    const elapsedSeconds = Math.max((now - lastMoveAt) / 1000, 0.001);
    const velocityX = (x - lastX) / elapsedSeconds;
    const velocityY = (y - lastY) / elapsedSeconds;

    sharedStateTree.pointer = {
      idleMs: 0,
      isInside: true,
      isMoving: true,
      lastMoveAt: now,
      ndcX: x * 2 - 1,
      ndcY: 1 - y * 2,
      velocityX,
      velocityY,
      x,
      y
    };

    lastX = x;
    lastY = y;
    lastMoveAt = now;
  };

  const handlePointerLeave = () => {
    if (disposed) {
      return;
    }

    sharedStateTree.pointer = {
      ...sharedStateTree.pointer,
      isInside: false,
      isMoving: false,
      velocityX: 0,
      velocityY: 0
    };
  };

  eventTarget.addEventListener("pointermove", handlePointerMove, { passive: true });
  eventTarget.addEventListener("mousemove", handlePointerMove, { passive: true });
  eventTarget.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  eventTarget.addEventListener("mouseleave", handlePointerLeave, { passive: true });

  return {
    dispose() {
      disposed = true;
      eventTarget.removeEventListener("pointermove", handlePointerMove);
      eventTarget.removeEventListener("mousemove", handlePointerMove);
      eventTarget.removeEventListener("pointerleave", handlePointerLeave);
      eventTarget.removeEventListener("mouseleave", handlePointerLeave);
    },
    update() {
      if (disposed) {
        return;
      }

      const idleMs = Math.max(getNow() - sharedStateTree.pointer.lastMoveAt, 0);
      sharedStateTree.pointer = {
        ...sharedStateTree.pointer,
        idleMs,
        isMoving: idleMs <= idleThresholdMs
      };
    }
  };
}
