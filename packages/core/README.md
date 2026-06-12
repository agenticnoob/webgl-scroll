# @webgl-scroll/core

Framework-agnostic runtime primitives for DOM-driven WebGL scroll effects.

Use this package when you need `createWebGLScrollRuntime()`, the scanner, function effect registry, `EffectRouter`, state tree, shared pointer bridge, GPU simulation helpers, ScrollTrigger bridge, or renderer loop without React-specific APIs.

## Install

```bash
npm install @webgl-scroll/core gsap three
```

## Boundary

`@webgl-scroll/core` must not import React, Next.js, or built-in effect packages. It owns generic DOM metadata parsing, runtime state, pointer input, GPU ping-pong simulation helpers, renderer lifecycle primitives, default asset resolver, and dev `window.__webglScrollDebug` state.

## Runtime

```ts
import { createWebGLScrollRuntime, defineWebGLEffect } from "@webgl-scroll/core";

const customEffect = defineWebGLEffect({
  type: "custom",
  create() {
    return {
      update() {},
      dispose() {}
    };
  }
});

const runtime = createWebGLScrollRuntime({
  canvas,
  effects: [customEffect]
});

runtime.start();
```

## Lifecycle

`EffectRouter` schedules effects by viewport distance:

- `preloadMargin: "100vh"`
- `suspendMargin: "100vh"`
- `unloadMargin: "250vh"`
- `minIdleMs: 5000`
- `maxConcurrentPreloads: 2`

Pass `lifecycle` to `createWebGLScrollRuntime()` for global defaults. Trigger/effect declarations can override those values through parsed DOM metadata. Pass `assetResolver` to let effects consume host-prefetched files without moving network policy into core.
