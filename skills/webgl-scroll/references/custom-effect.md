# Custom Effect

Create a custom visual with `defineWebGLEffect()`.

```ts
import {
  defineWebGLEffect,
  type EffectContext,
  type RenderContext,
  type TriggerSnapshot
} from "@webgl-scroll/core";

export const rippleEffect = defineWebGLEffect({
  type: "ripple",
  schema: {
    strength: { type: "number", default: 1, min: 0, max: 2 }
  },
  create(_context: EffectContext) {
    // Allocate mesh, material, geometry, or textures here.

    return {
      update(_snapshot: TriggerSnapshot, _context: RenderContext): void {
        // Read progress and write uniforms or transforms here.
      },

      dispose(): void {
        // Dispose all GPU resources and listeners here.
      }
    };
  }
});
```

Rules:

- Do not import app content into an effect.
- Use params for app-provided values.
- Add `schema` when values need coercion or defaults.
- Dispose geometries, materials, textures, videos, and listeners.
- Add a new effect when the visual model changes; add params when only tuning an existing model.
