/**
 * isoMath.ts
 *
 * Pure isometric projection math for the vessel cabin renderer.
 * No Three.js, no WebGL — just trigonometry projecting (col, row)
 * grid coordinates into 2D SVG pixel positions with depth sorting.
 *
 * The isometric angle follows a true 2:1 dimetric projection
 * (arctan(0.5) ≈ 26.57°), which is the standard used by
 * Mondaysys's cabin design and most architectural isometric views.
 */

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

/** Isometric angle in radians (arctan(0.5) ≈ 26.565°) */
const ISO_ANGLE = Math.atan(0.5);
const COS_A = Math.cos(ISO_ANGLE);
const SIN_A = Math.sin(ISO_ANGLE);

/** Default cell size in grid units before scaling */
const DEFAULT_CELL_W = 40;
const DEFAULT_CELL_H = 40;

// ────────────────────────────────────────────
// Projection
// ────────────────────────────────────────────

export interface IsoPoint {
  /** Screen X (pixels, SVG coordinate) */
  x: number;
  /** Screen Y (pixels, SVG coordinate) */
  y: number;
  /** Depth value for painter's algorithm sorting (higher = further back) */
  depth: number;
}

/**
 * Project a grid coordinate (col, row) into isometric screen space.
 *
 * @param col  Column index (0 = left/port)
 * @param row  Row index (0 = front/bow)
 * @param cellW  Width of one grid cell in pixels
 * @param cellH  Height of one grid cell in pixels
 * @returns  Screen position and depth for sorting
 */
export function gridToIso(
  col: number,
  row: number,
  cellW = DEFAULT_CELL_W,
  cellH = DEFAULT_CELL_H,
): IsoPoint {
  // Convert grid to world-space flat coordinates
  const worldX = col * cellW;
  const worldY = row * cellH;

  // True dimetric projection
  const screenX = (worldX - worldY) * COS_A;
  const screenY = (worldX + worldY) * SIN_A;

  // Depth: seats further from camera (higher row + higher col) render first
  const depth = worldX + worldY;

  return { x: screenX, y: screenY, depth };
}

/**
 * Compute the SVG viewBox dimensions needed to contain
 * a grid of (cols × rows) in isometric projection.
 *
 * Returns the bounding box with padding for seat geometry height.
 */
export function computeViewBox(
  cols: number,
  rows: number,
  cellW = DEFAULT_CELL_W,
  cellH = DEFAULT_CELL_H,
  seatHeight = 24,
  padding = 60,
  bounds?: { minCol?: number; maxCol?: number; minRow?: number; maxRow?: number }
): { minX: number; minY: number; width: number; height: number } {
  const minC = bounds?.minCol ?? 0;
  const maxC = bounds?.maxCol ?? cols - 1;
  const minR = bounds?.minRow ?? 0;
  const maxR = bounds?.maxRow ?? rows - 1;

  // The four corners of the grid/hull in iso space
  const topLeft = gridToIso(minC, minR, cellW, cellH);          // bow-port
  const topRight = gridToIso(maxC, minR, cellW, cellH);         // bow-starboard
  const botLeft = gridToIso(minC, maxR, cellW, cellH);          // stern-port
  const botRight = gridToIso(maxC, maxR, cellW, cellH);         // stern-starboard

  const allX = [topLeft.x, topRight.x, botLeft.x, botRight.x];
  const allY = [topLeft.y, topRight.y, botLeft.y, botRight.y];

  const minX = Math.min(...allX) - padding - cellW;
  const maxX = Math.max(...allX) + padding + cellW;
  const minY = Math.min(...allY) - padding - seatHeight;
  const maxY = Math.max(...allY) + padding + cellH;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Generate the six vertices of an isometric box (cuboid) face.
 * Used to render the top, front, and side faces of a seat.
 *
 * @param baseX  Base screen X of the box origin
 * @param baseY  Base screen Y of the box origin
 * @param w  Box width in iso-projected pixels
 * @param d  Box depth in iso-projected pixels
 * @param h  Box height in pixels (vertical screen space)
 */
export function isoBoxFaces(
  baseX: number,
  baseY: number,
  w: number,
  d: number,
  h: number,
): {
  top: string;    // polygon points for the top face
  front: string;  // polygon points for the front face
  side: string;   // polygon points for the right-side face
} {
  // Isometric offsets for width and depth directions
  const wdx = w * COS_A;
  const wdy = w * SIN_A;
  const ddx = -d * COS_A;
  const ddy = d * SIN_A;

  // Bottom face corners (on the ground plane)
  const b0x = baseX;
  const b0y = baseY;
  const b1x = baseX + wdx;
  const b1y = baseY + wdy;
  const b2x = baseX + wdx + ddx;
  const b2y = baseY + wdy + ddy;
  const b3x = baseX + ddx;
  const b3y = baseY + ddy;

  // Top face corners (lifted by height)
  const t0x = b0x;
  const t0y = b0y - h;
  const t1x = b1x;
  const t1y = b1y - h;
  const t2x = b2x;
  const t2y = b2y - h;
  const t3x = b3x;
  const t3y = b3y - h;

  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

  return {
    // Top face: the cushion surface
    top: `${p(t0x, t0y)} ${p(t1x, t1y)} ${p(t2x, t2y)} ${p(t3x, t3y)}`,
    // Front face: visible front edge
    front: `${p(b1x, b1y)} ${p(t1x, t1y)} ${p(t2x, t2y)} ${p(b2x, b2y)}`,
    // Side face: visible right edge
    side: `${p(b2x, b2y)} ${p(t2x, t2y)} ${p(t3x, t3y)} ${p(b3x, b3y)}`,
  };
}
