/**
 * AABB collision primitives. Pure functions, no heap allocation.
 *
 * All boxes are **center-based**: (x, y) is the box center, (w, h) its full
 * extents. This matches how Three.js meshes are positioned (centered on
 * their geometry) and halves the math compared to min/max pairs.
 */

export interface AABB {
  /** Center X. */
  x: number;
  /** Center Y. */
  y: number;
  /** Full width. */
  w: number;
  /** Full height. */
  h: number;
}

/** Symmetric AABB overlap test. */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}
