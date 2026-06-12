# Package Boundaries

Use this when deciding which package owns a change.

| Need | Install | Why |
| --- | --- | --- |
| Runtime, registry, state tree, pointer input, GPU helpers, custom effects | `@webgl-scroll/core` | Lowest-level WebGL scroll engine |
| Asset layers, fade title, GLB particles, and pixelated wipe effects | `@webgl-scroll/effects` | Built-in effects on top of core |
| React trigger components | `@webgl-scroll/react` | React bindings for trigger markup |

## Core

Put framework-agnostic runtime mechanics in `@webgl-scroll/core`:

- DOM scanning and `data-webgl-*` parsing.
- ScrollTrigger bridge.
- `WebGLStateTree`.
- Shared pointer state and `createWebGLPointerBridge`.
- `GpuSimulationRunner` and render-target pooling primitives.
- `WebGLEffect`, registry, router, effect params, lifecycle-distance scheduling, and `assetResolver` plumbing.
- `WebGLRendererLoop`.

Core must not import React, Next.js, built-in effects, page content, or visual effect implementations.

## Effects

Put named visual outputs in `@webgl-scroll/effects`:

- `AssetLayerEffect`.
- `FadeTitleEffect`.
- `GlbParticlesEffect`.
- `PixelatedWipeEffect`.
- Effect shaders, uniforms, and coordinators.
- Built-in effect registration.
- Media asset runtimes, DOM-anchored placement helpers, scroll timeline helpers, and GLB disposal utilities.
- GLB surface sampling, particle texture initialization, simulation/render shaders, and pointer-driven particle behavior.
- Built-in asset manifest helpers such as `collectBuiltinEffectAssetRequests()`.

Effects may import core types and lifecycle APIs. Effects must not import React, Next.js, or host application modules.

Effects may consume host-resolved assets through core's `assetResolver`. They must not own app-wide download policy, route prefetching, service workers, auth headers, or cache lifetime.

## React

Put React ergonomics in `@webgl-scroll/react`:

- `WebGLEngineTrigger`.
- JSX serialization for `data-webgl-*` attributes.
- Typed trigger and effect lifecycle declarations.
- React hooks or client-only adapters.

React must not implement visual effects or its own scroll timing system.
