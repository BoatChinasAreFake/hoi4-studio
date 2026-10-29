import type { RiverPixel } from '../types/map';

export interface RasterizedRiverResult {
  pixels: [number, number][];
  coloredPixels: RiverPixel[];
  valid1px: boolean;
  violations: string[];
}

/**
 * Bresenham line rasterizer generating 8-connected integer grid points between two coordinates
 */
export function rasterizeLineBresenham(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): [number, number][] {
  const points: [number, number][] = [];
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    points.push([currX, currY]);
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }

  return points;
}

/**
 * Checks for illegal 2x2 clusters in a pixel collection
 */
export function find2x2Clusters(pixelSet: Set<string>): [number, number][] {
  const violations: [number, number][] = [];

  for (const key of pixelSet) {
    const [xStr, yStr] = key.split(',');
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);

    const hasRight = pixelSet.has(`${x + 1},${y}`);
    const hasBottom = pixelSet.has(`${x},${y + 1}`);
    const hasDiagonal = pixelSet.has(`${x + 1},${y + 1}`);

    if (hasRight && hasBottom && hasDiagonal) {
      violations.push([x, y]);
    }
  }

  return violations;
}

/**
 * Prunes 2x2 blocks by removing redundant diagonal corners while preserving 8-connectivity
 */
export function prune2x2Blocks(rawPixels: [number, number][]): [number, number][] {
  if (rawPixels.length <= 3) return rawPixels;

  const keyFor = (x: number, y: number) => `${x},${y}`;
  const pixelSet = new Set<string>(rawPixels.map(([x, y]) => keyFor(x, y)));

  // Protect endpoints
  const startKey = keyFor(rawPixels[0][0], rawPixels[0][1]);
  const endKey = keyFor(
    rawPixels[rawPixels.length - 1][0],
    rawPixels[rawPixels.length - 1][1]
  );

  let iterations = 0;
  while (iterations < 20) {
    const clusters = find2x2Clusters(pixelSet);
    if (clusters.length === 0) break;

    for (const [cx, cy] of clusters) {
      // In a 2x2 block (cx, cy), (cx+1, cy), (cx, cy+1), (cx+1, cy+1)
      // Pick a non-endpoint corner to remove that retains 8-connectivity
      const candidates = [
        [cx + 1, cy],
        [cx, cy + 1],
      ];

      for (const [candX, candY] of candidates) {
        const k = keyFor(candX, candY);
        if (k !== startKey && k !== endKey && pixelSet.has(k)) {
          pixelSet.delete(k);
          break;
        }
      }
    }
    iterations++;
  }

  // Preserve initial sequential order of pixels
  return rawPixels.filter(([x, y]) => pixelSet.has(keyFor(x, y)));
}

/**
 * Rasterizes river polyline and applies Paradox river palette:
 * - Green source (0, 255, 0)
 * - Red mouth (255, 0, 0)
 * - Size levels 1-4 blue gradient
 */
export function rasterizeRiverPolyline(
  points: [number, number][],
  level: 1 | 2 | 3 | 4 = 1
): RasterizedRiverResult {
  if (points.length < 2) {
    return {
      pixels: [],
      coloredPixels: [],
      valid1px: true,
      violations: [],
    };
  }

  // 1. Rasterize every segment between consecutive points
  const rawPath: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const segment = rasterizeLineBresenham(
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );
    // Avoid repeating joining vertices
    const sliceStart = i === 0 ? 0 : 1;
    for (let s = sliceStart; s < segment.length; s++) {
      rawPath.push(segment[s]);
    }
  }

  // 2. Remove consecutive duplicates
  const deduplicated: [number, number][] = [];
  for (let i = 0; i < rawPath.length; i++) {
    if (
      i === 0 ||
      rawPath[i][0] !== deduplicated[deduplicated.length - 1][0] ||
      rawPath[i][1] !== deduplicated[deduplicated.length - 1][1]
    ) {
      deduplicated.push(rawPath[i]);
    }
  }

  // 3. Prune 2x2 blocks to guarantee strict 1px topological width
  const pruned = prune2x2Blocks(deduplicated);

  // 4. Verify topological invariants
  const violations: string[] = [];
  const pixelSet = new Set(pruned.map(([x, y]) => `${x},${y}`));
  const remainingClusters = find2x2Clusters(pixelSet);

  if (remainingClusters.length > 0) {
    violations.push(
      `Found ${remainingClusters.length} illegal 2x2 pixel cluster(s) at (${remainingClusters[0][0]}, ${remainingClusters[0][1]})`
    );
  }

  // 5. Generate colored river pixels with exact Paradox RGB constants
  const levelColors: Record<1 | 2 | 3 | 4, [number, number, number]> = {
    1: [0, 225, 255], // Narrowest
    2: [0, 200, 255], // Medium
    3: [0, 150, 255], // Large
    4: [0, 100, 255], // Estuary
  };

  const coloredPixels: RiverPixel[] = pruned.map(([x, y], idx) => {
    if (idx === 0) {
      // Source: Green (0, 255, 0)
      return { x, y, type: 'source', rgb: [0, 255, 0] };
    }
    if (idx === pruned.length - 1) {
      // Mouth: Red (255, 0, 0)
      return { x, y, type: 'mouth', rgb: [255, 0, 0] };
    }
    return {
      x,
      y,
      type:
        level === 1
          ? 'narrow'
          : level === 2
          ? 'medium'
          : level === 3
          ? 'large'
          : 'estuary',
      rgb: levelColors[level],
    };
  });

  return {
    pixels: pruned,
    coloredPixels,
    valid1px: violations.length === 0,
    violations,
  };
}
