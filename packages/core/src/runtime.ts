import type * as THREE from "three";

import type { WebGLAssetResolver, WebGLResolvedAsset } from "./assets";
import { scanElement } from "./domEffectParser";
import { EffectRouter } from "./effectRouter";
import { registerEffect } from "./effectRegistry";
import type { TriggerSnapshot, WebGLEffectDefinition } from "./effectTypes";
import type { WebGLEffectLifecycleInput } from "./lifecycle";
import { createWebGLPointerBridge } from "./pointerBridge";
import type { WebGLPointerState } from "./pointerState";
import { WebGLRendererLoop, type WebGLRendererLoopContext } from "./webglRendererLoop";
import { createWebGLScrollTriggerBridge } from "./webglScrollTriggers";
import { sharedStateTree } from "./webglStateTree";

type EffectInput = WebGLEffectDefinition | WebGLEffectDefinition[];

export type WebGLScrollDebugState = {
  isStarted: boolean;
  routerSize: number;
  snapshots: TriggerSnapshot[];
  triggerCount: number;
  pointer: WebGLPointerState;
  viewport: { height: number; width: number };
};

export type WebGLScrollDebugApi = {
  getState(): WebGLScrollDebugState;
  getScene(): THREE.Scene;
};

export type WebGLScrollRuntimeOptions = {
  assetResolver?: WebGLAssetResolver;
  canvas: HTMLCanvasElement;
  effects?: EffectInput[];
  eventTarget?: HTMLElement | Window;
  exposeDebug?: boolean;
  lifecycle?: WebGLEffectLifecycleInput;
  reducedMotion?: boolean;
  root?: ParentNode;
  onAfterRoute?(context: WebGLRendererLoopContext, snapshots: TriggerSnapshot[]): void;
  onBeforeRoute?(context: WebGLRendererLoopContext): void;
  onDispose?(context: WebGLRendererLoopContext): void;
  onResize?(viewport: { height: number; width: number }, context: WebGLRendererLoopContext): void;
  onStart?(context: WebGLRendererLoopContext): void;
};

export type WebGLScrollRuntime = {
  readonly camera: THREE.OrthographicCamera;
  readonly debug: WebGLScrollDebugApi;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  dispose(): void;
  resize(): void;
  start(): void;
  syncScrollTriggers(reducedMotion?: boolean): void;
};

declare global {
  interface Window {
    __webglScrollDebug?: WebGLScrollDebugApi;
  }
}

