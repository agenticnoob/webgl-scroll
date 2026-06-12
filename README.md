# webgl-scroll

Composable WebGL scroll effects for React, Next.js, and agentic frontend workflows.

## Install

```bash
npm install @webgl-scroll/core @webgl-scroll/effects @webgl-scroll/react gsap three
```

React adapters require `react` and `react-dom` from the host app.

## Quick Start

```tsx
import { builtinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger, WebGLScrollRuntime } from "@webgl-scroll/react";

export function PageSection() {
  return (
    <>
      <WebGLScrollRuntime effects={[builtinEffects()]} />
      <WebGLEngineTrigger
        lifecycle={{ preloadMargin: "120vh", suspendMargin: "100vh", unloadMargin: "300vh" }}
        effects={[{ type: "fade-title", layer: "content", params: { fg: "#f7f2ea" } }]}
        trigger="stage-title"
      >
        <h1>Stage</h1>
      </WebGLEngineTrigger>
    </>
  );
}
```

`WebGLScrollRuntime` owns the canvas, renderer loop, pointer bridge, ScrollTrigger bridge, effect router, resize, teardown, default asset resolver, and dev `window.__webglScrollDebug` hook. `WebGLEngineTrigger` emits `data-webgl-*` trigger metadata.

## Lifecycle And Asset Loading

Effects are scheduled by viewport distance. Defaults are:

- `preloadMargin: "100vh"`: create the effect and call `preload` before it reaches the viewport.
- `suspendMargin: "100vh"`: keep fast-return state while pausing visible work after it leaves the active range.
- `unloadMargin: "250vh"` plus `minIdleMs: 5000`: dispose effects that stay far away long enough.
- `maxConcurrentPreloads: 2`: limit simultaneous effect preload work.

Apps can override these defaults globally through `createWebGLScrollRuntime({ lifecycle })` or `<WebGLScrollRuntime lifecycle={...} />`, per trigger with `data-webgl-lifecycle` or `WebGLEngineTrigger.lifecycle`, and per effect with `effect.lifecycle`.

The runtime includes a default fetch/blob asset resolver. Hosts with route-level prefetching, auth, cache, or service-worker policy can override it with `assetResolver`. Built-in `asset-layer` and `glb-particles` first ask that resolver for image/video/GLB data and only fall back to their declared `src` when the resolver returns nothing. `@webgl-scroll/effects` also exports `collectBuiltinEffectAssetRequests()` so an app can derive a preload manifest from effect declarations.

## Which Package Should I Use?

| Need | Install | Why |
| --- | --- | --- |
| Runtime, registry, state tree, shared pointer input, GPU helpers, custom effects | `@webgl-scroll/core` | Function-first WebGL scroll runtime |
| Asset layers, fade title, pixelated wipe, and GLB particles | `@webgl-scroll/effects` | Built-in effects on top of core |
| React trigger components | `@webgl-scroll/react` | React bindings for trigger markup |

## Built-in Effects

- `asset-layer`: renders ordered image, video, and GLB assets from one DOM trigger, with shared progress and per-asset placement overrides.
- `fade-title`: renders a measured DOM heading as a WebGL title texture.
- `glb-particles`: samples a GLB surface into GPU-simulated particles that support object-level `params.transform` and respond to shared pointer input.
- `pixelated-wipe`: renders a fullscreen section transition from cut anchors.

See [docs/effects.md](docs/effects.md) for effect selection.

## AI-First Agent Guide

Agents should start with the declarative DOM/API surface before adding custom runtime code:

1. Choose a built-in effect from [docs/effects.md](docs/effects.md).
2. Use `data-webgl-effects` or `WebGLEngineTrigger.effects` for multi-effect triggers.
3. Use `asset-layer` for DOM-anchored image, video, and GLB media before writing app-local Three.js glue.
4. Use `glb-particles` when the GLB itself should become a pointer-driven particle simulation.
5. Keep package boundaries in [docs/package-boundaries.md](docs/package-boundaries.md).

See [docs/agent-guide.md](docs/agent-guide.md).

## Examples

Examples live under `examples/*`.

## Package Boundaries

See [docs/package-boundaries.md](docs/package-boundaries.md).

## Status

`0.3.1` is the function-first runtime release line: `WebGLEffect` classes are removed, custom effects use `defineWebGLEffect()`, built-ins register through `builtinEffects()`, and apps should prefer `createWebGLScrollRuntime()` / `<WebGLScrollRuntime />` over local renderer/pointer/router glue.

## License

MIT
