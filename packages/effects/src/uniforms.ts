import * as THREE from "three";

import type { ThemeWebGLUniforms } from "./types";

export type ThemeStop = {
  accent: string;
  bg: string;
  fg: string;
  scene?: string;
  title?: string;
};

export const DPR_CAP = 1.5;
export const FADE_HALF_LIFE_SECONDS = 0.12;
export const MAX_CUT_VIDEOS = 3;
export const TITLE_TEXTURE_FONT =
  '300px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif';

export function createFallbackTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);

  texture.needsUpdate = true;

  return texture;
}

export type UniformsBundle = {
  fallbackTexture: THREE.DataTexture;
  uniforms: ThemeWebGLUniforms;
};

export function createUniforms(sections: ThemeStop[]): UniformsBundle {
  const fallbackTexture = createFallbackTexture();
  const initialBg = sections[0]?.bg ?? "#142334";

  return {
    fallbackTexture,
    uniforms: {
      uCutBottom: { value: 0 },
      uCutFade: { value: 0 },
      uCutFullBottom: { value: 0 },
      uCutFullTop: { value: 0 },
      uCutTop: { value: 0 },
      uFromColor: { value: new THREE.Color(initialBg) },
      uHasCut: { value: 0 },
      uHasVideo: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uToColor: { value: new THREE.Color(initialBg) },
      uVideo0: { value: fallbackTexture },
      uVideo1: { value: fallbackTexture },
      uVideo2: { value: fallbackTexture },
      uVideoCount: { value: 0 },
      uVideoOpacity0: { value: 0 },
      uVideoOpacity1: { value: 0 },
      uVideoOpacity2: { value: 0 },
      uVideoPlacement0: { value: new THREE.Vector4(0, 0, 1, 1) },
      uVideoPlacement1: { value: new THREE.Vector4(0, 0, 1, 1) },
      uVideoPlacement2: { value: new THREE.Vector4(0, 0, 1, 1) }
    }
  };
}
