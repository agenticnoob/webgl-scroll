# Effects Reference

## `asset-layer`

Use when:

- One DOM trigger should declaratively render image, video, or GLB assets in WebGL.
- Multiple assets should share the same trigger progress and visibility state.
- Assets need independent placement without adding more scroll triggers.

Avoid when:

- The media needs to remain a normal DOM `<img>` or `<video>` for user interaction.
- A custom compositor or shader pipeline is required before basic asset layering works.

React:

```tsx
<WebGLEngineTrigger
  trigger="media"
  effects={[
    {
      type: "asset-layer",
      layer: "background",
      params: {
        placement: { anchor: "element", x: 0.5, y: 0.5, width: 1, height: 1 },
        assets: [
          {
            id: "birds",
            kind: "video",
            src: "/videos/birds.mp4",
            order: 1,
            placement: { x: 0.32, y: 0.5, width: 0.48, height: 0.58 },
            playback: { mode: "loop-while-visible", startTime: 0 }
          },
          {
            id: "model",
            kind: "glb",
            src: "/models/object.glb",
            order: 2,
            placement: { x: 0.72, y: 0.45, width: 0.42, height: 0.42 },
            transform: { rotateY: ["scroll", 0, 6.283] }
          }
        ]
      }
    }
  ]}
/>
```

Placement rule:

- `params.placement` is the shared default for the trigger.
- `asset.placement` is a partial override for one asset.

Common mistakes:

- Adding one DOM trigger per asset when one `asset-layer` can own the stack.
- Expecting `asset.placement` to replace shared progress or visibility; it only changes placement fields.
- Moving app-specific asset URLs into package source.

## `fade-title`

Use when:

- A semantic DOM heading should remain the source of truth.
- The visual layer should replay the heading as a WebGL texture.
- The page needs restrained editorial or specimen-like title emphasis.

Avoid when:

- Users need to select, edit, or interact with the rendered WebGL text.
- Body copy readability is the main task.
- The page has no stable `h1` or `h2` layout anchor.

DOM:

```html
<section data-webgl-trigger="intro" data-webgl-effect="fade-title">
  <h1>INTRO</h1>
</section>
```

React:

```tsx
<WebGLEngineTrigger
  trigger="intro"
  effects={[{ type: "fade-title", layer: "content" }]}
>
  <h1>INTRO</h1>
</WebGLEngineTrigger>
```

Common mistakes:

- Moving the real heading out of DOM.
- Animating the DOM heading with GSAP while WebGL also owns the visual title.
- Forgetting reduced-motion fallback.

## `pixelated-wipe`

Use when:

- Section-to-section color transitions should happen in one fixed WebGL scene.
- A divider or cut should act as the visual transition anchor.
- Video luminance or shader masks should appear as brand-color light through the cut.

Avoid when:

- The layout needs independent card or component animations.
- Multiple fullscreen background effects would compete for the same frame.
- The app does not have stable section boundaries.

DOM:

```html
<div
  data-theme-cut="true"
  data-webgl-trigger="cut-0"
  data-webgl-effect="pixelated-wipe"
  data-webgl-params='{"cutIndex":0}'
></div>
```

React:

```tsx
<WebGLEngineTrigger
  as="div"
  trigger="cut-0"
  effects={[
    { type: "pixelated-wipe", layer: "background", params: { cutIndex: 0 } }
  ]}
/>
```

Common mistakes:

- Creating one renderer per section.
- Adding a second scroll listener instead of using the state tree.
- Registering multiple fullscreen background effects without a coordinator.
