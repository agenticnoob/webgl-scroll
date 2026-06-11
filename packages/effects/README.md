# @webgl-scroll/effects

Built-in visual effects for `@webgl-scroll/core`.

Use this package when you want ready-made effects such as `asset-layer`, `fade-title`, and `pixelated-wipe` without writing a custom `WebGLEffect`.

## Install

```bash
npm install @webgl-scroll/core @webgl-scroll/effects three
```

## Boundary

`@webgl-scroll/effects` may depend on `@webgl-scroll/core` and `three`. It must not depend on React or Next.js.

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
        playback: { mode: "scroll-scrub", startTime: 0, endTime: 4 }
      },
      {
        id: "model",
        kind: "glb",
        src: "/models/object.glb",
        order: 2,
        transform: { rotateY: ["scroll", 0, 6.283] }
      }
    ]
  }
}
```

The effect maps the trigger element's rect into the shared orthographic WebGL world, updates all assets from the same scroll progress, pauses video in reduced motion, and disposes textures/materials/geometries on teardown.
