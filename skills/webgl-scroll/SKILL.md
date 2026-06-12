---
name: webgl-scroll
description: Use when integrating DOM-driven WebGL scroll effects, choosing @webgl-scroll effects, wiring React or Next.js adapters, creating custom WebGLEffect plugins, or migrating legacy data-webgl-role markup.
---

# WebGL Scroll

Use `@webgl-scroll/core` for engine mechanics, `@webgl-scroll/effects` for built-in visuals, and `@webgl-scroll/react` for JSX adapters.

## AI-First Workflow

1. Identify the host framework: vanilla, React, Next.js, or other.
2. Check whether the app already owns scroll timing. Do not add a second scroll listener if the core bridge can write to `WebGLStateTree`.
3. Choose built-in effects from `references/effects.md` before adding a custom `WebGLEffect`.
4. Use `asset-layer` for DOM-anchored image, video, or GLB media before writing app-local Three.js glue.
5. For React or Next.js, read `references/react-next.md`.
6. For a new visual that cannot be expressed by built-ins, read `references/custom-effect.md`.
7. For copied local source, read `references/migration-from-local-source.md`.

## Rules

- Keep semantic content in DOM.
- Register effects before starting the engine.
- Use `data-webgl-effect` for one effect and `data-webgl-effects` for multiple effects.
- `asset-layer` uses shared `params.placement` plus per-asset `asset.placement` partial overrides.
- Preserve `data-webgl-role` only as a deprecated migration alias.
- Do not make `core` import React, effects, or app content.
- Do not make effects import app-specific content.
