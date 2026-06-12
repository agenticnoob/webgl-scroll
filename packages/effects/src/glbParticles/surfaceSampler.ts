import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

export async function loadGLBParticleOrigins(src: string, size: number): Promise<Float32Array> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(src);

  return sampleGLBParticleOrigins(gltf.scene, size);
}

export async function parseGLBParticleOrigins(
  buffer: ArrayBuffer,
  size: number
): Promise<Float32Array> {
  const loader = new GLTFLoader();
  const gltf = await new Promise<{ scene: THREE.Object3D }>((resolve, reject) => {
    loader.parse(buffer, "", resolve, reject);
  });

  return sampleGLBParticleOrigins(gltf.scene, size);
}

export function sampleGLBParticleOrigins(
  scene: THREE.Object3D,
  size: number
): Float32Array {
  const meshes: THREE.Mesh[] = [];

  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      meshes.push(mesh);
    }
  });

  const particleCount = size * size;
  const origins = new Float32Array(particleCount * 3);

  if (meshes.length === 0) {
    return origins;
  }

  const samplers = meshes.map((mesh) => ({
    mesh,
    sampler: new MeshSurfaceSampler(mesh).build()
  }));
  const position = new THREE.Vector3();

  for (let index = 0; index < particleCount; index++) {
    const entry = samplers[index % samplers.length];
    entry.sampler.sample(position);
    position.applyMatrix4(entry.mesh.matrixWorld);
    origins[index * 3] = position.x;
    origins[index * 3 + 1] = position.y;
    origins[index * 3 + 2] = position.z;
  }

  normalizeOrigins(origins);

  return origins;
}

function normalizeOrigins(origins: Float32Array): void {
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (let index = 0; index < origins.length; index += 3) {
    min.x = Math.min(min.x, origins[index]);
    min.y = Math.min(min.y, origins[index + 1]);
    min.z = Math.min(min.z, origins[index + 2]);
    max.x = Math.max(max.x, origins[index]);
    max.y = Math.max(max.y, origins[index + 1]);
    max.z = Math.max(max.z, origins[index + 2]);
  }

  const center = min.clone().add(max).multiplyScalar(0.5);
  const size = max.clone().sub(min);
  const scale = 1 / Math.max(size.x, size.y, size.z, 0.001);

  for (let index = 0; index < origins.length; index += 3) {
    origins[index] = (origins[index] - center.x) * scale;
    origins[index + 1] = (origins[index + 1] - center.y) * scale;
    origins[index + 2] = (origins[index + 2] - center.z) * scale;
  }
}
