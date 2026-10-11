import { Vector3 } from 'three'

/** Sun just below the far ridge, a little right of the valley. */
export const SUN_DIR = new Vector3(0.5, 0.03, -1).normalize()

/** Shared GLSL: dusk gradient, sunset glow, a band of clouds, and stars. Used by the sky dome and the lake. */
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
uniform float uNight;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uTopMix;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

vec3 skyColor(vec3 d, bool withStars) {
  d = normalize(d);
  float h = d.y;
  vec3 zenith  = vec3(0.020, 0.028, 0.075);
  vec3 upper   = vec3(0.075, 0.065, 0.165);
  vec3 lower   = vec3(0.340, 0.180, 0.260);
  vec3 horizon = vec3(0.980, 0.540, 0.300);

  float sunAmt = max(dot(d, uSunDir), 0.0);
  // Horizon warmth gathers toward the sun and cools away from it.
  vec3 hz = mix(vec3(0.46, 0.28, 0.36), horizon, pow(sunAmt, 2.0));
  vec3 c = mix(hz, lower, smoothstep(0.0, 0.07, h));
  c = mix(c, upper, smoothstep(0.05, 0.32, h));
  c = mix(c, zenith, smoothstep(0.28, 0.85, h));
  // Above a painted backdrop, continue the painting's own sky color.
  c = mix(c, mix(uTop, zenith, smoothstep(0.45, 1.0, h) * 0.6), uTopMix * smoothstep(0.12, 0.42, h));
  // Below the horizon: the valley in shadow (the painting's own lower edge when there is one).
  c = mix(c, mix(vec3(0.05, 0.045, 0.1), uBottom, uTopMix), smoothstep(0.0, -0.06, h));

  // Sun glow behind the ridge.
  c += vec3(1.0, 0.50, 0.24) * pow(sunAmt, 10.0) * 0.55 * (1.0 - smoothstep(0.0, 0.3, h));
  c += vec3(1.0, 0.72, 0.46) * pow(sunAmt, 90.0) * 1.1;

  // Clouds: long streaks low in the sky, lit peach from below on the sun side.
  vec2 uv = vec2(atan(d.x, -d.z) * 2.2, h * 14.0);
  float band = smoothstep(0.015, 0.06, h) * (1.0 - smoothstep(0.16, 0.34, h));
  float n = fbm(vec2(uv.x * 1.6 + uTime * 0.004, uv.y * 1.25));
  float cloud = smoothstep(0.52, 0.78, n) * band;
  vec3 cloudLit = mix(vec3(0.16, 0.11, 0.20), vec3(0.95, 0.52, 0.36), pow(sunAmt, 3.0) * 0.9 + 0.08);
  c = mix(c, cloudLit, cloud * 0.85);

  if (withStars) {
    vec2 su = vec2(atan(d.x, -d.z), asin(clamp(h, -1.0, 1.0))) * 160.0;
    vec2 cell = floor(su);
    float r = hash12(cell);
    if (r > 0.985) {
      vec2 center = cell + 0.5 + (vec2(hash12(cell + 3.7), hash12(cell + 9.1)) - 0.5) * 0.6;
      float dist = length(su - center);
      float tw = 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
      float star = smoothstep(0.32, 0.0, dist) * tw * (r - 0.985) * 66.0;
      c += vec3(0.85, 0.88, 1.0) * star * smoothstep(0.12, 0.5, h) * (1.0 - cloud) * uNight;
    }
  }
  // Colors above are authored in sRGB; the renderer works in linear.
  return pow(max(c, 0.0), vec3(2.2));
}
`
