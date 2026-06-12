# @webgl-scroll/react

React bindings for `@webgl-scroll/core`.

Use this package when JSX should emit typed `data-webgl-*` trigger metadata through `WebGLEngineTrigger`.

## Install

```bash
npm install @webgl-scroll/core @webgl-scroll/react react react-dom
```

## Boundary

`@webgl-scroll/react` owns React ergonomics only. It must not depend on Next.js runtime APIs or built-in effect implementations.

## Lifecycle Props

`WebGLEngineTrigger` accepts a trigger-level `lifecycle` prop and each effect descriptor may include its own `lifecycle` object. The adapter serializes these into `data-webgl-lifecycle` and `data-webgl-effects` for core to parse.

```tsx
<WebGLEngineTrigger
  trigger="tree"
  lifecycle={{ preloadMargin: "120vh", unloadMargin: "300vh" }}
  effects={[
    {
      type: "glb-particles",
      lifecycle: { preloadMargin: "180vh" },
      params: { src: "/models/tree.glb" }
    }
  ]}
/>
```
