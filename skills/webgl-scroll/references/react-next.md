# React And Next.js

Use a client component for any engine setup:

```tsx
"use client";

import { useRef } from "react";
import { WebGLEngineTrigger } from "@webgl-scroll/react";

export function PageSection() {
  return (
    <WebGLEngineTrigger
      trigger="intro"
      effects={[{ type: "fade-title", layer: "content" }]}
    >
      <h1>INTRO</h1>
    </WebGLEngineTrigger>
  );
}
```

Rules:

- Use `useRef<HTMLCanvasElement | null>` for canvas-driven setup.
- Do not access `window` or `document` during server render.
- Register effects before starting the engine.
- Cleanup must dispose ScrollTriggers, renderer resources, textures, materials, geometries, and event listeners.
- Keep DOM fallback visible until WebGL readiness is known.
