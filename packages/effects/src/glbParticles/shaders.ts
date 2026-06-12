export const glbParticlesSimulationVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const glbParticlesVelocityFragmentShader = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uCurrentPositionTexture;
uniform sampler2D uOriginTexture;
uniform sampler2D uVelocityTexture;
uniform vec3 uPointer;
uniform float uDeltaTime;
uniform float uDamping;
uniform float uHasState;
uniform float uPointerRadius;
uniform float uPointerStrength;
uniform float uReturnForce;
uniform float uScatterForce;

void main() {
  vec3 origin = texture2D(uOriginTexture, vUv).xyz;
  vec3 position = mix(origin, texture2D(uCurrentPositionTexture, vUv).xyz, uHasState);
  vec3 velocity = mix(vec3(0.0), texture2D(uVelocityTexture, vUv).xyz, uHasState);
  vec3 toOrigin = origin - position;
  velocity += toOrigin * uReturnForce * uDeltaTime;

  float d = distance(position.xy, uPointer.xy);
  float influence = smoothstep(uPointerRadius, 0.0, d) * uPointerStrength;
  vec3 away = normalize(vec3(position.xy - uPointer.xy, 0.18));
  velocity += away * influence * uScatterForce * uDeltaTime;
  velocity *= pow(uDamping, uDeltaTime * 60.0);

  gl_FragColor = vec4(velocity, 1.0);
}
`;

export const glbParticlesPositionFragmentShader = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uOriginTexture;
uniform sampler2D uPositionTexture;
uniform sampler2D uVelocityTexture;
uniform float uHasState;

void main() {
  vec3 origin = texture2D(uOriginTexture, vUv).xyz;
  vec3 position = mix(origin, texture2D(uPositionTexture, vUv).xyz, uHasState);
  vec3 velocity = texture2D(uVelocityTexture, vUv).xyz;

  gl_FragColor = vec4(position + velocity, 1.0);
}
`;

export const glbParticlesRenderVertexShader = `
precision highp float;

attribute vec2 aParticleUv;

varying float vDepth;

uniform sampler2D uOriginTexture;
uniform sampler2D uPositionTexture;
uniform float uPointSize;
uniform vec3 uPointer;
uniform float uPointerRadius;
uniform float uPointerStrength;
uniform float uRenderScatter;
uniform float uUseSimulationTexture;

void main() {
  vec3 origin = texture2D(uOriginTexture, aParticleUv).xyz;
  vec3 simulated = texture2D(uPositionTexture, aParticleUv).xyz;
  vec3 particlePosition = mix(origin, simulated, uUseSimulationTexture);
  float d = distance(particlePosition.xy, uPointer.xy);
  float influence = smoothstep(uPointerRadius, 0.0, d) * uPointerStrength;
  vec3 away = normalize(vec3(particlePosition.xy - uPointer.xy, 0.12));
  particlePosition += away * influence * uRenderScatter;
  vec4 mvPosition = modelViewMatrix * vec4(particlePosition, 1.0);

  vDepth = particlePosition.z;
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointSize;
}
`;

export const glbParticlesRenderFragmentShader = `
precision highp float;

varying float vDepth;

uniform vec3 uColor;

void main() {
  vec2 point = gl_PointCoord - vec2(0.5);
  float alpha = smoothstep(0.5, 0.2, length(point));
  gl_FragColor = vec4(uColor * (0.85 + vDepth * 0.25), alpha);
}
`;
