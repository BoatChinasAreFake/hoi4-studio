// Economy, Tech Trees, Special Projects, Raids, Market & Resources Types

export type TechFolder =
  | 'infantry_folder'
  | 'armor_folder'
  | 'artillery_folder'
  | 'air_techs_folder'
  | 'naval_folder'
  | 'industry_folder'
  | 'electronics_folder';

export interface TechNode {
  id: string;
  name: string;
  folder: TechFolder;
  x: number; // grid column (pitch: 120px)
  y: number; // grid row (pitch: 150px)
  researchCost: number; // in base days/years factor (e.g. 1.5, 2.0)
  startYear: number;
  dependencies: string[]; // parent tech IDs (AND/OR logic)
  mutuallyExclusive: string[]; // XOR exclusive tech IDs
  enableEquipments?: string[];
  subTechnologies?: string[];
  categories: string[];
  bonusDescription?: string;
}

export type RaidCategory =
  | 'air_raid'
  | 'commando_raid'
  | 'naval_raid'
  | 'nuclear_raid'
  | 'paratrooper_raid'
  | 'infiltration_raid';

export type RaidArrowType = 'air' | 'naval' | 'land' | 'ballistic' | 'line';

export interface RaidPrepPhase {
  name: string;
  durationDays: number;
  requiredIntel: number; // 0-100%
  commandPowerCost: number;
}

export interface RaidOutcomeEffect {
  damageBuildingType?: string;
  damageBuildingLevel?: number;
  damageInfrastructure?: number;
  addWarSupport?: number;
  addStability?: number;
  killOperativesChance?: number;
  captureTechBonus?: string;
}

export interface RaidMissionDef {
  id: string;
  name: string;
  category: RaidCategory;
  arrowType: RaidArrowType;
  commandPower: number;
  targetStateId?: number;
  targetProvinceId?: number;
  prepPhases: RaidPrepPhase[];
  requiredEquipment: Record<string, number>;
  successEffect: RaidOutcomeEffect;
  criticalSuccessEffect?: RaidOutcomeEffect;
  failureEffect: RaidOutcomeEffect;
  detectionRisk: number; // 0-100%
}

export type SpecialProjectType =
  | 'nuclear'
  | 'land_cruiser'
  | 'jet_propulsion'
  | 'stealth_submarine'
  | 'electronics'
  | 'artillery'
  | 'rocket';

export type SpecialProjectComplexity = 'simple' | 'medium' | 'complex' | 'insane';

export interface ScientistTalent {
  id: string;
  name: string;
  trait: string;
  specialization: SpecialProjectType;
  skillLevel: number; // 1-5
  speedBonus: number; // e.g. 0.15 = +15%
}

export interface SpecialProjectDef {
  id: string;
  name: string;
  projectType: SpecialProjectType;
  facilityType: string;
  prototypeCostResources: Record<string, number>; // e.g. { steel: 10, chromium: 5, tungsten: 4 }
  prototypeCostCivFactories: number;
  prototypeTimeDays: number;
  complexity: SpecialProjectComplexity;
  assignedScientistId?: string;
  parentProjectId?: string;
  unlockedBreakthroughs: string[];
  rewardOutput: {
    enableEquipment?: string;
    customEffectTooltip: string;
    bonusTechSpeed?: number;
  };
}

export interface MarketSubsidiesConfig {
  bilateralSubsidies: {
    buyerTag: string;
    sellerTag: string;
    equipmentCategory: string; // infantry, armor, air, naval
    discountPercent: number; // e.g. 20 for 20%
    deliverySpeedBonusPercent: number; // e.g. 25 for 25% faster
  }[];
  civFactoryExchangeRatio: number; // civilian factory to production credits (default: 5.0)
  baseDeliveryDaysPerBatch: number; // default: 30
  tradeQuotaRules: {
    ruleId: string;
    description: string;
    minWorldTension: number;
    embargoIdeologies: string[];
    marketPriorityTier: 'civilian' | 'priority' | 'strategic';
  }[];
}

export interface StrategicResourceDef {
  id: string;
  name: string;
  icon: string;
  baseCicCost: number; // civilian factories needed per 8 units (default: 1)
  isCustom: boolean;
  convoysRequiredPerUnit: number;
  syntheticProductionCostCic?: number;
}

export interface CustomBuildingDef {
  id: string;
  name: string;
  icon: string;
  isProvincial: boolean; // provincial = true (coastal bunker, naval base) vs state = false (arms factory, civ factory)
  baseCost: number; // production cost (IC)
  perLevelExtraCost: number;
  maxLevel: number;
  sharesSlots: boolean;
  showOnMap: boolean;
  damageFactor: number;
  modifiers?: Record<string, number | string>;
}
