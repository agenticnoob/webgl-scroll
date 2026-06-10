export const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = `
precision mediump float;

uniform vec3 uFromColor;
uniform vec3 uToColor;
uniform vec2 uResolution;
uniform float uCutBottom;
uniform float uCutFade;
uniform float uCutFullBottom;
uniform float uCutFullTop;
uniform float uCutTop;
uniform float uHasCut;
uniform float uHasVideo;
uniform float uTime;
uniform float uVideoCount;
uniform float uVideoOpacity0;
uniform float uVideoOpacity1;
uniform float uVideoOpacity2;
uniform sampler2D uVideo0;
uniform sampler2D uVideo1;
uniform sampler2D uVideo2;
uniform vec4 uVideoPlacement0;
uniform vec4 uVideoPlacement1;
uniform vec4 uVideoPlacement2;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothNoise(float x, float scale, float salt) {
  float scaled = x * scale;
  float cell = floor(scaled);
  float local = fract(scaled);
  float eased = smoothstep(0.0, 1.0, local);
  float left = hash(vec2(cell, salt)) - 0.5;
  float right = hash(vec2(cell + 1.0, salt)) - 0.5;

  return mix(left, right, eased);
}

float ridge(float x) {
  float broad = smoothNoise(x, 8.0, 4.0) * 0.24;
  float mid = smoothNoise(x, 24.0, 12.0) * 0.14;
  float fine = smoothNoise(x, 74.0, 28.0) * 0.07;
  float drift = sin((x * 2.8 + uTime * 0.025) * 6.28318530718) * 0.035;

  return 0.46 + broad + mid + fine + drift;
}

vec3 cutColor(vec2 uv, float screenY) {
  if (uHasCut < 0.5 || uCutFade <= 0.001) {
    return uFromColor;
  }

  if (screenY < uCutTop) {
    return uFromColor;
  }

  if (screenY > uCutBottom) {
    return uToColor;
  }

  float cutHeight = max(uCutBottom - uCutTop, 1.0);
  float yProgress = clamp((screenY - uCutTop) / cutHeight, 0.0, 1.0);
  float cellSize = mix(3.0, 7.0, smoothstep(640.0, 1800.0, uResolution.x));
  vec2 pixelCell = floor(gl_FragCoord.xy / cellSize);
  float xProgress = clamp(pixelCell.x * cellSize / max(uResolution.x, 1.0), 0.0, 1.0);
  float edge = ridge(xProgress);
  float bandStart = edge - 0.16;
  float bandEnd = edge + 0.22;
  float density = 1.0 - smoothstep(bandStart, bandEnd, yProgress);
  float grain = hash(pixelCell + vec2(1.0, 17.0));
  float secondary = hash(pixelCell * vec2(2.0, 3.0) + vec2(11.0, 31.0));
  float threshold = clamp(density + (secondary - 0.5) * 0.12, 0.0, 1.0);
  float softness = mix(0.055, 0.018, uCutFade);
  float headMask = 1.0 - smoothstep(bandStart - 0.035, bandStart + 0.02, yProgress);
  float pixelMask = 1.0 - smoothstep(threshold - softness, threshold + softness, grain);
  float fromMask = max(headMask, pixelMask);
  vec3 cutTone = mix(uToColor, uFromColor, fromMask);
  float topFade = smoothstep(0.0, 0.08, yProgress);
  float bottomFade = smoothstep(1.0, 0.92, yProgress);
  vec3 boundedTone = mix(uToColor, mix(uFromColor, cutTone, topFade), bottomFade);

  return mix(uFromColor, boundedTone, uCutFade);
}

float sampleVideoLayer(sampler2D video, vec4 placement, float opacity, vec2 cutUv, float mediaFade) {
  vec2 size = max(placement.zw, vec2(0.001));
  vec2 localUv = (cutUv - placement.xy) / size;
  float inside =
    step(0.0, localUv.x) *
    step(localUv.x, 1.0) *
    step(0.0, localUv.y) *
    step(localUv.y, 1.0);

  if (inside < 0.5) {
    return 0.0;
  }

  vec4 videoSample = texture2D(video, vec2(localUv.x, 1.0 - localUv.y));
  float luma = dot(videoSample.rgb, vec3(0.299, 0.587, 0.114));
  float layerEdgeFade =
    smoothstep(0.0, 0.08, localUv.x) *
    smoothstep(1.0, 0.92, localUv.x) *
    smoothstep(0.0, 0.08, localUv.y) *
    smoothstep(1.0, 0.92, localUv.y);

  return smoothstep(0.16, 0.58, luma) * opacity * mediaFade * layerEdgeFade;
}

void main() {
  float screenY = (1.0 - vUv.y) * uResolution.y;
  vec3 base = cutColor(vUv, screenY);

  if (uHasVideo > 0.5 && uHasCut > 0.5 && screenY >= uCutTop && screenY <= uCutBottom) {
    float cutHeight = max(uCutFullBottom - uCutFullTop, 1.0);
    float yProgress = clamp((screenY - uCutFullTop) / cutHeight, 0.0, 1.0);
    float mediaEdgeFade = smoothstep(0.0, 0.08, yProgress) * smoothstep(1.0, 0.92, yProgress);
    vec2 cutUv = vec2(vUv.x, yProgress);
    float brandMask = 0.0;

    if (uVideoCount > 0.5) {
      brandMask = max(
        brandMask,
        sampleVideoLayer(uVideo0, uVideoPlacement0, uVideoOpacity0, cutUv, uCutFade * mediaEdgeFade)
      );
    }

    if (uVideoCount > 1.5) {
      brandMask = max(
        brandMask,
        sampleVideoLayer(uVideo1, uVideoPlacement1, uVideoOpacity1, cutUv, uCutFade * mediaEdgeFade)
      );
    }

    if (uVideoCount > 2.5) {
      brandMask = max(
        brandMask,
        sampleVideoLayer(uVideo2, uVideoPlacement2, uVideoOpacity2, cutUv, uCutFade * mediaEdgeFade)
      );
    }

    vec3 contrastVideoColor = distance(base, uFromColor) <= distance(base, uToColor) ? uToColor : uFromColor;
    base = mix(base, contrastVideoColor, brandMask);
  }

  float vignette = smoothstep(1.05, 0.22, distance(vUv, vec2(0.5)));
  vec3 tone = base * (0.98 + vignette * 0.08);

  gl_FragColor = vec4(tone, 1.0);
}
`;
