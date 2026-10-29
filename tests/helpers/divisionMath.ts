export interface BattalionStats {
  id: string
  name: string
  isSupport?: boolean
  combatWidth: number
  manpower: number
  maxHp: number
  organization: number
  softAttack: number
  hardAttack: number
  defense: number
  breakthrough: number
  armor: number
  piercing: number
  maximumSpeed: number // km/h
  supplyConsumption: number
  trainingTime: number // days
}

export interface DivisionTemplate {
  name: string
  // 5 regiments of up to 5 battalions each
  grid: Array<Array<BattalionStats | null>>
  // up to 5 support companies
  supportCompanies: Array<BattalionStats | null>
}

export interface DivisionCompositeStats {
  totalBattalions: number
  totalSupportCompanies: number
  combatWidth: number
  manpower: number
  maxHp: number
  organization: number
  softAttack: number
  hardAttack: number
  defense: number
  breakthrough: number
  armor: number
  piercing: number
  maximumSpeed: number
  supplyConsumption: number
  trainingTime: number
}

export function calculateDivisionStats(template: DivisionTemplate): DivisionCompositeStats {
  const combatBattalions: BattalionStats[] = []
  for (const row of template.grid) {
    for (const b of row) {
      if (b) combatBattalions.push(b)
    }
  }

  const supportCompanies: BattalionStats[] = []
  for (const s of template.supportCompanies) {
    if (s) supportCompanies.push(s)
  }

  const allUnits = [...combatBattalions, ...supportCompanies]

  if (allUnits.length === 0) {
    return {
      totalBattalions: 0,
      totalSupportCompanies: 0,
      combatWidth: 0,
      manpower: 0,
      maxHp: 0,
      organization: 0,
      softAttack: 0,
      hardAttack: 0,
      defense: 0,
      breakthrough: 0,
      armor: 0,
      piercing: 0,
      maximumSpeed: 0,
      supplyConsumption: 0,
      trainingTime: 0,
    }
  }

  // Combat width: only combat battalions contribute, support companies do not
  const combatWidth = combatBattalions.reduce((sum, b) => sum + b.combatWidth, 0)

  // Manpower, HP, attacks, defense, breakthrough, supply
  const manpower = allUnits.reduce((sum, u) => sum + u.manpower, 0)
  const maxHp = allUnits.reduce((sum, u) => sum + u.maxHp, 0)
  const softAttack = allUnits.reduce((sum, u) => sum + u.softAttack, 0)
  const hardAttack = allUnits.reduce((sum, u) => sum + u.hardAttack, 0)
  const defense = allUnits.reduce((sum, u) => sum + u.defense, 0)
  const breakthrough = allUnits.reduce((sum, u) => sum + u.breakthrough, 0)
  const supplyConsumption = Number(allUnits.reduce((sum, u) => sum + u.supplyConsumption, 0).toFixed(3))

  // Organization is arithmetic average across all units
  const totalOrg = allUnits.reduce((sum, u) => sum + u.organization, 0)
  const organization = Number((totalOrg / allUnits.length).toFixed(1))

  // Armor: 40% of highest armor + 60% of average (NMilitary.ARMOR_VS_AVERAGE = 0.4) across all units
  const maxArmor = Math.max(...allUnits.map(u => u.armor), 0)
  const avgArmor = allUnits.reduce((sum, u) => sum + u.armor, 0) / allUnits.length
  const armor = Number((0.4 * maxArmor + 0.6 * avgArmor).toFixed(1))

  // Piercing: 40% of highest piercing + 60% of average piercing across all units
  const maxPiercing = Math.max(...allUnits.map(u => u.piercing), 0)
  const avgPiercing = allUnits.reduce((sum, u) => sum + u.piercing, 0) / allUnits.length
  const piercing = Number((0.4 * maxPiercing + 0.6 * avgPiercing).toFixed(1))

  // Maximum speed: constrained by the slowest combat battalion (if no combat battalions, min support)
  const speedUnits = combatBattalions.length > 0 ? combatBattalions : supportCompanies
  const maximumSpeed = Math.min(...speedUnits.map(u => u.maximumSpeed))

  // Training time: max training time of any battalion
  const trainingTime = Math.max(...allUnits.map(u => u.trainingTime), 0)

  return {
    totalBattalions: combatBattalions.length,
    totalSupportCompanies: supportCompanies.length,
    combatWidth,
    manpower,
    maxHp,
    organization,
    softAttack,
    hardAttack,
    defense,
    breakthrough,
    armor,
    piercing,
    maximumSpeed,
    supplyConsumption,
    trainingTime,
  }
}
