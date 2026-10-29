export interface PixelCoord {
  x: number
  y: number
}

export interface RGB {
  r: number
  g: number
  b: number
}

export const RIVER_COLORS = {
  SOURCE: { r: 0, g: 255, b: 0 },       // Green (0, 255, 0)
  MOUTH: { r: 255, g: 0, b: 0 },        // Red (255, 0, 0)
  FLOW: { r: 255, g: 252, b: 0 },       // Yellow flow (255, 252, 0)
  TIER_1: { r: 0, g: 225, b: 255 },     // Narrowest
  TIER_2: { r: 0, g: 200, b: 255 },     // Medium
  TIER_3: { r: 0, g: 150, b: 255 },     // Large
  TIER_4: { r: 0, g: 100, b: 255 },     // Massive
  BACKGROUND: { r: 255, g: 255, b: 255 } // Land
}

export function isSameRgb(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b
}

export function isRiverPixel(rgb: RGB): boolean {
  return (
    isSameRgb(rgb, RIVER_COLORS.SOURCE) ||
    isSameRgb(rgb, RIVER_COLORS.MOUTH) ||
    isSameRgb(rgb, RIVER_COLORS.FLOW) ||
    isSameRgb(rgb, RIVER_COLORS.TIER_1) ||
    isSameRgb(rgb, RIVER_COLORS.TIER_2) ||
    isSameRgb(rgb, RIVER_COLORS.TIER_3) ||
    isSameRgb(rgb, RIVER_COLORS.TIER_4)
  )
}

export interface RiverValidationResult {
  valid: boolean
  errors: string[]
  sources: PixelCoord[]
  mouths: PixelCoord[]
  twoByTwoBlocks: Array<{ x: number; y: number }>
  connectedBranches: number
  orphanedPixels: PixelCoord[]
}

export class RiverGrid {
  readonly width: number
  readonly height: number
  readonly pixels: RGB[][]

  constructor(width: number, height: number, initialColor: RGB = RIVER_COLORS.BACKGROUND) {
    this.width = width
    this.height = height
    this.pixels = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ ...initialColor }))
    )
  }

  setPixel(x: number, y: number, color: RGB) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.pixels[y][x] = { ...color }
    }
  }

  getPixel(x: number, y: number): RGB | null {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.pixels[y][x]
    }
    return null
  }
}

export function validateRiverBitmap(grid: RiverGrid): RiverValidationResult {
  const errors: string[] = []
  const sources: PixelCoord[] = []
  const mouths: PixelCoord[] = []
  const twoByTwoBlocks: Array<{ x: number; y: number }> = []

  // 1. Scan for sources, mouths, and 2x2 blocks
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const px = grid.pixels[y][x]
      if (isSameRgb(px, RIVER_COLORS.SOURCE)) {
        sources.push({ x, y })
      } else if (isSameRgb(px, RIVER_COLORS.MOUTH)) {
        mouths.push({ x, y })
      }

      // Check for illegal 2x2 block
      if (x < grid.width - 1 && y < grid.height - 1) {
        const p00 = grid.pixels[y][x]
        const p10 = grid.pixels[y][x + 1]
        const p01 = grid.pixels[y + 1][x]
        const p11 = grid.pixels[y + 1][x + 1]

        if (
          isRiverPixel(p00) &&
          isRiverPixel(p10) &&
          isRiverPixel(p01) &&
          isRiverPixel(p11)
        ) {
          twoByTwoBlocks.push({ x, y })
        }
      }
    }
  }

  if (twoByTwoBlocks.length > 0) {
    errors.push(
      `Found ${twoByTwoBlocks.length} illegal 2x2 river block(s) violating 1px rule at: ` +
      twoByTwoBlocks.map(b => `(${b.x},${b.y})`).slice(0, 5).join('; ')
    )
  }

  if (sources.length === 0) {
    errors.push('River network has no source pixel (0, 255, 0).')
  }

  if (mouths.length === 0) {
    errors.push('River network has no mouth pixel (255, 0, 0).')
  }

  // 2. Connectivity check via 8-connected BFS from each source to reach at least one mouth
  const visited = new Set<string>()
  const key = (x: number, y: number) => `${x},${y}`

  let connectedBranches = 0
  const reachableMouths = new Set<string>()

  for (const src of sources) {
    const queue: PixelCoord[] = [src]
    const branchVisited = new Set<string>()
    branchVisited.add(key(src.x, src.y))
    visited.add(key(src.x, src.y))

    let reachedMouth = false

    while (queue.length > 0) {
      const curr = queue.shift()!
      const px = grid.getPixel(curr.x, curr.y)
      if (px && isSameRgb(px, RIVER_COLORS.MOUTH)) {
        reachedMouth = true
        reachableMouths.add(key(curr.x, curr.y))
      }

      // 8-neighbor exploration
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = curr.x + dx
          const ny = curr.y + dy
          const nKey = key(nx, ny)

          if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
            const neighborColor = grid.pixels[ny][nx]
            if (isRiverPixel(neighborColor) && !branchVisited.has(nKey)) {
              branchVisited.add(nKey)
              visited.add(nKey)
              queue.push({ x: nx, y: ny })
            }
          }
        }
      }
    }

    if (reachedMouth) {
      connectedBranches++
    } else {
      errors.push(`River branch from source at (${src.x}, ${src.y}) does not connect to any red mouth (255, 0, 0).`)
    }
  }

  // 3. Check for orphaned river pixels not connected to any source
  const orphanedPixels: PixelCoord[] = []
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (isRiverPixel(grid.pixels[y][x]) && !visited.has(key(x, y))) {
        orphanedPixels.push({ x, y })
      }
    }
  }

  if (orphanedPixels.length > 0) {
    errors.push(`Found ${orphanedPixels.length} unanchored/orphaned river pixel(s) not reachable from any source.`)
  }

  return {
    valid: errors.length === 0,
    errors,
    sources,
    mouths,
    twoByTwoBlocks,
    connectedBranches,
    orphanedPixels,
  }
}
