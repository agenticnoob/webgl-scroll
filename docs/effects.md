# Effects

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
