# Effects Reference

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
