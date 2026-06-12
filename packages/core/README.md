# @webgl-scroll/core

Framework-agnostic runtime primitives for DOM-driven WebGL scroll effects.

Use this package when you need the scanner, effect registry, `EffectRouter`, state tree, shared pointer bridge, GPU simulation helpers, ScrollTrigger bridge, or renderer loop without React-specific APIs.

## Install

```bash
npm install @webgl-scroll/core gsap three
```

## Boundary

`@webgl-scroll/core` must not import React, Next.js, or built-in effect packages. It owns generic DOM metadata parsing, runtime state, pointer input, GPU ping-pong simulation helpers, and renderer lifecycle primitives.

## Lifecycle

`EffectRouter` schedules effects by viewport distance:

- `preloadMargin: "100vh"`
- `suspendMargin: "100vh"`
- `unloadMargin: "250vh"`
- `minIdleMs: 5000`
- `maxConcurrentPreloads: 2`

Pass `lifecycle` to `EffectRouter` for global defaults. Trigger/effect declarations can override those values through parsed DOM metadata. Pass `assetResolver` to let effects consume host-prefetched files without moving network policy into core.
