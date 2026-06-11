import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const requestAnimationFrameMock = vi.fn((_callback: FrameRequestCallback) => 0);
const cancelAnimationFrameMock = vi.fn((_handle: number) => undefined);

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
