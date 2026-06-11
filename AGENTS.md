# webgl-scroll Agent Notes

Default to small, package-boundary-preserving changes. This repository ships three npm packages from one monorepo.

## Packages

- `@webgl-scroll/core`: framework-agnostic DOM scanner, ScrollTrigger bridge, state tree, shared pointer input, GPU simulation helpers, effect lifecycle, registry, router, and renderer loop.
- `@webgl-scroll/effects`: built-in visual effects such as `asset-layer`, `fade-title`, `pixelated-wipe`, and `glb-particles`.
- `@webgl-scroll/react`: React and Next.js adapters such as `WebGLEngineTrigger`.

## AI-First Workflow

When an agent changes this repo, optimize for declarative app integration before custom code:

1. Start from the DOM contract: stable `data-webgl-trigger`, `data-webgl-effect`, or `data-webgl-effects`.
2. Prefer built-in effects before adding a custom `WebGLEffect`.
3. Put reusable media, placement, and lifecycle behavior in `@webgl-scroll/effects`, not in app glue.
4. Put scanning, timing, pointer state, GPU simulation helpers, state tree, router, and renderer mechanics in `@webgl-scroll/core`.
5. Put JSX serialization ergonomics in `@webgl-scroll/react`.
6. Keep examples and docs updated in the same change when public effect params or runtime behavior change.

## Allowed Dependency Direction

```txt
@webgl-scroll/react -> @webgl-scroll/core
@webgl-scroll/effects -> @webgl-scroll/core
```

## Forbidden

```txt
@webgl-scroll/core -> @webgl-scroll/effects
@webgl-scroll/core -> @webgl-scroll/react
@webgl-scroll/effects -> @webgl-scroll/react
packages/* -> examples/*
packages/* -> private app code
```

## Compatibility

- Keep `data-webgl-role` and `data-webgl-cut-index` support in core as deprecated DOM aliases.
- Do not introduce a second renderer loop or a second scroll timing owner.
- Pointer-driven effects must use the shared pointer bridge/state and must not install per-effect DOM listeners.
- Keep React-specific helpers in `@webgl-scroll/react`.
- `asset-layer` placement is two-tier: `params.placement` sets the shared DOM anchor mapping, and each asset can provide `asset.placement` partial overrides.
- `glb-particles` samples GLB surfaces into GPU particles and consumes shared pointer state for simulation and render-shader displacement.

## Verification

Use focused checks while editing:

```bash
npm test
npm run typecheck
```

Before release-facing changes:

```bash
npm run check
```
