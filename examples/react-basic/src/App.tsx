import { registerBuiltinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger } from "@webgl-scroll/react";

registerBuiltinEffects();

export function App() {
  return (
    <main>
      <WebGLEngineTrigger
        className="section sectionA"
        effects={[{ type: "fade-title", layer: "content", params: { fg: "#f7f2ea" } }]}
        scene="stage"
        trigger="stage-title"
      >
        <h1>Stage</h1>
        <p>React markup emits the same DOM trigger metadata.</p>
      </WebGLEngineTrigger>

      <WebGLEngineTrigger
        as="div"
        className="cut"
        effects={[{ type: "pixelated-wipe", layer: "background", params: { cutIndex: 0 } }]}
        trigger="stage-cut"
      />

      <WebGLEngineTrigger
        className="section sectionB"
        effects={[{ type: "fade-title", layer: "content", params: { fg: "#142334" } }]}
        scene="wipe"
        trigger="wipe-title"
      >
        <h1>Wipe</h1>
        <p>Effects are selected through typed descriptors.</p>
      </WebGLEngineTrigger>
    </main>
  );
}
