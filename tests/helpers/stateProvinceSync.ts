import type { ProvinceDefinition } from './mapDefinitionParser'

export interface StateFileDef {
  id: number
  name: string
  manpower: number
  category: string
  owner: string
  victoryPoints: Array<{ provinceId: number; points: number }>
  provinces: number[]
  buildings?: Record<string, number>
}

export interface StateSyncValidation {
  valid: boolean
  errors: string[]
  unassignedProvinces: number[]
  doubleAssignedProvinces: Array<{ provinceId: number; states: number[] }>
  unknownProvincesInStates: Array<{ provinceId: number; stateId: number }>
  invalidVictoryPoints: Array<{ provinceId: number; stateId: number }>
}

export function parseStateFile(content: string): StateFileDef | null {
  const stateMatch = content.match(/state\s*=\s*\{([\s\S]*)\}/)
  if (!stateMatch) return null

  const body = stateMatch[1]
  const idMatch = body.match(/id\s*=\s*(\d+)/)
  const nameMatch = body.match(/name\s*=\s*"([^"]+)"/) || body.match(/name\s*=\s*([a-zA-Z0-9_]+)/)
  const manMatch = body.match(/manpower\s*=\s*(\d+)/)
  const catMatch = body.match(/state_category\s*=\s*([a-zA-Z0-9_]+)/)
  const ownerMatch = body.match(/owner\s*=\s*([a-zA-Z0-9_]+)/)

  if (!idMatch) return null

  // Victory points: victory_points = { <prov> <vp> ... }
  const vpMatches: Array<{ provinceId: number; points: number }> = []
  const vpBlock = body.match(/victory_points\s*=\s*\{([^}]*)\}/)
  if (vpBlock) {
    const nums = vpBlock[1].trim().split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n))
    for (let i = 0; i < nums.length - 1; i += 2) {
      vpMatches.push({ provinceId: nums[i], points: nums[i + 1] })
    }
  }

  // Provinces block: provinces = { 3838 9851 11804 }
  const provBlock = body.match(/provinces\s*=\s*\{([^}]*)\}/)
  const provinces = provBlock
    ? provBlock[1].trim().split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n))
    : []

  return {
    id: parseInt(idMatch[1], 10),
    name: nameMatch ? nameMatch[1] : `STATE_${idMatch[1]}`,
    manpower: manMatch ? parseInt(manMatch[1], 10) : 0,
    category: catMatch ? catMatch[1] : 'rural',
    owner: ownerMatch ? ownerMatch[1] : 'UNKNOWN',
    victoryPoints: vpMatches,
    provinces,
  }
}

export function validateStateProvinceSync(
  states: StateFileDef[],
  definitions: Map<number, ProvinceDefinition>
): StateSyncValidation {
  const errors: string[] = []
  const provToStates = new Map<number, number[]>()
  const unknownProvincesInStates: Array<{ provinceId: number; stateId: number }> = []
  const invalidVictoryPoints: Array<{ provinceId: number; stateId: number }> = []

  for (const s of states) {
    if (s.provinces.length === 0) {
      errors.push(`State ${s.id} (${s.name}) has empty province list. Paradox engine will reject this state.`)
    }

    const stateProvSet = new Set(s.provinces)

    for (const pid of s.provinces) {
      if (!definitions.has(pid)) {
        unknownProvincesInStates.push({ provinceId: pid, stateId: s.id })
        errors.push(`State ${s.id} contains province ${pid} which does not exist in definition.csv`)
      }

      const assigned = provToStates.get(pid) || []
      assigned.push(s.id)
      provToStates.set(pid, assigned)
    }

    for (const vp of s.victoryPoints) {
      if (!stateProvSet.has(vp.provinceId)) {
        invalidVictoryPoints.push({ provinceId: vp.provinceId, stateId: s.id })
        errors.push(`State ${s.id} assigns victory points to province ${vp.provinceId} which is not part of state's provinces`)
      }
    }
  }

  const doubleAssignedProvinces: Array<{ provinceId: number; states: number[] }> = []
  for (const [pid, assignedStates] of provToStates.entries()) {
    if (assignedStates.length > 1) {
      doubleAssignedProvinces.push({ provinceId: pid, states: assignedStates })
      errors.push(`Province ${pid} is double-assigned to multiple states: ${assignedStates.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    unassignedProvinces: [],
    doubleAssignedProvinces,
    unknownProvincesInStates,
    invalidVictoryPoints,
  }
}

export function reassignProvince(
  sourceState: StateFileDef,
  targetState: StateFileDef,
  provinceId: number
): { success: boolean; error?: string } {
  const index = sourceState.provinces.indexOf(provinceId)
  if (index === -1) {
    return { success: false, error: `Province ${provinceId} not found in source state ${sourceState.id}` }
  }

  // Remove from source state
  sourceState.provinces.splice(index, 1)

  // Remove victory points in source state if any
  sourceState.victoryPoints = sourceState.victoryPoints.filter(vp => vp.provinceId !== provinceId)

  // Add to target state
  if (!targetState.provinces.includes(provinceId)) {
    targetState.provinces.push(provinceId)
  }

  return { success: true }
}
