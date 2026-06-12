export type WebGLAssetKind = "image" | "video" | "glb" | "binary";

export type WebGLAssetRequest = {
  effect: string;
  id?: string;
  kind: WebGLAssetKind;
  src: string;
};

export type WebGLResolvedAsset =
  | { kind: "arrayBuffer"; value: ArrayBuffer }
  | { kind: "blob"; value: Blob }
  | { kind: "imageBitmap"; value: ImageBitmap }
  | { kind: "texture"; value: unknown }
  | { kind: "video"; value: HTMLVideoElement };

export type WebGLAssetResolver = {
  resolve(request: WebGLAssetRequest): Promise<WebGLResolvedAsset | undefined>;
};
