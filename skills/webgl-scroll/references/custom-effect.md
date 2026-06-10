# Custom Effect

Create a custom visual by extending `WebGLEffect`.

```ts
import {
  WebGLEffect,
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot
} from "@webgl-scroll/core";

export class RippleEffect extends WebGLEffect {
  readonly type = "ripple";

  create(_context: EffectContext): void {
    // Allocate mesh, material, geometry, or textures here.
  }

  update(_snapshot: TriggerSnapshot, _context: RenderContext): void {
    // Read progress and write uniforms or transforms here.
  }

  dispose(): void {
    // Dispose all GPU resources and listeners here.
  }
}
```

Rules:

- Do not import app content into an effect.
- Use params for app-provided values.
- Add param schema when values need coercion or defaults.
- Dispose geometries, materials, textures, videos, and listeners.
- Add a new effect when the visual model changes; add params when only tuning an existing model.
