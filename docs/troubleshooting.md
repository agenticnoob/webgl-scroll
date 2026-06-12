# Troubleshooting

## Blank Canvas

Check that the canvas exists before engine start, the integration is client-only, and `createWebGLScrollRuntime()` or `<WebGLScrollRuntime />` is mounted once.

## ScrollTrigger Does Not Update

Check for `[data-webgl-trigger]` elements, valid `data-webgl-start` and `data-webgl-end`, and a single ScrollTrigger bridge owner.

## Unknown Effect Type

Pass effect definitions before engine start. For built-ins, use `effects: [builtinEffects()]`. For custom effects, use `defineWebGLEffect()` and include the returned definition in the runtime `effects` array.

## Duplicate Effect Registration

Custom effects should use unique type names. The runtime registers the supplied definitions; avoid mounting two runtimes with the same effect definitions on the same page.

## React Hydration Issues

Canvas and engine setup belong in client components. Do not read `window`, `document`, or media queries during server render.

## Reduced Motion Hides Visuals

Reduced motion may suppress WebGL animation. DOM headings and content must remain visible.

## GLB Particles Do Not Move

First verify the host app is running the current package output. A stale dev-server bundle can keep an older `glb-particles` shader even after local tarballs are installed.

Check in this order:

1. Confirm `@webgl-scroll/effects` output contains `uPointer`, `uPointerStrength`, and `uRenderScatter`.
2. Restart the host app after clearing its dev cache.
3. Confirm one runtime owns pointer input and that `window.__webglScrollDebug.getState().pointer` changes while the pointer moves.
4. Inspect live `Points` material uniforms: `uPointer`, `uPointerRadius`, `uPointerStrength`, and `uRenderScatter`.
5. Only tune `pointerRadius`, `scatterForce`, `returnForce`, `damping`, or `transform` after pointer state and uniforms are known to update.

Do not add per-effect pointer listeners to `glb-particles`; input should flow through shared pointer state.

For model angle, scale, or self-rotation, inspect `glb-particles.params.transform`. Placement owns DOM anchoring and base size; transform is applied on top inside the package effect.

## Package Boundary Violation

If a package imports from host application modules, move that data to an options object at the application boundary.
