# Agent Guide

1. Read `AGENTS.md`.
2. Read `docs/package-boundaries.md`.
3. Pick an effect from `docs/effects.md`.
4. Use `examples/next-basic` before creating custom integration code.
5. Add custom effects only after confirming built-in effects do not fit.

## Asset Layers

Use `asset-layer` when a DOM section needs declarative WebGL media:

```tsx
<WebGLEngineTrigger
  trigger="hero-media"
  effects={[
    {
      type: "asset-layer",
      layer: "background",
      params: {
        assets: [
          { id: "image", kind: "image", src: "/images/hero.jpg", order: 0 },
          {
            id: "video",
            kind: "video",
            src: "/videos/hero.mp4",
            order: 1,
            playback: { mode: "scroll-scrub", startTime: 0, endTime: 3 }
          },
          {
            id: "model",
            kind: "glb",
            src: "/models/hero.glb",
            order: 2,
            placement: { width: 0.5, height: 0.5 },
            transform: { rotateY: ["scroll", 0, 6.283] }
          }
        ]
      }
    }
  ]}
/>
```

Keep media declarations in effect params. Do not add React or Next.js imports to `@webgl-scroll/effects`, and do not move app-specific assets into package source.
