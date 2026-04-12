import { Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { WORLD } from '../config/balance';
import { COLORS } from '../config/colors';

/**
 * Procedural parallax background — ZERO external assets.
 *
 * A single unit-sized quad, scaled to the current camera frustum on resize.
 * The shader draws:
 *   - Ground band (y < uGroundY) with scrolling pseudo-noise "debris".
 *   - Sky gradient (y >= uGroundY) from BG_MID → BG_DEEP.
 *   - A mid-range "far hills" band mixed in for parallax feel.
 *   - Sparse scrolling stars/dots in the sky.
 */
export class Background {
  public readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly offsetUniform: { value: number };
  private offset = 0;

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uOffset: { value: 0 },
        uGroundY: { value: WORLD.GROUND_Y / WORLD.HEIGHT },
        uColBgDeep: { value: hexToVec3(COLORS.BG_DEEP) },
        uColBgMid: { value: hexToVec3(COLORS.BG_MID) },
        uColBgFar: { value: hexToVec3(COLORS.BG_FAR) },
        uColGround: { value: hexToVec3(COLORS.GROUND) },
        uColGroundEdge: { value: hexToVec3(COLORS.GROUND_EDGE) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: false,
    });
    this.offsetUniform = this.material.uniforms['uOffset'] as { value: number };

    const geometry = new PlaneGeometry(1, 1);
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.position.z = -5;
  }

  /** Called on window resize — matches the camera frustum. */
  resize(worldW: number, worldH: number): void {
    this.mesh.scale.set(worldW, worldH, 1);
    this.mesh.position.set(worldW / 2, worldH / 2, -5);
  }

  update(dt: number, speed: number): void {
    this.offset += dt * speed;
    this.offsetUniform.value = this.offset;
  }
}

function hexToVec3(hex: number): Vector3 {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return new Vector3(r, g, b);
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision mediump float;

varying vec2 vUv;
uniform float uOffset;
uniform float uGroundY;
uniform vec3 uColBgDeep;
uniform vec3 uColBgMid;
uniform vec3 uColBgFar;
uniform vec3 uColGround;
uniform vec3 uColGroundEdge;

// cheap deterministic hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.0, 289.0))) * 45758.5453);
}

void main() {
  float y = vUv.y;
  vec3 col;

  if (y < uGroundY) {
    // --- GROUND ---
    float edge = smoothstep(uGroundY - 0.01, uGroundY, y);
    col = mix(uColGround, uColGroundEdge, 1.0 - y / uGroundY);
    col += edge * 0.15;
    // scrolling debris dots
    vec2 cell = floor(vec2(vUv.x * 240.0 + uOffset * 0.6, y * 160.0));
    col *= 0.82 + 0.22 * hash(cell);
  } else {
    // --- SKY ---
    float t = (y - uGroundY) / (1.0 - uGroundY);
    col = mix(uColBgMid, uColBgDeep, smoothstep(0.0, 1.0, t));

    // Far parallax band (distant hills / haze).
    float farBand = smoothstep(0.08, 0.22, t) * (1.0 - smoothstep(0.22, 0.36, t));
    col = mix(col, uColBgFar, farBand * 0.55);

    // Sparse scrolling star/dot layer.
    vec2 starCell = floor(vec2(vUv.x * 320.0 + uOffset * 0.15, y * 200.0));
    float star = step(0.985, hash(starCell));
    col += star * 0.25;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
