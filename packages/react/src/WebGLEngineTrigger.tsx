"use client";

import { createElement, type ReactNode } from "react";

import type { EffectDescriptor, WebGLEffectLifecycleInput } from "@webgl-scroll/core";

/**
 * Input type for effect descriptors in the React adapter.
 * `params` is optional (defaults to `{}`), unlike the internal `EffectDescriptor`.
 */
export type EffectDescriptorInput = {
  type: string;
  lifecycle?: WebGLEffectLifecycleInput;
  layer?: "background" | "content" | "overlay";
  params?: Record<string, unknown>;
};

type WebGLEngineTriggerProps = {
  /** HTML element tag to render. Defaults to `"section"`. */
  as?: "article" | "div" | "section";
  /** Children to render inside the trigger element. */
  children?: ReactNode;
  /** CSS class name. */
  className?: string;
  /** ScrollTrigger end expression. */
  end?: string;
  /** Effect descriptors (object-style API, serialized to `data-webgl-effects`). */
  effects: EffectDescriptorInput[];
  /** Lifecycle config for the trigger, serialized to `data-webgl-lifecycle`. */
  lifecycle?: WebGLEffectLifecycleInput;
  /** Scene grouping key for `data-webgl-scene`. */
  scene?: string;
  /** ScrollTrigger start expression. */
  start?: string;
  /** Trigger identifier for `data-webgl-trigger`. */
  trigger: string;
};

/**
 * React adapter that serializes object-style effect descriptors into
 * `data-webgl-effects` JSON attribute. This provides a type-safe API
 * for declaring WebGL effects on DOM trigger elements.
 *
 * @example
 * ```tsx
 * <WebGLEngineTrigger
 *   as="section"
 *   scene="intro"
 *   trigger="hero"
 *   effects={[
 *     { type: "fade-title", layer: "content" },
 *     { type: "pixelated-wipe", layer: "background", params: { cutIndex: 0 } }
 *   ]}
 * >
 *   <h1>HELLO</h1>
 * </WebGLEngineTrigger>
 * ```
 */
export function WebGLEngineTrigger({
  as: Tag = "section",
  children,
  className,
  end,
  effects,
  lifecycle,
  scene,
  start,
  trigger
}: WebGLEngineTriggerProps) {
  // Normalize EffectDescriptorInput to EffectDescriptor (ensure params exists)
  const normalizedEffects: EffectDescriptor[] = effects.map((desc) => ({
    type: desc.type,
    ...(desc.layer != null ? { layer: desc.layer } : {}),
    ...(desc.lifecycle != null ? { lifecycle: desc.lifecycle } : {}),
    params: desc.params ?? {}
  }));

  const dataAttributes: Record<string, string | undefined> = {
    "data-webgl-trigger": trigger,
    "data-webgl-scene": scene,
    "data-webgl-start": start,
    "data-webgl-end": end,
    "data-webgl-lifecycle": lifecycle ? JSON.stringify(lifecycle) : undefined,
    "data-webgl-effects": JSON.stringify(normalizedEffects)
  };

  return createElement(
    Tag,
    { ...dataAttributes, ...(className ? { className } : {}) },
    children
  );
}
