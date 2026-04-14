import { WORLD, OBSTACLE, ObstacleType, TerrainIntent, OBSTACLE_TO_INTENT } from '../../config/balance';
import { AABB } from '../collisions';

export interface TerrainSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Platform extends AABB {
  id: number;
}

export interface SpawnZone {
  x: number;
  y: number;
  type: 'ground' | 'elevated';
}

export class TerrainManager {
  public segments: TerrainSegment[] = [];
  public platforms: Platform[] = [];
  
  private nextChunkX = 0;
  private lastId = 0;
  private activeIntent: TerrainIntent = 'flat';
  private gapTimer = 0;

  constructor() {
    // Initial flat ground segment
    this.segments.push({ 
      x1: -100, y1: WORLD.GROUND_Y, 
      x2: WORLD.SCREEN_WIDTH + 200, y2: WORLD.GROUND_Y 
    });
    this.nextChunkX = WORLD.SCREEN_WIDTH + 100;
  }

  public update(dt: number, scrollSpeed: number): void {
    const dx = scrollSpeed * dt;
    
    // Scroll segments
    for (const s of this.segments) {
      s.x1 -= dx;
      s.x2 -= dx;
    }
    // Scroll platforms
    for (const p of this.platforms) {
      p.x -= dx;
    }

    // Cull off-screen (left)
    this.segments = this.segments.filter(s => s.x2 > -200);
    this.platforms = this.platforms.filter(p => p.x + p.w / 2 > -100);

    // Spawn new chunks
    this.nextChunkX -= dx;
    if (this.nextChunkX < WORLD.SCREEN_WIDTH + 100) {
      this.generateNextChunk();
    }
  }

  /**
   * Returns the "intended" ground Y for an entity at (x, currentY).
   * Considers solid terrain segments and one-way platforms.
   * Returns the HIGHEST valid surface at the given X.
   */
  public getSurfaceHeight(x: number, currentY: number, vy: number, onlySolid: boolean = false): number {
    let terrainY = -Infinity;
    
    // 1. Check solid segments (slopes/hills/valleys)
    for (const s of this.segments) {
      if (x >= s.x1 && x <= s.x2) {
        // Lerp height for smooth slopes
        const t = (x - s.x1) / (s.x2 - s.x1);
        const y = s.y1 + t * (s.y2 - s.y1);
        if (y > terrainY) terrainY = y;
      }
    }

    // Fallback if no segments found (shouldn't happen with base ground)
    if (terrainY === -Infinity) terrainY = WORLD.GROUND_Y;

    if (onlySolid) return terrainY;

    // 2. Check platforms (one-way)
    // Only land if we are falling or grounded (vy <= 0) 
    // AND our feet are above the surface.
    let platformY = -Infinity;
    if (vy <= 10) { 
      const footY = currentY;
      for (const p of this.platforms) {
        const halfW = p.w / 2;
        if (x >= p.x - halfW && x <= p.x + halfW) {
          const top = p.y + p.h / 2;
          // One-way logic: only collide if we were above the platform.
          if (footY >= top - 8) { // Slightly increased tolerance
            if (top > platformY) platformY = top;
          }
        }
      }
    }

    return Math.max(terrainY, platformY);
  }

  /**
   * Returns true if there is "nothing" below the feet at the given X.
   * Useful for Shield/Tank edge detection.
   */
  public isFallingEdge(x: number, currentY: number): boolean {
    const surfaceY = this.getSurfaceHeight(x, currentY, 0);
    // If the surface below us is much lower than our current Y, we are at an edge
    return (currentY - surfaceY) > 5;
  }

  private generateNextChunk(): void {
    const type = this.rollType();
    this.activeIntent = type !== 'none' ? OBSTACLE_TO_INTENT[type] : 'flat';
    const startX = WORLD.SCREEN_WIDTH + 100;
    
    switch (type) {
      case 'single': this.spawnSingle(startX); break;
      case 'stair': this.spawnStair(startX); break;
      case 'swarm': this.spawnClustered(startX); break;
      case 'hill': this.spawnHill(startX); break;
      case 'valley': this.spawnValley(startX); break;
      case 'fortress': this.spawnFortress(startX); break;
    }

    this.nextChunkX = startX + OBSTACLE.MIN_GAP + Math.random() * (OBSTACLE.MAX_GAP - OBSTACLE.MIN_GAP);
  }

  private rollType(): ObstacleType {
    const r = Math.random();
    let acc = 0;
    for (const [type, weight] of Object.entries(OBSTACLE.WEIGHTS)) {
      acc += weight;
      if (r < acc) return type as ObstacleType;
    }
    return 'single';
  }

  public getCurrentTerrainIntent(): TerrainIntent {
    // Basic approximation: return the last generated intent. 
    // In a full implementation, you might track intents per world-X coordinate.
    return this.activeIntent;
  }

