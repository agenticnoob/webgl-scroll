# webgl-scroll Agent Notes

Default to small, package-boundary-preserving changes. This repository ships three npm packages from one monorepo.

## Packages

- `@webgl-scroll/core`: framework-agnostic DOM scanner, ScrollTrigger bridge, state tree, effect lifecycle, registry, router, and renderer loop.
- `@webgl-scroll/effects`: built-in visual effects such as `fade-title` and `pixelated-wipe`.
- `@webgl-scroll/react`: React and Next.js adapters such as `WebGLEngineTrigger`.

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
- Keep React-specific helpers in `@webgl-scroll/react`.

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
