import { 
  InstancedMesh, 
  PlaneGeometry, 
  MeshBasicMaterial, 
  Object3D 
} from 'three';
import { COLORS } from '../config/colors';
import { Platform, TerrainSegment } from '../systems/terrain/terrainManager';
import { OBSTACLE } from '../config/balance';

export class TerrainPools {
  public platformMesh: InstancedMesh;
  public groundMesh: InstancedMesh;
  
  private dummy = new Object3D();
  private readonly MAX_PLATFORMS = 64;
  private readonly MAX_GROUND_SLICES = 512;
  private readonly SLICE_WIDTH = 4; // Width of each vertical ground slice

  constructor() {
    // Platforms
    const pGeom = new PlaneGeometry(1, 1);
    const pMat = new MeshBasicMaterial({ color: COLORS.PLATFORM });
    this.platformMesh = new InstancedMesh(pGeom, pMat, this.MAX_PLATFORMS);
    this.platformMesh.count = 0;
    this.platformMesh.frustumCulled = false;

    // Ground Slices
    const gGeom = new PlaneGeometry(1, 1);
    const gMat = new MeshBasicMaterial({ color: COLORS.TERRAIN });
    this.groundMesh = new InstancedMesh(gGeom, gMat, this.MAX_GROUND_SLICES);
    this.groundMesh.count = 0;
    this.groundMesh.frustumCulled = false;
  }

  public update(platforms: Platform[], segments: TerrainSegment[]): void {
    // 1. Sync Platforms
    let pIdx = 0;
    for (const p of platforms) {
      if (pIdx >= this.MAX_PLATFORMS) break;
      this.dummy.position.set(p.x, p.y, 0.1); // Slightly in front of BG
      this.dummy.scale.set(p.w, p.h, 1);
      this.dummy.updateMatrix();
      this.platformMesh.setMatrixAt(pIdx, this.dummy.matrix);
      pIdx++;
    }
    this.platformMesh.count = pIdx;
    this.platformMesh.instanceMatrix.needsUpdate = true;

    // 2. Sync Ground Slices
    // Each segment is drawn as a series of vertical slices
    let gIdx = 0;
    for (const s of segments) {
      const dist = s.x2 - s.x1;
      const numSlices = Math.ceil(dist / this.SLICE_WIDTH);
      
      for (let i = 0; i < numSlices; i++) {
        if (gIdx >= this.MAX_GROUND_SLICES) break;
        
        const x = s.x1 + i * this.SLICE_WIDTH + this.SLICE_WIDTH / 2;
        if (x > s.x2) continue; // Final slice adjustment

        // Lerp Y for the slice
        const t = (x - s.x1) / dist;
        const y = s.y1 + t * (s.y2 - s.y1);

        // Height of the slice (from bottom of screen to y)
        // Total view height is roughly 270. Let's assume ground goes deep enough.
        const height = y + 100; 

        this.dummy.position.set(x, y - height / 2, 0.05);
        this.dummy.scale.set(this.SLICE_WIDTH, height, 1);
        this.dummy.updateMatrix();
        this.groundMesh.setMatrixAt(gIdx, this.dummy.matrix);
        gIdx++;
      }
    }
    this.groundMesh.count = gIdx;
    this.groundMesh.instanceMatrix.needsUpdate = true;
  }

  public reset(): void {
    this.platformMesh.count = 0;
    this.groundMesh.count = 0;
  }
}
