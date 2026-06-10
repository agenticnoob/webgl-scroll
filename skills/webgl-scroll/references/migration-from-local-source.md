# Migration From Local Source

Replace copied source imports with package imports:

```ts
import { WebGLRendererLoop } from "@webgl-scroll/core";
import { registerBuiltinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger } from "@webgl-scroll/react";
```

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
- Effects are registered before engine start.
- No package imports app modules.
