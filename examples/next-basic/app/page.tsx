"use client";

import { registerBuiltinEffects } from "@webgl-scroll/effects";
import { WebGLEngineTrigger } from "@webgl-scroll/react";

registerBuiltinEffects();

export default function Page() {
  return (
    <main>
      <WebGLEngineTrigger
        className="section sectionA"
        effects={[{ type: "fade-title", layer: "content", params: { fg: "#f7f2ea" } }]}
        scene="stage"
        trigger="stage-title"
      >
        <h1>Stage</h1>
        <p>FadeTitleEffect tracks this title as a WebGL layer.</p>
      </WebGLEngineTrigger>

      <WebGLEngineTrigger
        as="div"
        className="cut"
        effects={[
          {
            type: "pixelated-wipe",
            layer: "background",
            params: { bg: "#142334", cutIndex: 0, fg: "#baccd9" }
          }
        ]}
        trigger="stage-cut"
      />

      <WebGLEngineTrigger
        className="section sectionB"
        effects={[{ type: "fade-title", layer: "content", params: { fg: "#142334" } }]}
        scene="wipe"
        trigger="wipe-title"
      >
        <h1>Wipe</h1>
        <p>PixelatedWipeEffect creates a scene transition between sections.</p>
      </WebGLEngineTrigger>
    </main>
  );
}
