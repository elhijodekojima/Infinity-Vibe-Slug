import { Scene, OrthographicCamera, WebGLRenderer, Color } from 'three';
import { WORLD } from '../config/balance';
import { COLORS } from '../config/colors';

/**
 * Three.js renderer wrapper — the Zero-Loading render core.
 *
 * Design:
 *   - OrthographicCamera with fixed WORLD.HEIGHT (270 units); width is
 *     computed from the window aspect ratio. This keeps gameplay always
 *     playable on any aspect without letterbox bars.
 *   - Selective imports from "three" (tree-shaken bundle).
 *   - No post-processing, no shadow maps, no texture loading.
 *   - Canvas fills the viewport. CSS `image-rendering: pixelated` gives the
 *     crisp pixel-art look on non-integer scales.
 */
export class Renderer {
  public readonly scene = new Scene();
  public readonly camera: OrthographicCamera;
  public readonly gl: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.scene.background = new Color(COLORS.BG_DEEP);

    this.camera = new OrthographicCamera(0, WORLD.WIDTH, WORLD.HEIGHT, 0, -100, 100);
    this.camera.position.z = 10;

    this.gl = new WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
    });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  /**
   * Resize the renderer + camera frustum to fit the current window.
   * Call explicitly at boot and on every `window.resize`.
   */
  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;

    const worldH = WORLD.HEIGHT;
    const worldW = worldH * aspect;

    this.camera.left = 0;
    this.camera.right = worldW;
    this.camera.top = worldH;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();

    this.gl.setSize(w, h, true);
  }

  render(): void {
    this.gl.render(this.scene, this.camera);
  }
}
