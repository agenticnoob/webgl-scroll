# Troubleshooting

## Blank Canvas

Check that the canvas exists before engine start, the integration is client-only, and `WebGLRendererLoop` is constructed once.

## ScrollTrigger Does Not Update

Check for `[data-webgl-trigger]` elements, valid `data-webgl-start` and `data-webgl-end`, and a single ScrollTrigger bridge owner.

## Unknown Effect Type

Register the effect before engine start. For built-ins, call `registerBuiltinEffects()`.

## Duplicate Effect Registration

Built-in registration should guard with `resolveEffect()` before `registerEffect()`. Custom effects should use unique type names.

## React Hydration Issues

Canvas and engine setup belong in client components. Do not read `window`, `document`, or media queries during server render.

## Reduced Motion Hides Visuals

Reduced motion may suppress WebGL animation. DOM headings and content must remain visible.

## GLB Particles Do Not Move

First verify the host app is running the current package output. A stale dev-server bundle can keep an older `glb-particles` shader even after local tarballs are installed.

Check in this order:

1. Confirm `@webgl-scroll/effects` output contains `uPointer`, `uPointerStrength`, and `uRenderScatter`.
2. Restart the host app after clearing its dev cache.
3. Confirm one `createWebGLPointerBridge` is installed at the app boundary and updated before rendering.
4. Inspect live `Points` material uniforms: `uPointer`, `uPointerRadius`, `uPointerStrength`, and `uRenderScatter`.
5. Only tune `pointerRadius`, `scatterForce`, `returnForce`, or `damping` after pointer state and uniforms are known to update.

Do not add per-effect pointer listeners to `glb-particles`; input should flow through shared pointer state.

## Package Boundary Violation

If a package imports from host application modules, move that data to an options object at the application boundary.
