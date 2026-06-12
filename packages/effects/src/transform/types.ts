export type ObjectRotation = {
  x: number;
  y: number;
  z: number;
};

export type ObjectAutoRotateAxis = "x" | "y" | "z";

export type ObjectAutoRotate = {
  axis: ObjectAutoRotateAxis;
  speed: number;
};

export type ObjectTransform = {
  autoRotate?: ObjectAutoRotate;
  rotation: ObjectRotation;
  scale: number;
};
