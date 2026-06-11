# @webgl-scroll/core

Framework-agnostic runtime primitives for DOM-driven WebGL scroll effects.

Use this package when you need the scanner, effect registry, `EffectRouter`, state tree, shared pointer bridge, GPU simulation helpers, ScrollTrigger bridge, or renderer loop without React-specific APIs.

## Install

```bash
npm install @webgl-scroll/core gsap three
```

## Boundary

`@webgl-scroll/core` must not import React, Next.js, or built-in effect packages. It owns generic DOM metadata parsing, runtime state, pointer input, GPU ping-pong simulation helpers, and renderer lifecycle primitives.
