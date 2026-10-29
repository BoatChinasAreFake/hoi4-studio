// Military Studio Types: Modular Chassis Designer, 5x5 Division Designer, HQs & Auras, Doctrines

export type EquipmentChassisCategory = 'tank' | 'plane' | 'ship';

export type TankChassisType =
  | 'light_tank_chassis'
  | 'medium_tank_chassis'
  | 'heavy_tank_chassis'
  | 'super_heavy_tank_chassis'
  | 'modern_tank_chassis';

export type PlaneAirframeType =
  | 'small_plane_airframe' // Fighter, CAS, Nav Bomber
  | 'medium_plane_airframe' // Tactical Bomber, Heavy Fighter, Scout
  | 'large_plane_airframe'; // Strategic Bomber, Maritime Patrol

export type ShipHullType =
  | 'ship_hull_light' // Destroyer
  | 'ship_hull_cruiser' // Light / Heavy Cruiser
  | 'ship_hull_heavy' // Battleship / Battlecruiser
  | 'ship_hull_carrier' // Aircraft Carrier
  | 'ship_hull_submarine'; // Submarine

export type ChassisArchetype = TankChassisType | PlaneAirframeType | ShipHullType;

export interface ModuleStatDelta {
  softAttack?: number;
  hardAttack?: number;
  defense?: number;
  breakthrough?: number;
  armor?: number;
  piercing?: number;
  maximumSpeed?: number;
  reliability?: number; // percentage (e.g. -0.10 for -10%, +0.15 for +15%)
  productionCost?: number;
  airDefense?: number;
  airAttack?: number;
  thrust?: number;
  weight?: number;
  surfaceDetection?: number;
  subDetection?: number;
  surfaceVisibility?: number;
  fuelConsumption?: number;
  manpower?: number;
}

export interface EquipmentModuleDef {
  id: string;
  name: string;
  category: EquipmentChassisCategory;
  allowedSlotTypes: string[];
  stats: ModuleStatDelta;
  multipliers?: ModuleStatDelta;
  requiredTech?: string;
  icon?: string;
}

export interface ChassisSlotConfig {
  slotId: string;
  slotName: string;
  allowedCategories: string[];
  assignedModuleId?: string;
  isMandatory: boolean;
}

export interface ModularChassisDesign {
  id: string;
  name: string;
  category: EquipmentChassisCategory;
  chassisType: ChassisArchetype;
  year: number;
  baseStats: ModuleStatDelta;
  slots: Record<string, string>; // slotId -> moduleId
  armorLevel: number; // 0 to 20 for tanks/ships
  engineLevel: number; // 0 to 20
  roleTag?: string; // e.g. "tank_destroyer", "fighter", "cas"
}

export interface CompositeChassisStats {
  softAttack: number;
  hardAttack: number;
  defense: number;
  breakthrough: number;
  armor: number;
  piercing: number;
  maximumSpeed: number;
  reliability: number; // percentage 0-100%
  productionCost: number;
  airDefense: number;
  airAttack: number;
  thrust: number;
  weight: number;
  surfaceDetection: number;
  subDetection: number;
  surfaceVisibility: number;
  fuelConsumption: number;
  manpower: number;
  isValid: boolean;
  validationErrors: string[];
}

// 5x5 Division Grid Types
export interface BattalionTypeInfo {
  id: string;
  name: string;
  category: 'infantry' | 'mobile' | 'armor' | 'artillery' | 'support';
  isSupportCompany: boolean;
  combatWidth: number;
  manpower: number;
  maxHp: number;
  organization: number;
  softAttack: number;
  hardAttack: number;
  defense: number;
  breakthrough: number;
  armor: number;
  piercing: number;
  maximumSpeed: number;
  supplyConsumption: number;
  trainingTime: number;
  equipmentNeeds: Record<string, number>;
  icon: string;
}

export interface RegimentalAttachment {
  regimentColumn: number; // 0-4
  attachmentId: string; // e.g. "regimental_heavy_artillery", "regimental_command"
  bonusSoftAttack: number;
  bonusHardAttack: number;
  bonusPlanningSpeed: number;
}

export interface DivisionTemplateState {
  id: string;
  name: string;
  // 5 columns (regiments) x 5 rows of battalions (25 cells)
  grid: Array<Array<BattalionTypeInfo | null>>;
  // 5 support company slots
  supportCompanies: Array<BattalionTypeInfo | null>;
  regimentalAttachments: RegimentalAttachment[];
}

export interface DivisionRollupStats {
  totalBattalions: number;
  totalSupportCompanies: number;
  combatWidth: number;
  manpower: number;
  maxHp: number;
  organization: number;
  softAttack: number;
  hardAttack: number;
  defense: number;
  breakthrough: number;
  armor: number;
  piercing: number;
  maximumSpeed: number;
  supplyConsumption: number;
  trainingTime: number;
}

// Military Headquarters (HQs) & Command Auras Types
export type HqLevel = 'corps_hq' | 'army_hq' | 'army_group_hq' | 'theater_command';

export interface GeneralStaffTrait {
  id: string;
  name: string;
  description: string;
  supplyThroughputBonus: number; // e.g. 0.15 = +15%
  planningSpeedMultiplier: number; // e.g. 0.20 = +20%
  reinforceRateBonus: number; // e.g. 0.05 = +5%
  commandPowerUpkeepCost: number; // e.g. 0.10/day
}

export interface MilitaryHqDef {
  id: string;
  name: string;
  level: HqLevel;
  auraRadiusProvinces: number; // 1 to 10 provinces
  staffTraits: string[]; // trait IDs
  assignedCommanderName: string;
  baseSupplyBonus: number;
  basePlanningMultiplier: number;
  locationProvinceId: number;
}

// Doctrines & Special Forces Types
export type DoctrineBranchType =
  | 'mobile_warfare'
  | 'superior_firepower'
  | 'grand_battleplan'
  | 'mass_assault'
  | 'fleet_in_being'
  | 'trade_interdiction'
  | 'base_strike'
  | 'strategic_destruction'
  | 'battlefield_support'
  | 'operational_integrity'
  | 'mountaineers'
  | 'marines'
  | 'paratroopers'
  | 'dispersed_operations';

export type DoctrineCategory = 'land' | 'naval' | 'air' | 'special_forces';

export interface DoctrineNodeDef {
  id: string;
  name: string;
  branch: DoctrineBranchType;
  category: DoctrineCategory;
  level: number;
  costXp: number; // Military XP cost (default: 100)
  parentDoctrineId?: string;
  mutuallyExclusiveWith?: string[];
  statModifiers: Record<string, number | string>;
  description: string;
  icon: string;
}
