import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { ENEMY } from '../../config/balance';
import { getHelicopterTexture } from '../../gfx/enemySprite';

/**
 * Helicopter state machine:
 *  'patrol'  — sweeps left↔right across the screen at altitude, building
 *              tension. Each pass slightly varies altitude (lower going right,
 *              higher going left) giving a "circling" feel. Sprite tilts ±15°
 *              in the direction of travel.
 *  'approach' — locks X toward player, decelerating with inertia.
 *  'lock'    — holds position 0.8 s above player before dropping.
 *  'exit'    — full speed to the left, off-screen.
 */
export interface HeliData {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  state: 'patrol' | 'approach' | 'lock' | 'exit';
  stateTimer: number;
  /** Number of patrol passes completed before attacking. */
  passesLeft: number;
  /** Current patrol direction: +1 = right, -1 = left. */
  patrolDir: number;
  /** Target altitude during current patrol pass. */
  targetY: number;
  hasDropped: boolean;
  lastShotIdHit: number;
}

const HIGH_Y  = ENEMY.HELICOPTER.FLY_HEIGHT;        // Altitude going left
const LOW_Y   = ENEMY.HELICOPTER.FLY_HEIGHT - 40;   // Altitude going right
const TILT    = Math.PI / 12;                        // ±15° tilt (radians)
const PASSES  = 2;                                   // Patrol passes before attacking

export class HelicopterPool {
  public readonly mesh: InstancedMesh;
  public readonly data: HeliData[];
  /** Duck-typed config stub so SpawnSystem can read pool.config.width generically. */
  public readonly config = { width: ENEMY.HELICOPTER.WIDTH } as const;
  private readonly dummy = new Object3D();
  private readonly capacity: number;

  constructor(capacity = ENEMY.HELICOPTER.POOL_CAPACITY) {
    this.capacity = capacity;
    const geom = new PlaneGeometry(ENEMY.HELICOPTER.WIDTH, ENEMY.HELICOPTER.HEIGHT);
    const mat = new MeshBasicMaterial({
      map: getHelicopterTexture(),
      transparent: true,
      alphaTest: 0.5,
    });
    this.mesh = new InstancedMesh(geom, mat, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.data = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.data[i] = {
        active: false,
        x: 0, y: 0, vx: 0, vy: 0, hp: 0,
        state: 'patrol',
        stateTimer: 0,
        passesLeft: PASSES,
        patrolDir: -1,
        targetY: HIGH_Y,
        hasDropped: false,
        lastShotIdHit: -1,
      };
    }
  }

  spawn(x: number, y: number): boolean {
    for (const d of this.data) {
      if (!d.active) {
        d.active = true;
        d.x = x;
        d.y = y;
        d.vx = 0;
        d.vy = 0;
        d.hp = ENEMY.HELICOPTER.HP;
        d.state = 'patrol';
        d.stateTimer = 0;
        d.passesLeft = PASSES;
        // First patrol pass goes left (entering from right)
        d.patrolDir = -1;
        d.targetY = HIGH_Y;
        d.hasDropped = false;
        d.lastShotIdHit = -1;
        return true;
      }
    }
    return false;
  }

  update(
    dt: number,
    playerX: number,
    cameraRight: number,
    onDrop: (x: number, y: number) => void,
  ): void {
    const cfg    = ENEMY.HELICOPTER;
    const ACCEL  = 140;
    const VERT_S = 50; // Vertical drift speed

    // Patrol turn-around boundaries — keep heli WITHIN the visible screen
    const LEFT_LIMIT  = cfg.WIDTH * 0.6;                       // ~30 units from left edge
    const RIGHT_LIMIT = cameraRight - cfg.WIDTH * 0.6;         // ~30 units from right edge

    for (const d of this.data) {
      if (!d.active) continue;

      /* ──────────────────────────────────────── PATROL STATE ── */
      if (d.state === 'patrol') {
        // Horizontal thrust toward patrolDir
        d.vx += d.patrolDir * ACCEL * dt;
        // 90% of max speed — snappy, visible sweeps
        const patrolSpeed = cfg.SPEED * 0.9;
        if (Math.abs(d.vx) > patrolSpeed) d.vx = Math.sign(d.vx) * patrolSpeed;

        // Vertical drift toward targetY
        const yDiff = d.targetY - d.y;
        d.vy = Math.sign(yDiff) * Math.min(VERT_S, Math.abs(yDiff) * 2);

        // Turn-around check
        const hitLeft  = d.patrolDir < 0 && d.x < LEFT_LIMIT;
        const hitRight = d.patrolDir > 0 && d.x > RIGHT_LIMIT;
        if (hitLeft || hitRight) {
          d.patrolDir = -d.patrolDir;
          // Each turn updates altitude: right = lower, left = higher
          d.targetY   = d.patrolDir > 0 ? LOW_Y : HIGH_Y;
          d.passesLeft--;
        }

        // After enough passes, start approach
        if (d.passesLeft <= 0) {
          d.state = 'approach';
          d.stateTimer = 0;
        }

      /* ────────────────────────────────────── APPROACH STATE ── */
      } else if (d.state === 'approach') {
        const dist = playerX - d.x;
        const dir  = dist > 0 ? 1 : -1;
        d.vx += dir * ACCEL * dt;
        d.vx *= 0.98; // friction
        if (Math.abs(d.vx) > cfg.SPEED) d.vx = Math.sign(d.vx) * cfg.SPEED;

        // Drift toward HIGH_Y while approaching
        d.vy = Math.sign(HIGH_Y - d.y) * VERT_S;

        if (Math.abs(dist) < 20 && !d.hasDropped) {
          d.state     = 'lock';
          d.stateTimer = 0.8;
        }

      /* ──────────────────────────────────────── LOCK STATE ── */
      } else if (d.state === 'lock') {
        d.vx *= 0.85; // Heavy friction — nearly stops
        d.vy  = 0;
        d.stateTimer -= dt;
        if (d.stateTimer <= 0) {
          onDrop(d.x, d.y);
          d.hasDropped = true;
          d.state      = 'exit';
        }

      /* ──────────────────────────────────────── EXIT STATE ── */
      } else if (d.state === 'exit') {
        d.vx -= ACCEL * dt;
        if (d.vx < -cfg.SPEED) d.vx = -cfg.SPEED;
        d.vy  = 0;
      }

      d.x += d.vx * dt;
      d.y += d.vy * dt;

      // Despawn when off-screen left or stray right
      if (d.x < -cfg.WIDTH * 3 || d.x > cameraRight + cfg.WIDTH * 2) {
        d.active = false;
      }
    }
    this.syncInstances();
  }

  damageAt(i: number, amount: number): boolean {
    const d = this.data[i];
    if (!d || !d.active) return false;
    d.hp -= amount;
    if (d.hp <= 0) {
      d.active = false;
      return true;
    }
    return false;
  }

  reset(): void {
    for (const d of this.data) d.active = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private syncInstances(): void {
    let idx = 0;
    for (const d of this.data) {
      if (!d.active) continue;
      this.dummy.position.set(d.x, d.y, 0);

      // Tilt based on horizontal velocity: nose dips forward
      // Positive vx = going right = tilt clockwise (negative Z rotation in Three.js)
      const tilt = d.state === 'lock' ? 0 : -Math.sign(d.vx) * TILT * Math.min(1, Math.abs(d.vx) / (ENEMY.HELICOPTER.SPEED * 0.5));
      this.dummy.rotation.set(0, 0, tilt);

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }
    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
