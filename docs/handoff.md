# Handoff

Date: 2026-06-12

## Current State

- Branch: `codex/asset-layer`.
- `@webgl-scroll/core` owns DOM scanning, ScrollTrigger bridge, state tree, shared pointer input, GPU simulation helpers, effect registry/router, and renderer loop.
- `@webgl-scroll/effects` owns built-in visual effects: `asset-layer`, `fade-title`, `pixelated-wipe`, and `glb-particles`.
- `@webgl-scroll/react` owns JSX serialization through `WebGLEngineTrigger`.
- `glb-particles` loads a GLB, samples mesh surfaces, creates particle textures, runs velocity/position GPU ping-pong simulation, and renders one `Points` object with pointer displacement.

## Validation App Result

Codex Web validates this package set by installing local tarballs with `npm install --no-save`. The `TREE` specimen uses `/glb/human_2.glb` with `particleTextureSize: 32`.

The latest browser issue was not a package shader bug. The host app's `.next-dev` cache was stale and served an older `glb-particles` bundle without pointer uniforms. Clearing `.next-dev` and restarting Next exposed `uPointer`, `uPointerRadius`, `uPointerStrength`, and `uRenderScatter` on the live `Points` material; user validation then confirmed visible pointer-driven movement.

## Do Next

- Optimize `glb-particles` internals before broadening the API: split pointer mapping, material creation, and simulation stepping out of `GlbParticlesEffect.update()`.
- Consider making render-shader displacement a first-class public param instead of deriving it from `scatterForce`.
- Add a browser/example validation path for `glb-particles`; static tests do not catch stale host bundles or visual interaction issues.
- Do not add per-effect pointer listeners or another renderer loop.

## Generated Artifacts

Local package tarballs (`webgl-scroll-*.tgz`) are generated validation artifacts and should not be committed.
