import * as THREE from "three";

export function createParticleGeometry(size: number): THREE.BufferGeometry {
  const particleCount = size * size;
  const positions = new Float32Array(particleCount * 3);
  const particleUvs = new Float32Array(particleCount * 2);

  for (let index = 0; index < particleCount; index++) {
    const x = index % size;
    const y = Math.floor(index / size);
    particleUvs[index * 2] = (x + 0.5) / size;
    particleUvs[index * 2 + 1] = (y + 0.5) / size;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aParticleUv", new THREE.BufferAttribute(particleUvs, 2));

  return geometry;
}
