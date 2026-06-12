# Migration From Local Source

Use this when replacing copied local engine code with package imports.

## Import Mapping

```ts
import { createWebGLScrollRuntime } from "@webgl-scroll/core";
import { builtinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger, WebGLScrollRuntime } from "@webgl-scroll/react";
```

Use `createWebGLScrollRuntime({ canvas, effects: [builtinEffects()] })` outside React, or `<WebGLScrollRuntime effects={[builtinEffects()]} />` in React. Do not recreate app-local renderer loop, pointer bridge, ScrollTrigger bridge, router, resize, teardown, or debug ownership after the runtime adapter is available.

## Preserve Legacy DOM

Keep these aliases working during migration:

```txt
data-webgl-role="title" -> fade-title
data-webgl-role="cut" -> pixelated-wipe
data-webgl-cut-index -> params.cutIndex
```

## Extract Host Data

Do not import host application content into packages. Convert application data to generic options at the boundary:

```ts
const themeStops = sections.map((section) => ({
  accent: section.accent,
  bg: section.bg,
  fg: section.fg,
  scene: section.title.toLowerCase()
}));
```

## Visual Parity Checklist

- One fixed canvas renders.
- Titles still have DOM fallback.
- Wipe follows divider anchors.
- Reduced motion keeps content visible.
- No duplicate renderer or duplicate ScrollTrigger owner exists.
- `window.__webglScrollDebug.getState()` exists in development/localhost.
