import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
  Texture,
} from 'three';
import { DROP, WORLD } from '../../config/balance';
import { COLORS } from '../../config/colors';

export type ItemType = 'machinegun' | 'shotgun' | 'rocket' | 'grenade';

export interface ItemData {
  active: boolean;
  type: ItemType;
  x: number;
  y: number;
  vy: number;
  /** Seconds since spawn. */
  age: number;
  /** If true, falls slower and is collectible in air. */
  hasParachute: boolean;
}

/**
 * Arsenal items (H, S, R) box pool.
 * Now uses 3 separate InstancedMeshes to support different weapon textures.
 */
export class ItemPool {
  private readonly meshMG: InstancedMesh;
  private readonly meshSG: InstancedMesh;
  private readonly meshRL: InstancedMesh;
  private readonly meshGR: InstancedMesh;
  
  public readonly data: ItemData[];
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(
    capacity = DROP.POOL_CAPACITY,
    texMG?: Texture,
    texSG?: Texture,
    texRL?: Texture,
    texGR?: Texture
  ) {
    this.capacity = capacity;
    const geom = new PlaneGeometry(DROP.ITEM_SIZE, DROP.ITEM_SIZE);
    
    // Material helper
    const makeMat = (tex?: Texture) => new MeshBasicMaterial({ 
      map: tex || null,
      transparent: !!tex,
      alphaTest: 0.5,
      color: tex ? 0xffffff : 0xcccccc 
    });

    this.meshMG = new InstancedMesh(geom, makeMat(texMG), capacity);
    this.meshSG = new InstancedMesh(geom, makeMat(texSG), capacity);
    this.meshRL = new InstancedMesh(geom, makeMat(texRL), capacity);
    this.meshGR = new InstancedMesh(geom, makeMat(texGR), capacity);

    // FIX: Disable frustum culling for instanced meshes to ensure they render 
    // regardless of individual instance positions.
    [this.meshMG, this.meshSG, this.meshRL, this.meshGR].forEach(m => {
      m.count = 0;
      m.frustumCulled = false;
    });

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = { active: false, type: 'machinegun', x: 0, y: 0, vy: 0, age: 0, hasParachute: false };
    }
  }

  /** Expose meshes for the scene to add them. */
  public get meshes() {
    return [this.meshMG, this.meshSG, this.meshRL, this.meshGR];
  }

  spawn(x: number, y: number, type: ItemType, hasParachute = false): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.type = type;
        d.x = x;
        d.y = y;
        d.vy = hasParachute ? -30 : 100; // Slower fall or pop up
        d.age = 0;
        d.hasParachute = hasParachute;
        return true;
      }
    }
    return false;
  }

  update(dt: number, scrollSpeed: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;

      d.age += dt;
      d.x -= scrollSpeed * dt;
      // Parachute slows gravity impact
      const gravity = d.hasParachute ? DROP.GRAVITY * 0.2 : DROP.GRAVITY;
      d.vy += gravity * dt;
      
      // Cap fall speed with parachute
      if (d.hasParachute && d.vy < -40) d.vy = -40;

      d.y += d.vy * dt;

      if (d.y < WORLD.GROUND_Y) {
        d.y = WORLD.GROUND_Y;
        d.vy = 0;
      }
      
      if (d.x < -DROP.ITEM_SIZE * 2) d.active = false;
    }
    this.syncInstances();
  }

  killAt(i: number): void {
    this.data[i].active = false;
  }

  reset(): void {
    for (const d of this.data) d.active = false;
    [this.meshMG, this.meshSG, this.meshRL, this.meshGR].forEach(m => {
      m.count = 0;
      m.instanceMatrix.needsUpdate = true;
    });
  }

  private syncInstances(): void {
    let countMG = 0;
    let countSG = 0;
    let countRL = 0;
    let countGR = 0;
    const halfSize = DROP.ITEM_SIZE / 2;

    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      
      this.dummy.position.set(d.x, d.y + halfSize, 0);
      this.dummy.updateMatrix();
      
      if (d.type === 'machinegun') {
        this.meshMG.setMatrixAt(countMG++, this.dummy.matrix);
      } else if (d.type === 'shotgun') {
        this.meshSG.setMatrixAt(countSG++, this.dummy.matrix);
      } else if (d.type === 'rocket') {
        this.meshRL.setMatrixAt(countRL++, this.dummy.matrix);
      } else if (d.type === 'grenade') {
        this.meshGR.setMatrixAt(countGR++, this.dummy.matrix);
      }
    }

    this.meshMG.count = countMG;
    this.meshSG.count = countSG;
    this.meshRL.count = countRL;
    this.meshGR.count = countGR;
    
    [this.meshMG, this.meshSG, this.meshRL, this.meshGR].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
    });
  }
}
