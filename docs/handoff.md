# Handoff

Date: 2026-06-12

## Current State

- Branch: `codex/lifecycle-host-prefetch`.
- `@webgl-scroll/core` owns DOM scanning, ScrollTrigger bridge, state tree, shared pointer input, GPU simulation helpers, effect registry/router, and renderer loop.
- `@webgl-scroll/effects` owns built-in visual effects: `asset-layer`, `fade-title`, `pixelated-wipe`, and `glb-particles`.
- `@webgl-scroll/react` owns JSX serialization through `WebGLEngineTrigger`.
- `glb-particles` loads a GLB, samples mesh surfaces, creates particle textures, runs velocity/position GPU ping-pong simulation, applies optional `params.transform` to the particle group, and renders one `Points` object with pointer displacement.
- `glb-particles` internals are split by responsibility: `pointerMapping.ts` owns pointer strength and coordinate mapping, `materials.ts` owns shader material construction, `particleGeometry.ts` owns point geometry, and `simulationRuntime.ts` owns velocity-before-position GPU stepping.
- `pixelated-wipe` shared state is coordinated through `pixelatedWipeCoordinator.ts`; `PixelatedWipeEffect` stays a thin lifecycle wrapper around the coordinator.
- `EffectRouter` now schedules preload, active, suspended, and disposed phases by viewport distance. Defaults are `preloadMargin: "100vh"`, `suspendMargin: "100vh"`, `unloadMargin: "250vh"`, `minIdleMs: 5000`, and `maxConcurrentPreloads: 2`.
- Hosts can keep download policy outside the package by prefetching `collectBuiltinEffectAssetRequests()` results and passing an `assetResolver` to the router. Built-in `asset-layer` and `glb-particles` consume resolver results during lifecycle preload.

## Validation App Result

Codex Web validates this package set by installing local tarballs with `npm install --no-save`. The `TREE` specimen uses `/glb/human_2.glb` with `particleTextureSize: 32`, object-level `transform` config for static angle plus slow Y-axis auto-rotation, explicit lifecycle margins, and host-owned prefetch/cache wired to `assetResolver`.

The latest browser issue was not a package shader bug. The host app's `.next-dev` cache was stale and served an older `glb-particles` bundle without pointer uniforms. Clearing `.next-dev` and restarting Next exposed `uPointer`, `uPointerRadius`, `uPointerStrength`, and `uRenderScatter` on the live `Points` material; user validation then confirmed visible pointer-driven movement.

## Validation

- New focused tests cover `glbParticles/pointerMapping.ts`, `glbParticles/simulationRuntime.ts`, and `pixelatedWipeCoordinator.ts`.
- Lifecycle tests cover config parsing, distance phase scheduling, preload concurrency, retry diagnostics, React lifecycle serialization, asset manifest extraction, lifecycle-aware `asset-layer`, and lifecycle-aware `glb-particles`.
- Existing `glbParticlesEffect.test.ts` and `pixelatedWipeEffect.test.ts` pass after the split.
- `npm run typecheck` and `npm run build` pass in this monorepo after the package split.
- Codex Web local tarball validation reached `npm run check`, production build, and browser smoke with no runtime issues reported after the stale `.next-dev` cache was cleared.

## Do Next

- Merge or open a PR from `codex/lifecycle-host-prefetch` into the package release line.
- Run final release-branch verification before publishing the next `@webgl-scroll/*` version.
- Publishing is manual after merge: CI runs on PRs and `main` pushes, but `.github/workflows/release.yml` is `workflow_dispatch` and must be triggered with `NPM_TOKEN` available.
- After publish, update Codex Web from temporary local tarball validation back to the published npm packages and rerun its check/browser smoke.
- Consider making render-shader displacement a first-class public param instead of deriving it from `scatterForce`.
- Add a browser/example validation path for lifecycle diagnostics; static tests do not catch stale host bundles or visual interaction issues.
- Do not add per-effect pointer listeners or another renderer loop.

## Generated Artifacts

Local package tarballs (`webgl-scroll-*.tgz`) are generated validation artifacts and should not be committed.
