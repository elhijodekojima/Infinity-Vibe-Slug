import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { BULLET, WEAPON } from '../config/balance';
import { COLORS } from '../config/colors';

export interface RocketData {
  active: boolean;
  x: number;
  y: number;
  vx: number;
}

/**
 * Player rockets — move straight and explode on contact.
 */
export class RocketPool {
  public readonly mesh: InstancedMesh;
  public readonly data: RocketData[];
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(capacity = 16) {
    this.capacity = capacity;

    // Rockets are a bit chunkier than bullets.
    const geom = new PlaneGeometry(8, 4);
    const mat = new MeshBasicMaterial({ color: COLORS.ROCKET });
    this.mesh = new InstancedMesh(geom, mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = { active: false, x: 0, y: 0, vx: 0 };
    }
  }

  spawn(x: number, y: number, vx: number): boolean {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.vx = vx;
        return true;
      }
    }
    return false;
  }

  update(dt: number, cameraRight: number): void {
    const acc = WEAPON.ROCKET.ACCELERATION;
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      d.vx += acc * dt;
      d.x += d.vx * dt;
      if (d.x > cameraRight + 32 || d.x < -32) {
        d.active = false;
      }
    }
    this.syncInstances();
  }

  killAt(i: number): void {
    const d = this.data[i];
    if (d && d.active) d.active = false;
  }

  reset(): void {
    for (const d of this.data) d.active = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private syncInstances(): void {
    let idx = 0;
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i]!;
      if (!d.active) continue;
      this.dummy.position.set(d.x, d.y, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
