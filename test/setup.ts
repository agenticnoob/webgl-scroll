import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

const pendingAnimationFrames = new Set<number>();
const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
  const handle = window.setTimeout(() => {
    pendingAnimationFrames.delete(handle);
    callback(performance.now());
  }, 0);

  pendingAnimationFrames.add(handle);

  return handle;
});
const cancelAnimationFrameMock = vi.fn((handle: number) => {
  pendingAnimationFrames.delete(handle);
  window.clearTimeout(handle);
});

Object.defineProperty(window, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: requestAnimationFrameMock
});

Object.defineProperty(window, "cancelAnimationFrame", {
  configurable: true,
  writable: true,
  value: cancelAnimationFrameMock
});

Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: requestAnimationFrameMock
});

Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  writable: true,
  value: cancelAnimationFrameMock
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined
  })
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({
      actualBoundingBoxAscent: 90,
      actualBoundingBoxDescent: 24,
      width: 120
    })),
    scale: vi.fn()
  }))
});

afterEach(() => {
  for (const handle of pendingAnimationFrames) {
    window.clearTimeout(handle);
  }
  pendingAnimationFrames.clear();
});
