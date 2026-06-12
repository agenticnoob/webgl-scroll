# Effects

## AssetLayerEffect

Use when:

- One DOM trigger should render one or more WebGL assets anchored to that element.
- Image, video, and GLB assets need shared scroll progress, visibility, placement, and cleanup.
- A page needs declarative media layers without app-local Three.js renderer ownership.

Avoid when:

- The media should remain normal selectable or accessible DOM content.
- A custom shader compositor is required beyond normal material opacity.

Required DOM:

```tsx
<WebGLEngineTrigger
  effects={[
    {
      type: "asset-layer",
      layer: "background",
      params: {
        placement: { anchor: "element", fit: "cover" },
        assets: [
          { id: "backdrop", kind: "image", src: "/images/backdrop.jpg", order: 0 },
          {
            id: "motion",
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
            transform: { rotateY: ["scroll", 0, 6.283], scale: ["scroll", 0.8, 1] }
          }
        ]
      }
    }
  ]}
  trigger="product"
>
  <section>Product</section>
</WebGLEngineTrigger>
```

Params:

- `placement`: shared DOM anchor mapping. Defaults to `{ anchor: "element", fit: "cover", x: 0.5, y: 0.5, width: 1, height: 1, offsetX: 0, offsetY: 0 }`.
- `assets`: ordered image, video, or GLB descriptors. Invalid descriptors are ignored.
- `asset.placement`: partial per-asset override merged over `params.placement`. Use this to position multiple assets independently on the same trigger.
- `playback.mode`: video playback mode, one of `loop-while-visible`, `once-on-enter`, or `scroll-scrub`.
- `transform`: optional scroll tuples such as `["scroll", 0, 1]` for opacity, scale, and rotation.

Cleanup:

- Asset runtimes load through effect lifecycle. `create()` installs lightweight containers; image/GLB downloads and video `src` attachment happen from `onPreload` or active-entry fallback.
- If the router receives an `assetResolver`, image/video/GLB assets ask it first with `{ effect: "asset-layer", id, kind, src }`.
- Image and video textures, geometries, and materials are disposed with the effect.
- GLB object graphs are traversed so geometries, materials, and texture-valued material fields are disposed.
- Reduced motion pauses video playback and hides WebGL asset layers so DOM content remains readable.

## FadeTitleEffect

Use when:

- A section title should become a WebGL layer that tracks DOM bounds.
- The page needs subtle title presence without replacing the DOM source.

Avoid when:

- The title needs selectable text as the primary visible layer.
- The page has many rapidly changing title nodes.

Required DOM:

```tsx
<WebGLEngineTrigger
  effects={[{ type: "fade-title", layer: "content" }]}
  trigger="stage-title"
>
  <h1>Stage</h1>
</WebGLEngineTrigger>
```

Params:

- `fg`: optional text color.
- `opacity`: optional opacity floor.

Reduced motion:

- Effect hides the animated layer and leaves DOM content readable.

## GlbParticlesEffect

Use when:

- A GLB should be sampled into GPU particles instead of rendered as a normal mesh.
- Pointer movement should scatter particles and idle state should let them return to the sampled model shape.
- The host app already owns one shared renderer loop and can install `createWebGLPointerBridge`.

Avoid when:

- A normal GLB mesh layer is sufficient; use `asset-layer` with `kind: "glb"` for that.
- The interaction needs per-object DOM pointer listeners.
- Reduced-motion users need the same animated response.

Required DOM:

```tsx
<WebGLEngineTrigger
  effects={[
    {
      type: "glb-particles",
      layer: "background",
      params: {
        src: "/models/human.glb",
        particleTextureSize: 32,
        placement: { anchor: "element", fit: "contain", x: 0.84, y: 0.72, width: 0.3, height: 0.52 },
        pointSize: 2.2,
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
  ]}
  trigger="particle-model"
>
  <section>Model</section>
</WebGLEngineTrigger>
```

Params:

