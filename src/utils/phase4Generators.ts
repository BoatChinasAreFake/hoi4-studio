import type { TechNode } from '../types/economy';
import type {
  ModularChassisDesign,
  EquipmentModuleDef,
  CompositeChassisStats,
  DivisionTemplateState,
  DivisionRollupStats,
} from '../types/military';

/**
 * Validates a Technology DAG for cycles, coordinate collisions, and mutual exclusion conflicts.
 */
export function validateTechTreeDag(nodes: TechNode[]) {
  const nodeMap = new Map<string, TechNode>();
  const coordMap = new Map<string, string[]>();
  const orphanDependencies: string[] = [];
  const coordinateCollisions: string[] = [];

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    const key = `${n.folder}_${n.x}_${n.y}`;
    if (!coordMap.has(key)) coordMap.set(key, []);
    coordMap.get(key)!.push(n.id);
  }

  // Coordinate collisions
  for (const [key, ids] of coordMap.entries()) {
    if (ids.length > 1) {
      coordinateCollisions.push(`Coordinate collision at ${key}: [${ids.join(', ')}]`);
    }
  }

  // Orphan dependencies
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      if (!nodeMap.has(dep)) {
        orphanDependencies.push(`Tech '${n.id}' requires non-existent dependency '${dep}'`);
      }
    }
  }

  // Kahn's algorithm for cycle detection
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const n of nodes) {
    for (const dep of n.dependencies) {
      if (nodeMap.has(dep)) {
        adj.get(dep)!.push(n.id);
        inDegree.set(n.id, (inDegree.get(n.id) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    visitedCount++;
    for (const next of adj.get(curr) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  const cycleDetected = visitedCount < nodes.length;
  const cyclicNodes: string[] = [];
  if (cycleDetected) {
    for (const [id, deg] of inDegree.entries()) {
      if (deg > 0) cyclicNodes.push(id);
    }
  }

  // Mutual exclusion conflicts
  const mutualExclusionConflicts: string[] = [];
  for (const n of nodes) {
    for (const xor of n.mutuallyExclusive) {
      if (n.dependencies.includes(xor)) {
        mutualExclusionConflicts.push(
          `Tech '${n.id}' has '${xor}' as dependency while also marking it mutually exclusive`
        );
      }
    }
  }

  const isValid =
    !cycleDetected &&
    orphanDependencies.length === 0 &&
    coordinateCollisions.length === 0 &&
    mutualExclusionConflicts.length === 0;

  return {
    isValid,
    cycleDetected,
    cyclicNodes,
    orphanDependencies,
    coordinateCollisions,
    mutualExclusionConflicts,
  };
}

/**
 * Calculates genuine HOI4 research time with ahead-of-time penalty and national bonuses.
 */
export function calculateResearchCost(
  baseCost: number,
  startYear: number,
  currentYear: number,
  bonusPercent: number,
  penaltyPerYear: number = 2.0
) {
  // common/defines/00_defines.lua NTechnology: BASE_TECH_COST = 110, BASE_YEAR_AHEAD_PENALTY_FACTOR = 2,
  // MIN_RESEARCH_SPEED = 0.1. Focus `ahead_reduction` lowers the per-year penalty (pass it via penaltyPerYear).
  const baseDays = baseCost * 110;
  const yearsAhead = Math.max(0, startYear - currentYear);
  const isAheadOfTime = yearsAhead > 0;
  const aheadPenaltyFactor = isAheadOfTime ? 1.0 + yearsAhead * penaltyPerYear : 1.0;
  // Research speed bonuses add to the speed multiplier, so time scales with 1 / (1 + bonus).
  const bonusFactor = 1.0 / Math.max(0.1, 1.0 + bonusPercent / 100.0);
  // The game rounds partial days up (110 days at +15% speed -> 96); the epsilon absorbs float noise.
  const finalResearchDays = Math.ceil(baseDays * aheadPenaltyFactor * bonusFactor - 1e-9);

  return {
    baseDays,
    yearsAhead,
    isAheadOfTime,
    aheadPenaltyFactor,
    bonusFactor,
    finalResearchDays,
  };
}

/**
 * Calculates AAT International Market delivery schedule and factory allocations.
 */
export function calculateMarketDeliverySchedule(
  equipmentCount: number,
  icCostPerUnit: number,
  civFactoriesPaid: number,
  subsidyDiscountPercent: number = 0,
  subsidySpeedBonusPercent: number = 0,
  exchangeRatio: number = 5.0,
  baseDeliveryDaysPerBatch: number = 30
) {
  const totalIc = equipmentCount * icCostPerUnit;
  const totalContractCost = totalIc / exchangeRatio;
  const discountRate = subsidyDiscountPercent / 100.0;
  const subsidizedCost = Math.max(0, totalContractCost * (1.0 - discountRate));

  const batches = Math.max(1, Math.ceil(equipmentCount / 50));
  const civSpeedFactor = Math.max(1, civFactoriesPaid);
  const speedBonusRate = subsidySpeedBonusPercent / 100.0;
  const daysPerBatch = Math.max(
    10,
    Math.round((baseDeliveryDaysPerBatch / civSpeedFactor) * (1.0 - speedBonusRate * 0.5))
  );
  const totalDeliveryDays = daysPerBatch * batches;

  return {
    totalIc,
    totalContractCost: Math.round(totalContractCost * 10) / 10,
    subsidizedCost: Math.round(subsidizedCost * 10) / 10,
    batches,
    daysPerBatch,
    totalDeliveryDays,
  };
}

/**
 * Real-time composite stat calculation for Modular Tanks, Planes, and Ships.
 */
export function calculateCompositeChassisStats(
  design: ModularChassisDesign,
  moduleDatabase: EquipmentModuleDef[]
): CompositeChassisStats {
  let softAttack = design.baseStats.softAttack || 0;
  let hardAttack = design.baseStats.hardAttack || 0;
  let defense = design.baseStats.defense || 0;
  let breakthrough = design.baseStats.breakthrough || 0;
  let armor = (design.baseStats.armor || 0) + design.armorLevel * 2.5;
  let piercing = design.baseStats.piercing || 0;
  let speed = (design.baseStats.maximumSpeed || 0) + design.engineLevel * 0.4;
  let reliability = 100.0 + (design.baseStats.reliability || 0) * 100.0;
  let cost =
    (design.baseStats.productionCost || 0) +
    design.armorLevel * 0.5 +
    design.engineLevel * 0.4;
  let airDefense = design.baseStats.airDefense || 0;
  let airAttack = design.baseStats.airAttack || 0;
  let thrust = design.baseStats.thrust || 0;
  let weight = design.baseStats.weight || 0;
  let surfaceDetection = design.baseStats.surfaceDetection || 0;
  let subDetection = design.baseStats.subDetection || 0;
  let surfaceVisibility = design.baseStats.surfaceVisibility || 0;
  let fuelConsumption = design.baseStats.fuelConsumption || 0;
  let manpower = design.baseStats.manpower || 0;

  let speedMult = 1.0;
  let armorMult = 1.0;
  let costMult = 1.0;
  let reliabilityModSum = 0.0;

  const validationErrors: string[] = [];

  for (const modId of Object.values(design.slots)) {
    const mod = moduleDatabase.find((m) => m.id === modId);
    if (!mod) continue;

    softAttack += mod.stats.softAttack || 0;
    hardAttack += mod.stats.hardAttack || 0;
    defense += mod.stats.defense || 0;
    breakthrough += mod.stats.breakthrough || 0;
    armor += mod.stats.armor || 0;
    piercing += mod.stats.piercing || 0;
    speed += mod.stats.maximumSpeed || 0;
    reliability += (mod.stats.reliability || 0) * 100.0;
    cost += mod.stats.productionCost || 0;
    airDefense += mod.stats.airDefense || 0;
    airAttack += mod.stats.airAttack || 0;
    thrust += mod.stats.thrust || 0;
    weight += mod.stats.weight || 0;
    surfaceDetection += mod.stats.surfaceDetection || 0;
    subDetection += mod.stats.subDetection || 0;
    surfaceVisibility += mod.stats.surfaceVisibility || 0;
    fuelConsumption += mod.stats.fuelConsumption || 0;
    manpower += mod.stats.manpower || 0;

    if (mod.multipliers?.maximumSpeed) speedMult *= 1.0 + mod.multipliers.maximumSpeed;
    if (mod.multipliers?.armor) armorMult *= 1.0 + mod.multipliers.armor;
    if (mod.multipliers?.productionCost) costMult *= 1.0 + mod.multipliers.productionCost;
    if (mod.multipliers?.reliability) reliabilityModSum += mod.multipliers.reliability;
  }

  speed = Math.max(0, speed * speedMult);
  armor = Math.max(0, armor * armorMult);
  cost = Math.max(1, cost * costMult);
  const reliabilityMult = Math.max(0, 1.0 + reliabilityModSum);
  reliability = Math.min(200, Math.max(0, reliability * reliabilityMult));

  if (design.category === 'plane') {
    if (thrust < weight) {
      validationErrors.push(`Thrust deficit: Total thrust (${thrust.toFixed(1)}) is lower than weight (${weight.toFixed(1)})`);
    }
    if (!design.slots.engine) {
      validationErrors.push('Missing engine module');
    }
  } else if (design.category === 'tank') {
    if (!design.slots.main_armament) {
      validationErrors.push('Missing primary armament');
    }
  }

  return {
    softAttack: Math.round(softAttack * 10) / 10,
    hardAttack: Math.round(hardAttack * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    breakthrough: Math.round(breakthrough * 10) / 10,
    armor: Math.round(armor * 10) / 10,
    piercing: Math.round(piercing * 10) / 10,
    maximumSpeed: Math.round(speed * 10) / 10,
    reliability: Math.round(reliability * 10) / 10,
    productionCost: Math.round(cost * 10) / 10,
    airDefense: Math.round(airDefense * 10) / 10,
    airAttack: Math.round(airAttack * 10) / 10,
    thrust: Math.round(thrust * 10) / 10,
    weight: Math.round(weight * 10) / 10,
    surfaceDetection: Math.round(surfaceDetection * 10) / 10,
    subDetection: Math.round(subDetection * 10) / 10,
    surfaceVisibility: Math.round(surfaceVisibility * 10) / 10,
    fuelConsumption: Math.round(fuelConsumption * 10) / 10,
    manpower: Math.round(manpower),
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * 5x5 Division Template Stat Rollup calculation.
 */
export function calculateDivisionStats(template: DivisionTemplateState): DivisionRollupStats {
  const combatBattalions = template.grid.flat().filter((b): b is NonNullable<typeof b> => b !== null);
  const supportCompanies = template.supportCompanies.filter((b): b is NonNullable<typeof b> => b !== null);
  const allUnits = [...combatBattalions, ...supportCompanies];

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
    };
  }

  let bonusSoft = 0;
  let bonusHard = 0;
  for (const att of template.regimentalAttachments) {
    bonusSoft += att.bonusSoftAttack;
    bonusHard += att.bonusHardAttack;
  }

  const combatWidth = combatBattalions.reduce((sum, b) => sum + b.combatWidth, 0);
  const manpower = allUnits.reduce((sum, u) => sum + u.manpower, 0);
  const maxHp = allUnits.reduce((sum, u) => sum + u.maxHp, 0);
  const softAttack = allUnits.reduce((sum, u) => sum + u.softAttack, 0) + bonusSoft;
  const hardAttack = allUnits.reduce((sum, u) => sum + u.hardAttack, 0) + bonusHard;
  const defense = allUnits.reduce((sum, u) => sum + u.defense, 0);
  const breakthrough = allUnits.reduce((sum, u) => sum + u.breakthrough, 0);
  const supplyConsumption = allUnits.reduce((sum, u) => sum + u.supplyConsumption, 0);

  const totalOrg = allUnits.reduce((sum, u) => sum + u.organization, 0);
  const organization = totalOrg / allUnits.length;

  const maxArmor = Math.max(...allUnits.map((u) => u.armor), 0);
  const avgArmor = allUnits.reduce((sum, u) => sum + u.armor, 0) / allUnits.length;
  const armor = 0.4 * maxArmor + 0.6 * avgArmor; // NMilitary.ARMOR_VS_AVERAGE = 0.4

  const maxPiercing = Math.max(...allUnits.map((u) => u.piercing), 0);
  const avgPiercing = allUnits.reduce((sum, u) => sum + u.piercing, 0) / allUnits.length;
  const piercing = 0.4 * maxPiercing + 0.6 * avgPiercing;

  const speedUnits = combatBattalions.length > 0 ? combatBattalions : supportCompanies;
  const maximumSpeed = Math.min(...speedUnits.map((u) => u.maximumSpeed));
  const trainingTime = Math.max(...allUnits.map((u) => u.trainingTime), 0);

  return {
    totalBattalions: combatBattalions.length,
    totalSupportCompanies: supportCompanies.length,
    combatWidth,
    manpower,
    maxHp: Math.round(maxHp * 10) / 10,
    organization: Math.round(organization * 10) / 10,
    softAttack: Math.round(softAttack * 10) / 10,
    hardAttack: Math.round(hardAttack * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    breakthrough: Math.round(breakthrough * 10) / 10,
    armor: Math.round(armor * 10) / 10,
    piercing: Math.round(piercing * 10) / 10,
    maximumSpeed: Math.round(maximumSpeed * 10) / 10,
    supplyConsumption: Math.round(supplyConsumption * 1000) / 1000,
    trainingTime,
  };
}
