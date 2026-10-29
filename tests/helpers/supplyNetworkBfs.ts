export interface RailwayLine {
  level: number
  provinces: number[]
}

export interface SupplyNode {
  level: number
  provinceId: number
}

export interface SupplyValidationResult {
  allHubsCount: number
  connectedHubs: number[]
  disconnectedHubs: number[]
  isFullyConnected: boolean
  shortestPathToHub?: (hubProvinceId: number) => number[] | null
}

export class SupplyNetworkGraph {
  private adjacency = new Map<number, Set<number>>()
  private edgeLevels = new Map<string, number>()
  private supplyHubs = new Map<number, SupplyNode>()

  addEdge(u: number, v: number, level: number) {
    if (!this.adjacency.has(u)) this.adjacency.set(u, new Set())
    if (!this.adjacency.has(v)) this.adjacency.set(v, new Set())
    this.adjacency.get(u)!.add(v)
    this.adjacency.get(v)!.add(u)

    const key = u < v ? `${u}-${v}` : `${v}-${u}`
    const existing = this.edgeLevels.get(key) || 0
    if (level > existing) {
      this.edgeLevels.set(key, level)
    }
  }

  addSupplyHub(node: SupplyNode) {
    this.supplyHubs.set(node.provinceId, node)
  }

  getSupplyHub(provId: number): SupplyNode | undefined {
    return this.supplyHubs.get(provId)
  }

  getAdjacentProvinces(provId: number): number[] {
    const set = this.adjacency.get(provId)
    return set ? Array.from(set) : []
  }

  parseRailways(content: string): { lines: RailwayLine[]; errors: string[] } {
    const lines: RailwayLine[] = []
    const errors: string[] = []

    const textLines = content.split(/\r?\n/)
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i].trim()
      if (!line || line.startsWith('#')) continue

      const parts = line.split(/\s+/).map(p => parseInt(p, 10)).filter(n => !isNaN(n))
      if (parts.length < 3) {
        errors.push(`Line ${i + 1}: Invalid railway definition '${line}'`)
        continue
      }

      const level = parts[0]
      const count = parts[1]
      const provinces = parts.slice(2)

      if (level < 1 || level > 5) {
        errors.push(`Line ${i + 1}: Invalid railway level ${level}, must be between 1 and 5`)
      }

      if (provinces.length !== count) {
        errors.push(`Line ${i + 1}: Province count mismatch, expected ${count}, got ${provinces.length}`)
      }

      lines.push({ level, provinces })

      // Add edges between consecutive provinces
      for (let j = 0; j < provinces.length - 1; j++) {
        this.addEdge(provinces[j], provinces[j + 1], level)
      }
    }

    return { lines, errors }
  }

  parseSupplyNodes(content: string): { nodes: SupplyNode[]; errors: string[] } {
    const nodes: SupplyNode[] = []
    const errors: string[] = []

    const textLines = content.split(/\r?\n/)
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i].trim()
      if (!line || line.startsWith('#')) continue

      const parts = line.split(/\s+/).map(p => parseInt(p, 10)).filter(n => !isNaN(n))
      if (parts.length < 2) {
        errors.push(`Line ${i + 1}: Invalid supply node format '${line}'`)
        continue
      }

      const level = parts[0]
      const provinceId = parts[1]
      const node: SupplyNode = { level, provinceId }
      nodes.push(node)
      this.addSupplyHub(node)
    }

    return { nodes, errors }
  }

  validateConnectivityFromCapital(capitalProv: number): SupplyValidationResult {
    const visited = new Set<number>()
    const parent = new Map<number, number>()
    const queue: number[] = [capitalProv]
    visited.add(capitalProv)

    while (queue.length > 0) {
      const curr = queue.shift()!
      const neighbors = this.adjacency.get(curr)
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n)
            parent.set(n, curr)
            queue.push(n)
          }
        }
      }
    }

    const connectedHubs: number[] = []
    const disconnectedHubs: number[] = []

    for (const [hubProv] of this.supplyHubs) {
      if (visited.has(hubProv)) {
        connectedHubs.push(hubProv)
      } else {
        disconnectedHubs.push(hubProv)
      }
    }

    return {
      allHubsCount: this.supplyHubs.size,
      connectedHubs,
      disconnectedHubs,
      isFullyConnected: disconnectedHubs.length === 0,
      shortestPathToHub: (hubProv: number) => {
        if (!visited.has(hubProv)) return null
        const path: number[] = []
        let curr: number | undefined = hubProv
        while (curr !== undefined) {
          path.unshift(curr)
          if (curr === capitalProv) break
          curr = parent.get(curr)
        }
        return path
      },
    }
  }
}