- `src`: GLB URL.
- `particleTextureSize`: square particle texture size. `32` gives about 1k particles and is the recommended validation default.
- `placement`: DOM anchor mapping shared with asset placement semantics.
- `pointSize`: rendered point size.
- `pointerRadius`: local particle-space interaction radius.
- `scatterForce`: simulation force away from the pointer.
- `returnForce`: force pulling particles back to sampled origins.
- `damping`: velocity damping per frame.
- `color`: particle color.
- `transform`: object-level placement adjustment for the particle group. Supports static `rotation`, positive scalar `scale`, and `autoRotate` with `axis: "x" | "y" | "z"` plus radians-per-second `speed`.

Runtime:

- The effect loads during `onPreload`, samples GLB mesh surfaces, normalizes origins, creates origin/position/velocity textures, runs GPU velocity and position passes, then renders one `Points` object.
- `create()` only installs an invisible group. If the trigger jumps straight to active before the preload margin is reached, `onEnter` / active `update()` starts the same idempotent preload path.
- If the router receives an `assetResolver`, the effect asks it first with `{ effect: "glb-particles", kind: "glb", src }` and supports `arrayBuffer` or `blob` results before falling back to the declared `src`.
- Placement owns the DOM anchor and base model size; `transform` is applied on top of that base. Do not create a separate transform effect for ordinary object rotation or scale.
- Pointer state comes from `sharedStateTree.pointer`, normally written by one app-level `createWebGLPointerBridge({ target: canvas })`.
- The render shader includes a small pointer displacement fallback so interaction remains visible even when simulation movement is subtle.

## Lifecycle Margins

Lifecycle can be declared on the trigger or on a specific effect:

```tsx
<WebGLEngineTrigger
  trigger="particle-model"
  lifecycle={{ preloadMargin: "120vh", suspendMargin: "100vh", unloadMargin: "300vh" }}
  effects={[
    {
      type: "glb-particles",
      lifecycle: { preloadMargin: "180vh", unloadMargin: "350vh" },
      params: { src: "/models/human.glb" }
    }
  ]}
/>
```

Effect-level lifecycle values override trigger-level values. Supported distance units are pixels, `vh`, `vw`, and `%`; numeric values are treated as pixels. Defaults are `preloadMargin: "100vh"`, `suspendMargin: "100vh"`, `unloadMargin: "250vh"`, `minIdleMs: 5000`, and `maxConcurrentPreloads: 2`.

## Host Prefetch

Host apps can download files ahead of time without moving download policy into `webgl-scroll`:

```ts
import { collectBuiltinEffectAssetRequests } from "@webgl-scroll/effects";

const requests = collectBuiltinEffectAssetRequests(effects);
```

Use those requests to warm an app-owned cache. Pass an `assetResolver` to `EffectRouter`; built-in effects consume resolved assets when lifecycle preload runs. The package still owns scheduling and resource disposal, while the app owns network priority, cache lifetime, authentication, service worker policy, or route-level prefetching.

Troubleshooting:

- If the package output contains pointer uniforms but the browser does not, clear the host app's dev cache and restart its dev server.
- Inspect `uPointer`, `uPointerStrength`, `uPointerRadius`, and `uRenderScatter` on the live `Points` material before tuning params.

## PixelatedWipeEffect

Use when:

- A divider or cut anchor should drive a single fullscreen WebGL transition.
- Section-to-section color changes should stay in one renderer and one scroll timing owner.

Avoid when:

- The layout needs independent per-card or per-component animations.
- Multiple fullscreen background effects would compete for the same frame.

Required DOM:

```tsx
<WebGLEngineTrigger
  as="div"
  effects={[{ type: "pixelated-wipe", layer: "background", params: { cutIndex: 0 } }]}
  trigger="stage-cut"
/>
```

Params:

- `cutIndex`: index of the cut anchor in document order.
- `bg`: optional background color override.
- `fg`: optional foreground color override.

Reduced motion:

- Effect suppresses animated transitions and leaves semantic DOM sections visible.
