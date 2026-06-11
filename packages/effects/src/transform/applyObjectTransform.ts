import type * as THREE from "three";

import type { ObjectTransform } from "./types";

type ApplyObjectTransformOptions = {
  baseScale: number;
  time: number;
  transform: ObjectTransform;
};

export function applyObjectTransform(
  object: THREE.Object3D,
  { baseScale, time, transform }: ApplyObjectTransformOptions
): void {
  object.scale.setScalar(baseScale * transform.scale);
  object.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);

  if (transform.autoRotate) {
    object.rotation[transform.autoRotate.axis] += time * transform.autoRotate.speed;
  }
}
