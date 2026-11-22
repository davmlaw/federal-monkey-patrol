// An "old movie" grade for the 3D world. The city is
// still in colour, but washed out towards a silvery black and white.
//
// It is appended to three.js's last fragment chunk, so every built-in
// material (the city, trees, the plane, projectiles) gets it after fog;
// the 2D batcher (draw2d.ts) uses its own shaders and is left alone.
// filmColor() applies the same grade in JS, for things drawn in 2D that
// have to match the 3D scene (the fog-coloured sky).

import * as THREE from 'three';

const FILM_SATURATION = 0.4; // 0 = black and white, 1 = full colour
const CONTRAST = 1.08;
const TINT = [1.015, 1.0, 0.965]; // a faint warm (silver gelatin) tone
const LUMA = [0.299, 0.587, 0.114];

const f = (v: number): string => v.toFixed(4);
THREE.ShaderChunk.dithering_fragment = `
{
  vec3 c = gl_FragColor.rgb;
  float l = dot(c, vec3(${LUMA.map(f).join(', ')}));
  c = mix(vec3(l), c, ${f(FILM_SATURATION)});
  c = (c - 0.5) * ${f(CONTRAST)} + 0.5;
  gl_FragColor.rgb = clamp(c * vec3(${TINT.map(f).join(', ')}), 0.0, 1.0);
}
${THREE.ShaderChunk.dithering_fragment}`;

/** The grade applied to an [r, g, b] colour (0..1). */
export function filmColor([r, g, b]: readonly number[]): [number, number, number] {
  const l = r * LUMA[0] + g * LUMA[1] + b * LUMA[2];
  return [r, g, b].map((v, i) => {
    const c = (l + (v - l) * FILM_SATURATION - 0.5) * CONTRAST + 0.5;
    return Math.max(0, Math.min(1, c * TINT[i]));
  }) as [number, number, number];
}