  public getSpawnZones(cameraRight: number): { ground: SpawnZone[], elevated: SpawnZone[] } {
    const ground: SpawnZone[] = [];
    const elevated: SpawnZone[] = [];

    // Consider platforms ahead of the camera
    for (const p of this.platforms) {
      if (p.x > cameraRight && p.x < cameraRight + 400) {
        elevated.push({ x: p.x, y: p.y + p.h / 2, type: 'elevated' });
      }
    }

    // Default ground zone
    ground.push({ x: cameraRight + 40, y: this.getSurfaceHeight(cameraRight + 40, 0, 0, true), type: 'ground' });

    // Look for slopes ahead
    for (const s of this.segments) {
      if (s.x1 > cameraRight && s.x1 < cameraRight + 400) {
        ground.push({ x: s.x1, y: s.y1, type: 'ground' });
      }
    }

    return { ground, elevated };
  }

  // --- Pattern Generators ---

  private spawnSingle(x: number): void {
    const w = OBSTACLE.PLATFORM.WIDTH_MIN + Math.random() * (OBSTACLE.PLATFORM.WIDTH_MAX - OBSTACLE.PLATFORM.WIDTH_MIN);
    this.addPlatform(x + w/2, WORLD.GROUND_Y + OBSTACLE.PLATFORM.JUMP_HEIGHT, w);
    this.addFlatGround(x, x + w + 200);
  }

  private spawnStair(x: number): void {
    const w = 100;
    const h = OBSTACLE.PLATFORM.JUMP_HEIGHT;
    this.addPlatform(x + w/2, WORLD.GROUND_Y + h, w);
    this.addPlatform(x + w * 1.8, WORLD.GROUND_Y + h * 1.8, w);
    this.addPlatform(x + w * 3.1, WORLD.GROUND_Y + h, w);
    this.addFlatGround(x, x + w * 5);
  }

  private spawnClustered(x: number): void {
    // Structured clump: Two staggered rows of platforms
    const baseW = 100 + Math.random() * 50;
    const h1 = WORLD.GROUND_Y + 70;
    const h2 = WORLD.GROUND_Y + 120;
    
    this.addPlatform(x + baseW/2, h1, baseW);
    this.addPlatform(x + baseW * 1.5, h2, baseW);
    this.addPlatform(x + baseW * 2.5, h1, baseW);
    
    this.addFlatGround(x, x + baseW * 4);
  }

  private spawnFortress(x: number): void {
    // Defensive formation: High platform with shield, tank below
    const w = 160;
    const h = WORLD.GROUND_Y + 80;
    
    // The platforms array is read by SpawnSystem to place enemies
    this.addPlatform(x + w / 2, h, w);
    this.addFlatGround(x, x + w + 200);
  }

  private spawnHill(x: number): void {
    const sw = OBSTACLE.TERRAIN.SLOPE_WIDTH;
    const h = OBSTACLE.TERRAIN.MAX_HEIGHT_DIFF;
    const topW = 200 + Math.random() * 100;
    const gy = WORLD.GROUND_Y;

    // Up slope
    this.segments.push({ x1: x, y1: gy, x2: x + sw, y2: gy + h });
    // Top
    this.segments.push({ x1: x + sw, y1: gy + h, x2: x + sw + topW, y2: gy + h });
    // Down slope
    this.segments.push({ x1: x + sw + topW, y1: gy + h, x2: x + sw * 2 + topW, y2: gy });
    
    this.addFlatGround(x + sw * 2 + topW, x + sw * 2 + topW + 400);
  }

  private spawnValley(x: number): void {
    const sw = OBSTACLE.TERRAIN.SLOPE_WIDTH;
    const h = OBSTACLE.TERRAIN.MAX_HEIGHT_DIFF;
    const botW = 200 + Math.random() * 100;
    const gy = WORLD.GROUND_Y;

    // Down slope
    this.segments.push({ x1: x, y1: gy, x2: x + sw, y2: gy - h });
    // Bottom
    this.segments.push({ x1: x + sw, y1: gy - h, x2: x + sw + botW, y2: gy - h });
    // Up slope
    this.segments.push({ x1: x + sw + botW, y1: gy - h, x2: x + sw * 2 + botW, y2: gy });

    this.addFlatGround(x + sw * 2 + botW, x + sw * 2 + botW + 400);
  }

  private addPlatform(cx: number, cy: number, w: number): void {
    this.platforms.push({
      id: this.lastId++,
      x: cx,
      y: cy,
      w: w,
      h: OBSTACLE.PLATFORM.HEIGHT
    });
  }

  private addFlatGround(xStart: number, xEnd: number): void {
    this.segments.push({ x1: xStart, y1: WORLD.GROUND_Y, x2: xEnd, y2: WORLD.GROUND_Y });
  }

  public reset(): void {
    this.segments = [{ x1: -100, y1: WORLD.GROUND_Y, x2: WORLD.SCREEN_WIDTH + 200, y2: WORLD.GROUND_Y }];
    this.platforms = [];
    this.nextChunkX = WORLD.SCREEN_WIDTH + 100;
  }
}
