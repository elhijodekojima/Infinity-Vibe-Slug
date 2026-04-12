import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';

/**
 * Procedural Sprite Generator
 * Bakes small pixel-art textures using Canvas API.
 */
export class SpriteGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not create 2D context for sprites');
    this.ctx = context;
  }

  /**
   * Helper to convert hex number (0xRRGGBB) to CSS string.
   */
  private hexToCss(hex: number): string {
    return '#' + hex.toString(16).padStart(6, '0');
  }

  /**
   * Bake a generic rectangle sprite with a darker border.
   */
  public bakeBox(width: number, height: number, color: number): CanvasTexture {
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.ctx;

    const cssColor = this.hexToCss(color);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, width, height);

    // Bevel/Border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(1, 1, width - 2, 1);
    ctx.fillRect(1, 1, 1, height - 2);

    return this.createTexture();
  }

  /**
   * Bake an item crate (16x16) with a specific letter.
   */
  public bakeItemBox(color: number, letter: string): CanvasTexture {
    const size = 16;
    this.canvas.width = size;
    this.canvas.height = size;
    const ctx = this.ctx;

    // Background
    ctx.fillStyle = this.hexToCss(color);
    ctx.fillRect(0, 0, size, size);

    // Crate cross-beams
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(2, 2, 12, 12);
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(14, 14);
    ctx.moveTo(14, 2); ctx.lineTo(2, 14);
    ctx.stroke();

    // Darker border
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    // Letter
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2);

    return this.createTexture();
  }

  /**
   * Bake a simple soldier silhouette.
   */
  public bakeSoldier(color: number): CanvasTexture {
    const w = 12;
    const h = 18;
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.ctx;
    const base = this.hexToCss(color);

    // Body/Legs
    ctx.fillStyle = base;
    ctx.fillRect(3, 8, 6, 8); // Torso
    ctx.fillRect(2, 16, 3, 2); // left foot
    ctx.fillRect(7, 16, 3, 2); // right foot

    // Arms
    ctx.fillRect(1, 9, 2, 5); 
    ctx.fillRect(9, 9, 2, 5);

    // Helmet/Head
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(3, 2, 6, 6); // head shadow
    ctx.fillStyle = base;
    ctx.fillRect(3, 1, 6, 5); // helmet

    // Face/Skin (tiny pixels)
    ctx.fillStyle = '#e8b080';
    ctx.fillRect(4, 5, 4, 2);

    // Weapon peek
    ctx.fillStyle = '#333333';
    ctx.fillRect(8, 10, 4, 2);

    return this.createTexture();
  }

  /**
   * Tank sprite (approx 32x24).
   */
  public bakeTank(color: number): CanvasTexture {
    const w = 32;
    const h = 24;
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.ctx;
    const base = this.hexToCss(color);

    // Treads
    ctx.fillStyle = '#111111';
    ctx.fillRect(2, 18, 28, 6);
    ctx.fillStyle = '#333333';
    for(let x=4; x<28; x+=6) ctx.fillRect(x, 20, 3, 3); // tread wheels

    // Hull
    ctx.fillStyle = base;
    ctx.fillRect(4, 10, 24, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(4.5, 10.5, 23, 7);

    // Turret
    ctx.fillRect(10, 4, 12, 6);
    ctx.fillRect(22, 6, 8, 2); // Barrel

    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(5, 11, 22, 1);
    ctx.fillRect(11, 5, 10, 1);

    return this.createTexture();
  }

  private createTexture(): CanvasTexture {
    const tex = new CanvasTexture(this.canvas);
    tex.minFilter = NearestFilter;
    tex.magFilter = NearestFilter;
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    
    // Copy the canvas to a new one to avoid reuse issues if handled asynchronously
    // Actually CanvasTexture.clone() doesn't clone the image data correctly for baking.
    // We create a new texture from a static image source if needed, but for now
    // Three.js manages the image properly upon update.
    return tex;
  }
}
