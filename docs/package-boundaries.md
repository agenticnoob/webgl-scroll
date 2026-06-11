# Package Boundaries

Use this when deciding which package owns a change.

| Need | Install | Why |
| --- | --- | --- |
| Runtime, registry, state tree, custom effects | `@webgl-scroll/core` | Lowest-level WebGL scroll engine |
| Asset layers, fade title, and pixelated wipe effects | `@webgl-scroll/effects` | Built-in effects on top of core |
| React trigger components | `@webgl-scroll/react` | React bindings for trigger markup |

## Core

Put framework-agnostic runtime mechanics in `@webgl-scroll/core`:

- DOM scanning and `data-webgl-*` parsing.
- ScrollTrigger bridge.
- `WebGLStateTree`.
- `WebGLEffect`, registry, router, and effect params.
- `WebGLRendererLoop`.

Core must not import React, Next.js, built-in effects, page content, or visual effect implementations.

## Effects

Put named visual outputs in `@webgl-scroll/effects`:

- `AssetLayerEffect`.
- `FadeTitleEffect`.
- `PixelatedWipeEffect`.
- Effect shaders, uniforms, and coordinators.
- Built-in effect registration.
- Media asset runtimes, DOM-anchored placement helpers, scroll timeline helpers, and GLB disposal utilities.

Effects may import core types and lifecycle APIs. Effects must not import React, Next.js, or host application modules.

## React

Put React ergonomics in `@webgl-scroll/react`:

- `WebGLEngineTrigger`.
- JSX serialization for `data-webgl-*` attributes.
- React hooks or client-only adapters.

React must not implement visual effects or its own scroll timing system.
