import * as THREE from "three";

export type ParticleDataTextures = {
  originData: Float32Array;
  originTexture: THREE.DataTexture;
  positionData: Float32Array;
  positionTexture: THREE.DataTexture;
  velocityData: Float32Array;
  velocityTexture: THREE.DataTexture;
};

export function createParticleDataTextures(options: {
  origins: Float32Array;
  size: number;
}): ParticleDataTextures {
  const particleCount = options.size * options.size;
  const originData = new Float32Array(particleCount * 4);
  const positionData = new Float32Array(particleCount * 4);
  const velocityData = new Float32Array(particleCount * 4);

  for (let index = 0; index < particleCount; index++) {
    const sourceIndex = (index * 3) % options.origins.length;
    const targetIndex = index * 4;
    const x = options.origins[sourceIndex] ?? 0;
    const y = options.origins[sourceIndex + 1] ?? 0;
    const z = options.origins[sourceIndex + 2] ?? 0;

    originData[targetIndex] = x;
    originData[targetIndex + 1] = y;
    originData[targetIndex + 2] = z;
    originData[targetIndex + 3] = 1;
    positionData[targetIndex] = x;
    positionData[targetIndex + 1] = y;
    positionData[targetIndex + 2] = z;
    positionData[targetIndex + 3] = 1;
  }

  return {
    originData,
    originTexture: createTexture(originData, options.size),
    positionData,
    positionTexture: createTexture(positionData, options.size),
    velocityData,
    velocityTexture: createTexture(velocityData, options.size)
  };
}

function createTexture(data: Float32Array, size: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}
