import type * as THREE from "three";

export type { ActiveThemeTokens } from "./themeTransitionState";

export type CutSample = {
  bottom: number;
  element: HTMLElement;
  index: number;
  top: number;
};

export type CutVideoLayer = {
  mode: "once-on-enter" | "loop-while-visible";
  placement?: {
    height?: number;
    opacity?: number;
    width?: number;
    x?: number;
    y?: number;
  };
  src: string;
};

export type VideoSlot = {
  element: HTMLVideoElement;
  src: string;
  texture?: THREE.VideoTexture;
};

export type TitleLayer = {
  material: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  scene: string;
  source: HTMLElement | null;
  texture: THREE.CanvasTexture;
};

export type ThemeWebGLUniforms = {
  uCutBottom: THREE.IUniform<number>;
  uCutFade: THREE.IUniform<number>;
  uCutFullBottom: THREE.IUniform<number>;
  uCutFullTop: THREE.IUniform<number>;
  uCutTop: THREE.IUniform<number>;
  uFromColor: THREE.IUniform<THREE.Color>;
  uHasCut: THREE.IUniform<number>;
  uHasVideo: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uTime: THREE.IUniform<number>;
  uToColor: THREE.IUniform<THREE.Color>;
  uVideo0: THREE.IUniform<THREE.Texture>;
  uVideo1: THREE.IUniform<THREE.Texture>;
  uVideo2: THREE.IUniform<THREE.Texture>;
  uVideoCount: THREE.IUniform<number>;
  uVideoOpacity0: THREE.IUniform<number>;
  uVideoOpacity1: THREE.IUniform<number>;
  uVideoOpacity2: THREE.IUniform<number>;
  uVideoPlacement0: THREE.IUniform<THREE.Vector4>;
  uVideoPlacement1: THREE.IUniform<THREE.Vector4>;
  uVideoPlacement2: THREE.IUniform<THREE.Vector4>;
};

/**
 * Runtime context shared across WebGL subsystem modules.
 *
 * Each module receives the subset of fields it needs rather than the full
 * context, keeping dependencies explicit and testable.
 *
 * To add a new subsystem (e.g. particle layer):
 *   1. Extend this interface with any new fields.
 *   2. Create a new module in the package that owns the subsystem.
 *   3. Wire it up from the host integration layer.
 */
export type WebGLSceneContext = {
  camera: THREE.OrthographicCamera;
  cutElements: HTMLElement[];
  reducedMotion: boolean;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sections: Array<{ accent?: string; bg: string; fg: string; scene?: string; title?: string }>;
  uniforms: ThemeWebGLUniforms;
};
