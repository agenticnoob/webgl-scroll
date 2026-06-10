import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { WebGLEngineTrigger } from "./WebGLEngineTrigger";

describe("WebGLEngineTrigger", () => {
  it("renders a section element by default", () => {
    const { container } = render(
      <WebGLEngineTrigger trigger="hero" effects={[{ type: "fade-title" }]}>
        <h1>HELLO</h1>
      </WebGLEngineTrigger>
    );

    expect(container.querySelector("section")).not.toBeNull();
  });

  it("renders the specified tag via 'as' prop", () => {
    const { container } = render(
      <WebGLEngineTrigger as="div" trigger="hero" effects={[{ type: "fade-title" }]}>
        <h1>HELLO</h1>
      </WebGLEngineTrigger>
    );

    expect(container.querySelector("div")).not.toBeNull();
    expect(container.querySelector("section")).toBeNull();
  });

  it("serializes effects to data-webgl-effects attribute", () => {
    const effects = [
      { type: "fade-title", layer: "content" as const },
      { type: "dissolve", layer: "overlay" as const, params: { strength: 0.5 } }
    ];

    const { container } = render(
      <WebGLEngineTrigger trigger="hero" scene="intro" effects={effects}>
        <h1>HELLO</h1>
      </WebGLEngineTrigger>
    );

    const section = container.querySelector("section")!;

    expect(section.getAttribute("data-webgl-trigger")).toBe("hero");
    expect(section.getAttribute("data-webgl-scene")).toBe("intro");
    expect(section.getAttribute("data-webgl-effects")).toBe(JSON.stringify([
      { type: "fade-title", layer: "content", params: {} },
      { type: "dissolve", layer: "overlay", params: { strength: 0.5 } }
    ]));
  });

  it("passes start and end attributes", () => {
    const { container } = render(
      <WebGLEngineTrigger
        trigger="hero"
        effects={[{ type: "fade-title" }]}
        start="top 70%"
        end="bottom 30%"
      />
    );

    const section = container.querySelector("section")!;

    expect(section.getAttribute("data-webgl-start")).toBe("top 70%");
    expect(section.getAttribute("data-webgl-end")).toBe("bottom 30%");
  });

  it("applies className when provided", () => {
    const { container } = render(
      <WebGLEngineTrigger
        trigger="hero"
        effects={[{ type: "fade-title" }]}
        className="custom-class"
      />
    );

    expect(container.querySelector(".custom-class")).not.toBeNull();
  });

  it("renders children correctly", () => {
    const { getByText } = render(
      <WebGLEngineTrigger trigger="hero" effects={[{ type: "fade-title" }]}>
        <h1>Title Text</h1>
        <p>Body content</p>
      </WebGLEngineTrigger>
    );

    expect(getByText("Title Text")).not.toBeNull();
    expect(getByText("Body content")).not.toBeNull();
  });

  it("omits undefined optional attributes", () => {
    const { container } = render(
      <WebGLEngineTrigger trigger="hero" effects={[{ type: "fade-title" }]} />
    );

    const section = container.querySelector("section")!;

    expect(section.hasAttribute("data-webgl-scene")).toBe(false);
    expect(section.hasAttribute("data-webgl-start")).toBe(false);
    expect(section.hasAttribute("data-webgl-end")).toBe(false);
  });
});
