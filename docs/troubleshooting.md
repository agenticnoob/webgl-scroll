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

## Package Boundary Violation

If a package imports from host application modules, move that data to an options object at the application boundary.