export function createWebGLScrollRuntime(options: WebGLScrollRuntimeOptions): WebGLScrollRuntime {
  const root = options.root ?? document;
  const rendererLoop = new WebGLRendererLoop(options.canvas);
  const assetResolver = options.assetResolver ?? createDefaultAssetResolver();
  const effectRouter = new EffectRouter({
    assetResolver,
    lifecycle: options.lifecycle
  });
  const pointerBridge = createWebGLPointerBridge({
    eventTarget: options.eventTarget ?? window,
    target: options.canvas
  });
  let cleanupPointerFrame = () => {};
  let cleanupWebGLScrollTriggers = () => {};
  let disposed = false;
  let isStarted = false;
  let lastRoutedSnapshots: TriggerSnapshot[] = [];
  let reducedMotion = options.reducedMotion ?? false;

  const debug: WebGLScrollDebugApi = {
    getScene: () => rendererLoop.context.scene,
    getState: () => ({
      isStarted,
      pointer: { ...sharedStateTree.pointer },
      routerSize: effectRouter.size,
      snapshots: lastRoutedSnapshots,
      triggerCount: Object.keys(sharedStateTree.triggers).length,
      viewport: rendererLoop.context.viewport
    })
  };

  const routeCurrentSnapshots = (context: WebGLRendererLoopContext) => {
    const snapshots = getRoutedSnapshots(root);
    lastRoutedSnapshots = snapshots;
    effectRouter.routeAll(snapshots, context);
    return snapshots;
  };

  const syncScrollTriggers = (nextReducedMotion = reducedMotion) => {
    reducedMotion = nextReducedMotion;
    cleanupWebGLScrollTriggers();
    cleanupWebGLScrollTriggers = createWebGLScrollTriggerBridge({
      reducedMotion,
      root
    });
    routeCurrentSnapshots(rendererLoop.context);
  };

  const handleResize = () => {
    runtime.resize();
  };

  const runtime: WebGLScrollRuntime = {

    camera: rendererLoop.context.camera,
    debug,
    renderer: rendererLoop.context.renderer,
    scene: rendererLoop.context.scene,

    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      cleanupWebGLScrollTriggers();
      cleanupPointerFrame();
      pointerBridge.dispose();
      window.removeEventListener("resize", handleResize);
      effectRouter.disposeAll();
      options.onDispose?.(rendererLoop.context);
      rendererLoop.dispose();

      if (window.__webglScrollDebug === debug) {
        delete window.__webglScrollDebug;
      }
    },

    resize() {
      const viewport = rendererLoop.resize();
      effectRouter.resize(viewport);
      options.onResize?.(viewport, rendererLoop.context);
    },

    start() {
      if (isStarted) {
        return;
      }

      isStarted = true;
      for (const effect of flattenEffects(options.effects ?? [])) {
        registerEffect(effect);
      }

      cleanupPointerFrame = rendererLoop.addBeforeRenderHook(pointerBridge.update);
      options.onStart?.(rendererLoop.context);
      this.resize();
      syncScrollTriggers();
      window.addEventListener("resize", handleResize);
      rendererLoop.start((context) => {
        options.onBeforeRoute?.(context);
        const snapshots = routeCurrentSnapshots(context);
        options.onAfterRoute?.(context, snapshots);
      });

      if (shouldExposeDebug(options.exposeDebug)) {
        window.__webglScrollDebug = debug;
      }
    },

    syncScrollTriggers
  };

  return runtime;
}

export function createDefaultAssetResolver(): WebGLAssetResolver {
  return {
    async resolve(request): Promise<WebGLResolvedAsset | undefined> {
      if (typeof fetch !== "function") {
        return undefined;
      }

      const response = await fetch(request.src);

      if (!response.ok) {
        throw new Error(`[webgl-scroll] Failed to fetch ${request.src}: ${response.status}`);
      }

      const blob = await response.blob();

      return request.kind === "binary" || request.kind === "glb"
        ? { kind: "arrayBuffer", value: await blob.arrayBuffer() }
        : { kind: "blob", value: blob };
    }
  };
}

function flattenEffects(effects: EffectInput[]): WebGLEffectDefinition[] {
  return effects.flatMap((effect) => (Array.isArray(effect) ? effect : [effect]));
}

function getRoutedSnapshots(root: ParentNode): TriggerSnapshot[] {
  const snapshots = sharedStateTree.getAllSnapshots();

  return snapshots.length > 0 ? snapshots : getBootstrapSnapshots(root);
}

function getBootstrapSnapshots(root: ParentNode): TriggerSnapshot[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-webgl-trigger]")).flatMap(
    (element, index) => {
      const metadata = scanElement(element, index);

      return metadata.effects.map((effect, effectIndex) => {
        const cutIndex =
          typeof effect.params.cutIndex === "number" ? effect.params.cutIndex : undefined;

        return {
          ...(cutIndex != null ? { cutIndex } : {}),
          direction: 0,
          effect: effect.type,
          element,
          end: metadata.end,
          id: `${metadata.id}:${effect.type}:${effectIndex}`,
          isActive: false,
          ...(effect.lifecycle ?? metadata.lifecycle
            ? { lifecycleConfigInput: { ...metadata.lifecycle, ...effect.lifecycle } }
            : {}),
          params: effect.params,
          progress: 0,
          scene: metadata.scene,
          start: metadata.start,
          velocity: 0
        };
      });
    }
  );
}

function shouldExposeDebug(exposeDebug: boolean | undefined) {
  if (exposeDebug != null) {
    return exposeDebug;
  }

  return (
    process.env.NODE_ENV !== "production" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}
