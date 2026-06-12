# Handoff

Date: 2026-06-12

## Current State

- Branch: `codex/asset-layer`.
- Published package metadata is aligned on `0.2.0` across `@webgl-scroll/core`, `@webgl-scroll/effects`, `@webgl-scroll/react`, examples, lockfile, and README.
- `@webgl-scroll/core` owns DOM scanning, ScrollTrigger bridge, state tree, shared pointer input, GPU simulation helpers, effect registry/router, and renderer loop.
- `@webgl-scroll/effects` owns built-in visual effects: `asset-layer`, `fade-title`, `pixelated-wipe`, and `glb-particles`.
- `@webgl-scroll/react` owns JSX serialization through `WebGLEngineTrigger`.
- `glb-particles` loads a GLB, samples mesh surfaces, creates particle textures, runs velocity/position GPU ping-pong simulation, applies optional `params.transform` to the particle group, and renders one `Points` object with pointer displacement.
- `glb-particles` internals are split by responsibility: `pointerMapping.ts` owns pointer strength and coordinate mapping, `materials.ts` owns shader material construction, `particleGeometry.ts` owns point geometry, and `simulationRuntime.ts` owns velocity-before-position GPU stepping.
- `pixelated-wipe` shared state is coordinated through `pixelatedWipeCoordinator.ts`; `PixelatedWipeEffect` stays a thin lifecycle wrapper around the coordinator.

## Validation App Result

Codex Web validates this package set by installing local tarballs with `npm install --no-save`. The `TREE` specimen uses `/glb/human_2.glb` with `particleTextureSize: 32` and object-level `transform` config for static angle plus slow Y-axis auto-rotation.

The latest browser issue was not a package shader bug. The host app's `.next-dev` cache was stale and served an older `glb-particles` bundle without pointer uniforms. Clearing `.next-dev` and restarting Next exposed `uPointer`, `uPointerRadius`, `uPointerStrength`, and `uRenderScatter` on the live `Points` material; user validation then confirmed visible pointer-driven movement.

## Validation

- New focused tests cover `glbParticles/pointerMapping.ts`, `glbParticles/simulationRuntime.ts`, and `pixelatedWipeCoordinator.ts`.
- `packages/versionConsistency.test.ts` guards the `0.2.0` release line and internal `@webgl-scroll/core` peer ranges.
- Existing `glbParticlesEffect.test.ts` and `pixelatedWipeEffect.test.ts` pass after the split.
- `npm run typecheck` and `npm run build` pass in this monorepo after the package split.

## Do Next

- Consider making render-shader displacement a first-class public param instead of deriving it from `scatterForce`.
- Add a browser/example validation path for `glb-particles`; static tests do not catch stale host bundles or visual interaction issues.
- Do not add per-effect pointer listeners or another renderer loop.

## Generated Artifacts

Local package tarballs (`webgl-scroll-*.tgz`) are generated validation artifacts and should not be committed.
