import * as THREE from "three";

const DPR_CAP = 1.5;

export type WebGLRendererLoopViewport = {
  height: number;
  width: number;
};

export type WebGLRendererLoopContext = {
  camera: THREE.OrthographicCamera;
  deltaTime: number;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  time: number;
  viewport: WebGLRendererLoopViewport;
};

export type WebGLRendererLoopOptions = {
  getDevicePixelRatio?: () => number;
  getNow?: () => number;
  getViewport?: () => WebGLRendererLoopViewport;
  rendererFactory?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
};

export type WebGLRendererLoopHook = (context: WebGLRendererLoopContext) => void;

const defaultViewport = () => ({
  height: Math.max(window.innerHeight, 1),
  width: Math.max(window.innerWidth, 1)
});

export class WebGLRendererLoop {
  readonly context: WebGLRendererLoopContext;

  private readonly getDevicePixelRatio: () => number;
  private readonly getNow: () => number;
  private readonly getViewport: () => WebGLRendererLoopViewport;
  private lastFrameTime: number;
  private readonly beforeRenderHooks = new Set<WebGLRendererLoopHook>();
  private readonly startTime: number;

  constructor(canvas: HTMLCanvasElement, options: WebGLRendererLoopOptions = {}) {
    const renderer =
      options.rendererFactory?.(canvas) ??
      new THREE.WebGLRenderer({
        alpha: false,
        antialias: false,
        canvas,
        powerPreference: "high-performance"
      });

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.getDevicePixelRatio =
      options.getDevicePixelRatio ?? (() => window.devicePixelRatio || 1);
    this.getNow = options.getNow ?? (() => performance.now());
    this.getViewport = options.getViewport ?? defaultViewport;
    this.startTime = this.getNow();
    this.lastFrameTime = this.startTime;

    this.context = {
      camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      deltaTime: 0,
      renderer,
      scene: new THREE.Scene(),
      time: 0,
      viewport: { height: 1, width: 1 }
    };

    this.resize();
  }

  resize(): WebGLRendererLoopViewport {
    const viewport = this.getViewport();
    const width = Math.max(viewport.width, 1);
    const height = Math.max(viewport.height, 1);

    this.context.viewport = { height, width };
    this.context.renderer.setPixelRatio(Math.min(this.getDevicePixelRatio(), DPR_CAP));
    this.context.renderer.setSize(width, height, false);

    return this.context.viewport;
  }

  start(onFrame: (context: WebGLRendererLoopContext) => void): void {
    this.context.renderer.setAnimationLoop(() => {
      const now = this.getNow();

      this.context.deltaTime = (now - this.lastFrameTime) / 1000;
      this.context.time = (now - this.startTime) / 1000;
      this.lastFrameTime = now;

      for (const hook of this.beforeRenderHooks) {
        hook(this.context);
      }
      onFrame(this.context);
      this.context.renderer.render(this.context.scene, this.context.camera);
    });
  }

  addBeforeRenderHook(hook: WebGLRendererLoopHook): () => void {
    this.beforeRenderHooks.add(hook);

    return () => {
      this.beforeRenderHooks.delete(hook);
    };
  }

  stop(): void {
    this.context.renderer.setAnimationLoop(null);
  }

  dispose(): void {
    this.stop();
    this.context.renderer.dispose();
  }
}
