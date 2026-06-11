# AI-First Agent Guide

Use this as the default route for agentic work in this repo.

1. Read `AGENTS.md`.
2. Identify the consumer surface: vanilla DOM, React/Next JSX, or package internals.
3. Read `docs/package-boundaries.md` and keep the change in the narrowest owning package.
4. Pick an existing effect from `docs/effects.md` before adding new runtime code.
5. Use `asset-layer` for DOM-anchored image, video, or GLB media before writing app-local Three.js glue.
6. Use `examples/next-basic` or `examples/react-basic` for runtime validation.
7. Update docs, examples, and tests in the same change when public effect params or behavior change.

Do not add a second renderer loop, a second scroll timing owner, copied app source, React imports in effects, or visual effect code in core.

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
            placement: { x: 0.28, y: 0.5, width: 0.42, height: 0.58 },
            playback: { mode: "scroll-scrub", startTime: 0, endTime: 3 }
          },
          {
            id: "model",
            kind: "glb",
            src: "/models/hero.glb",
            order: 2,
            placement: { x: 0.72, y: 0.48, width: 0.5, height: 0.5 },
            transform: { rotateY: ["scroll", 0, 6.283] }
          }
        ]
      }
    }
  ]}
/>
```

Placement is two-tier:

- `params.placement` defines the shared DOM anchor and default bounds for all assets.
- `asset.placement` is a partial override for one asset. Use it to place multiple assets independently while sharing the same trigger, progress, and visibility.

Keep media declarations in effect params. Do not add React or Next.js imports to `@webgl-scroll/effects`, and do not move app-specific assets into package source.
