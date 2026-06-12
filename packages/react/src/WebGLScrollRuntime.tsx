"use client";

import { useEffect, useRef, type ReactNode } from "react";

import {
  createWebGLScrollRuntime,
  type WebGLAssetResolver,
  type WebGLEffectDefinition,
  type WebGLEffectLifecycleInput,
  type WebGLScrollRuntime as WebGLScrollRuntimeController,
  type WebGLRendererLoopContext,
  type TriggerSnapshot
} from "@webgl-scroll/core";

type EffectInput = WebGLEffectDefinition | WebGLEffectDefinition[];

export type WebGLScrollRuntimeProps = {
  assetResolver?: WebGLAssetResolver;
  canvasClassName?: string;
  children?: ReactNode;
  effects?: EffectInput[];
  exposeDebug?: boolean;
  lifecycle?: WebGLEffectLifecycleInput;
  onAfterRoute?(context: WebGLRendererLoopContext, snapshots: TriggerSnapshot[]): void;
  onBeforeRoute?(context: WebGLRendererLoopContext): void;
  onDispose?(context: WebGLRendererLoopContext): void;
  onRuntime?(runtime: WebGLScrollRuntimeController): void;
  onStart?(context: WebGLRendererLoopContext): void;
};

export function WebGLScrollRuntime({
  assetResolver,
  canvasClassName,
  children,
  effects,
  exposeDebug,
  lifecycle,
  onAfterRoute,
  onBeforeRoute,
  onDispose,
  onRuntime,
  onStart
}: WebGLScrollRuntimeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const runtime = createWebGLScrollRuntime({
      assetResolver,
      canvas,
      effects,
      exposeDebug,
      lifecycle,
      onAfterRoute,
      onBeforeRoute,
      onDispose,
      onStart
    });

    onRuntime?.(runtime);
    runtime.start();

    return () => {
      runtime.dispose();
    };
  }, [
    assetResolver,
    effects,
    exposeDebug,
    lifecycle,
    onAfterRoute,
    onBeforeRoute,
    onDispose,
    onRuntime,
    onStart
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={canvasClassName}
        data-webgl-scroll-runtime="true"
        aria-hidden="true"
      />
      {children}
    </>
  );
}
