# Migration From Local Source

Use this when replacing copied local engine code with package imports.

## Import Mapping

```ts
import { WebGLRendererLoop } from "@webgl-scroll/core";
import { registerBuiltinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger } from "@webgl-scroll/react";
```

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
