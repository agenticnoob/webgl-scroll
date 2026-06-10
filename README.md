# webgl-scroll

Composable WebGL scroll effects for React, Next.js, and agentic frontend workflows.

## Install

```bash
npm install @webgl-scroll/core @webgl-scroll/effects @webgl-scroll/react gsap three
```

React adapters require `react` and `react-dom` from the host app.

## Quick Start

```tsx
import { registerBuiltinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger } from "@webgl-scroll/react";

registerBuiltinEffects();

export function PageSection() {
  return (
    <WebGLEngineTrigger
      effects={[{ type: "fade-title", layer: "content", params: { fg: "#f7f2ea" } }]}
      trigger="stage-title"
    >
      <h1>Stage</h1>
    </WebGLEngineTrigger>
  );
}
```

The React package emits `data-webgl-*` trigger metadata. The host app still owns the canvas setup, renderer loop, and teardown.

## Which Package Should I Use?

| Need | Install | Why |
| --- | --- | --- |
| Runtime, registry, state tree, custom effects | `@webgl-scroll/core` | Lowest-level WebGL scroll engine |
| Fade title and pixelated wipe effects | `@webgl-scroll/effects` | Built-in effects on top of core |
| React trigger components | `@webgl-scroll/react` | React bindings for trigger markup |

## Built-in Effects

- `fade-title`: renders a measured DOM heading as a WebGL title texture.
- `pixelated-wipe`: renders a fullscreen section transition from cut anchors.

See [docs/effects.md](docs/effects.md) for effect selection.

## AI Agent Guide

See [docs/agent-guide.md](docs/agent-guide.md).

## Examples

Examples live under `examples/*`.

## Package Boundaries

See [docs/package-boundaries.md](docs/package-boundaries.md).

## Status

`0.1.0` is the first public release line.

## License

MIT
