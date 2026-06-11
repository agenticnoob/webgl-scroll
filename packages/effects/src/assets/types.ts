export type AssetKind = "image" | "video" | "glb";
export type AssetFit = "cover" | "contain" | "stretch";
export type AssetAnchor = "element" | "viewport";
export type VideoPlaybackMode = "loop-while-visible" | "once-on-enter" | "scroll-scrub";
export type CompositeMode = "normal" | "luma-mask" | "alpha-mask" | "multiply" | "screen";

export type AssetPlacement = {
  anchor: AssetAnchor;
  fit: AssetFit;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

export type AssetPlayback = {
  mode: VideoPlaybackMode;
  startTime: number;
  endTime?: number;
};

export type AssetComposite = {
  mode: CompositeMode;
  opacity: number;
  threshold: number;
  feather: number;
};

export type ScrollTransformTuple = ["scroll", number, number];

export type AssetTransform = {
  opacity?: ScrollTransformTuple;
  rotateX?: ScrollTransformTuple;
  rotateY?: ScrollTransformTuple;
  rotateZ?: ScrollTransformTuple;
  scale?: ScrollTransformTuple;
};

export type AssetDescriptor = {
  id: string;
  kind: AssetKind;
  src: string;
  order: number;
  opacity: number;
  placement?: Partial<AssetPlacement>;
  playback?: AssetPlayback;
  composite?: AssetComposite;
  transform?: AssetTransform;
};

export type AssetLayerParams = {
  placement: AssetPlacement;
  assets: AssetDescriptor[];
};
