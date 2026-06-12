# @webgl-scroll/effects

Built-in visual effects for `@webgl-scroll/core`.

Use this package when you want ready-made function effects such as `asset-layer`, `fade-title`, `glb-particles`, and `pixelated-wipe` without writing a custom effect definition.

## Install

```bash
npm install @webgl-scroll/core @webgl-scroll/effects three
```

## Boundary

`@webgl-scroll/effects` may depend on `@webgl-scroll/core` and `three`. It must not depend on React or Next.js.

Register built-ins through the runtime:

```ts
import { builtinEffects } from "@webgl-scroll/effects";

createWebGLScrollRuntime({
  canvas,
  effects: [builtinEffects()]
});
```

## Asset Layer

`asset-layer` lets a single DOM trigger render ordered image, video, and GLB assets in WebGL:

```ts
{
  type: "asset-layer",
  layer: "background",
  params: {
    assets: [
      { id: "image", kind: "image", src: "/images/backdrop.jpg", order: 0 },
      {
        id: "video",
        kind: "video",
        src: "/videos/motion.mp4",
        order: 1,
        placement: { x: 0.3, y: 0.55, width: 0.42, height: 0.52 },
        playback: { mode: "scroll-scrub", startTime: 0, endTime: 4 }
      },
      {
        id: "model",
        kind: "glb",
        src: "/models/object.glb",
        order: 2,
        placement: { x: 0.72, y: 0.46, width: 0.44, height: 0.5 },
        transform: { rotateY: ["scroll", 0, 6.283] }
      }
    ]
  }
}
```

The effect maps the trigger element's rect into the shared orthographic WebGL world, updates all assets from the same scroll progress, pauses video in reduced motion, and disposes textures/materials/geometries on teardown.

`params.placement` sets the shared anchor mapping. Each asset can add `placement` as a partial override, so one trigger can independently place image, video, and GLB layers without creating extra scroll triggers.

Asset loading is lifecycle-aware. Effect `create()` installs lightweight objects; image/GLB downloads and video `src` attachment happen during `preload` or active-entry fallback. If the runtime provides an `assetResolver`, assets ask it first with `{ effect: "asset-layer", id, kind, src }` and fall back to `src` when unresolved.

## GLB Particles

`glb-particles` samples a GLB into a particle texture during lifecycle preload, runs GPU ping-pong position/velocity simulation, and uses shared pointer state from `@webgl-scroll/core` for visible scatter/return interaction:

```ts
{
  type: "glb-particles",
  layer: "background",
  params: {
    src: "/models/human.glb",
    particleTextureSize: 32,
    placement: { anchor: "element", fit: "contain", x: 0.84, y: 0.72, width: 0.3, height: 0.52 },
    pointerRadius: 0.28,
    scatterForce: 3.2,
    returnForce: 0.78,
    damping: 0.92,
    transform: {
      rotation: { x: 0, y: -0.45, z: 0 },
      autoRotate: { axis: "y", speed: 0.18 },
      scale: 1
    }
  }
}
```

The runtime installs one shared pointer bridge and updates it before rendering. Do not add per-effect pointer listeners.

Use `params.transform` for object-level particle group adjustment. `placement` determines the DOM anchor and base size; `transform` applies static rotation, positive scalar scale, and optional `autoRotate` on top of that base. Ordinary object rotation should stay inside the effect params instead of becoming a separate transform effect.

If the router provides an `assetResolver`, `glb-particles` asks it first with `{ effect: "glb-particles", kind: "glb", src }` and supports resolved `arrayBuffer` or `blob` values before falling back to `src`.

## Asset Manifests

Use `collectBuiltinEffectAssetRequests(effects)` to derive app-owned preload requests from declarative built-in effect descriptors. This helper only returns `{ effect, id?, kind, src }`; it does not fetch, cache, or create WebGL runtime objects.
