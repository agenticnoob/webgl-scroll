# Migration From Local Source

Replace copied source imports with package imports:

```ts
import { createWebGLScrollRuntime } from "@webgl-scroll/core";
import { builtinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger, WebGLScrollRuntime } from "@webgl-scroll/react";
```

Use `createWebGLScrollRuntime({ canvas, effects: [builtinEffects()] })` or `<WebGLScrollRuntime effects={[builtinEffects()]} />`. Do not keep copied renderer, pointer, router, ScrollTrigger, resize, teardown, or debug ownership in the app once the runtime adapter is available.

Keep legacy DOM aliases working during migration:

```txt
data-webgl-role="title" -> fade-title
data-webgl-role="cut" -> pixelated-wipe
data-webgl-cut-index -> params.cutIndex
```

Do not move app data into packages. Convert app content to generic options at the boundary:

```ts
const themeStops = sections.map((section) => ({
  accent: section.accent,
  bg: section.bg,
  fg: section.fg,
  scene: section.title.toLowerCase()
}));
```

Verify:

- Canvas renders.
- DOM fallback remains readable.
- Scroll progress updates through the core bridge.
- Effects are passed before engine start.
- No package imports app modules.
