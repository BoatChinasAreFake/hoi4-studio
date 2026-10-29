import { describe, it, expect } from 'vitest';
import {
  calculateCompositeChassisStats,
  calculateDivisionStats,
} from '../src/utils/phase4Generators';
import type {
  ModularChassisDesign,
  EquipmentModuleDef,
  DivisionTemplateState,
  BattalionTypeInfo,
  MilitaryHqDef,
  GeneralStaffTrait,
  DoctrineNodeDef,
} from '../src/types/military';

// Module Database Fixtures for Stress Testing
const STRESS_MODULES: EquipmentModuleDef[] = [
  // Tank Modules
  {
    id: 'heavy_cannon_3',
    name: 'Heavy Cannon III',
    category: 'tank',
    allowedSlotTypes: ['main_armament'],
    stats: { softAttack: 45, hardAttack: 40, piercing: 95, productionCost: 9 },
  },
  {
    id: 'super_heavy_turret',
    name: 'Super Heavy Three-Man Turret',
    category: 'tank',
    allowedSlotTypes: ['turret'],
    stats: { breakthrough: 32, armor: 25, productionCost: 8 },
    multipliers: { reliability: -0.25, maximumSpeed: -0.15 },
  },
  {
    id: 'cast_armor_max',
    name: 'Cast Armor Thickened',
    category: 'tank',
    allowedSlotTypes: ['armor_type'],
    stats: { armor: 40, productionCost: 7 },
    multipliers: { armor: 0.40, productionCost: 0.15, maximumSpeed: -0.10 },
  },
  {
    id: 'weak_gas_engine',
    name: 'Primitive 150hp Engine',
    category: 'tank',
    allowedSlotTypes: ['engine'],
    stats: { maximumSpeed: 1.5, productionCost: 1 },
    multipliers: { reliability: -0.15 },
  },
  {
    id: 'high_performance_diesel',
    name: 'Heavy Diesel Engine V12',
    category: 'tank',
    allowedSlotTypes: ['engine'],
    stats: { maximumSpeed: 8.0, productionCost: 5 },
    multipliers: { reliability: 0.30 },
  },
  {
    id: 'extreme_slow_tracks',
    name: 'Overburdened Suspension',
    category: 'tank',
    allowedSlotTypes: ['suspension'],
    stats: { maximumSpeed: -20 }, // Severe negative flat speed
    multipliers: { maximumSpeed: -0.80 }, // Negative speed multiplier
  },

  // Plane Modules
  {
    id: 'weak_plane_engine_1',
    name: 'Low-Power Inline Engine I',
    category: 'plane',
    allowedSlotTypes: ['engine'],
    stats: { thrust: 15, maximumSpeed: 380, productionCost: 4 },
  },
  {
    id: 'powerful_twin_engine',
    name: 'Twin Turbocompound Engine',
    category: 'plane',
    allowedSlotTypes: ['engine'],
    stats: { thrust: 55, maximumSpeed: 620, productionCost: 16 },
  },
  {
    id: 'heavy_tank_buster_cannon',
    name: '37mm Anti-Tank Gun',
    category: 'plane',
    allowedSlotTypes: ['weapon_1', 'weapon_2'],
    stats: { hardAttack: 22, piercing: 35, weight: 12, productionCost: 8 },
  },
  {
    id: 'heavy_bomb_rack',
    name: '1000kg Heavy Bomb Rack',
    category: 'plane',
    allowedSlotTypes: ['weapon_1', 'weapon_2'],
    stats: { softAttack: 40, weight: 18, productionCost: 7 },
  },
  {
    id: 'heavy_pilot_armor',
    name: 'Armored Cockpit Tub',
    category: 'plane',
    allowedSlotTypes: ['special_1', 'special_2'],
    stats: { airDefense: 15, weight: 8, productionCost: 3 },
  },

  // Ship Modules
  {
    id: 'super_heavy_battery_460mm',
    name: 'Super Heavy Battery 460mm (Yamato)',
    category: 'ship',
    allowedSlotTypes: ['ship_battery'],
    stats: { hardAttack: 65, piercing: 60, surfaceVisibility: 8, productionCost: 3500 },
  },
  {
    id: 'dual_purpose_secondary_152mm',
    name: 'Secondary DP Battery 152mm',
    category: 'ship',
    allowedSlotTypes: ['secondary_battery'],
    stats: { softAttack: 18, airAttack: 14, productionCost: 650 },
  },
  {
    id: 'naval_turbine_super',
    name: 'Super-Heated Steam Turbines IV',
    category: 'ship',
    allowedSlotTypes: ['engine'],
    stats: { maximumSpeed: 34, fuelConsumption: 4.5, productionCost: 950 },
  },
  {
    id: 'heavy_ship_belt_armor',
    name: 'Thickened Krupp Belt Armor',
    category: 'ship',
    allowedSlotTypes: ['armor_type'],
    stats: { armor: 60, maximumSpeed: -4, productionCost: 1400 },
    multipliers: { armor: 0.30, maximumSpeed: -0.15 },
  },
  {
    id: 'advanced_sonar_array',
    name: 'Active Sonar Array',
    category: 'ship',
    allowedSlotTypes: ['radar_sonar'],
    stats: { subDetection: 28, surfaceDetection: 15, productionCost: 180 },
  },
];

// Battalion Catalog Fixtures for 5x5 Stress Testing
const BATTALION_CATALOG_STRESS: Record<string, BattalionTypeInfo> = {
  infantry: {
    id: 'infantry',
    name: 'Infantry Battalion',
    category: 'infantry',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1000,
    maxHp: 25,
    organization: 60,
    softAttack: 6,
    hardAttack: 1,
    defense: 22,
    breakthrough: 3,
    armor: 0,
    piercing: 4,
    maximumSpeed: 4.0,
    supplyConsumption: 0.07,
    trainingTime: 90,
    equipmentNeeds: { infantry_equipment: 100 },
    icon: '🪖',
  },
  motorized: {
    id: 'motorized',
    name: 'Motorized Infantry',
    category: 'mobile',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1200,
    maxHp: 25,
    organization: 60,
    softAttack: 8,
    hardAttack: 2,
    defense: 24,
    breakthrough: 5,
    armor: 0,
    piercing: 5,
    maximumSpeed: 12.0,
    supplyConsumption: 0.12,
    trainingTime: 100,
    equipmentNeeds: { infantry_equipment: 100, motorized_equipment: 50 },
    icon: '🚚',
  },
  heavy_tank: {
    id: 'heavy_tank',
    name: 'Heavy Tank Battalion',
    category: 'armor',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 500,
    maxHp: 20,
    organization: 10,
    softAttack: 28,
    hardAttack: 32,
    defense: 18,
    breakthrough: 45,
    armor: 100,
    piercing: 75,
    maximumSpeed: 5.0,
    supplyConsumption: 0.25,
    trainingTime: 150,
    equipmentNeeds: { heavy_tank_equipment: 40 },
    icon: '🛡️',
  },
  super_heavy_tank: {
    id: 'super_heavy_tank',
    name: 'Super Heavy Tank Battalion',
    category: 'armor',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 500,
    maxHp: 20,
    organization: 5,
    softAttack: 40,
    hardAttack: 50,
    defense: 25,
    breakthrough: 65,
    armor: 140,
    piercing: 90,
    maximumSpeed: 3.5, // Slowest combat unit
    supplyConsumption: 0.40,
    trainingTime: 180,
    equipmentNeeds: { super_heavy_tank_equipment: 30 },
    icon: '🏰',
  },
  tank_destroyer: {
    id: 'heavy_tank_destroyer',
    name: 'Heavy Tank Destroyer',
    category: 'armor',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 500,
    maxHp: 20,
    organization: 8,
    softAttack: 12,
    hardAttack: 55,
    defense: 16,
    breakthrough: 20,
    armor: 95,
    piercing: 120, // Extreme piercing
    maximumSpeed: 5.0,
    supplyConsumption: 0.25,
    trainingTime: 150,
    equipmentNeeds: { heavy_tank_destroyer_equipment: 40 },
    icon: '🎯',
  },
  support_engineer: {
    id: 'support_engineer',
    name: 'Engineer Support',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 2.0,
    organization: 20,
    softAttack: 4,
    hardAttack: 2,
    defense: 12,
    breakthrough: 5,
    armor: 0,
    piercing: 5,
    maximumSpeed: 4.0,
    supplyConsumption: 0.02,
    trainingTime: 90,
    equipmentNeeds: { support_equipment: 30 },
    icon: '🔧',
  },
  support_artillery: {
    id: 'support_artillery',
    name: 'Support Artillery',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 0.5,
    organization: 0,
    softAttack: 22,
    hardAttack: 1.5,
    defense: 8,
    breakthrough: 4,
    armor: 0,
    piercing: 4,
    maximumSpeed: 4.0,
    supplyConsumption: 0.15,
    trainingTime: 90,
    equipmentNeeds: { artillery_equipment: 24 },
    icon: '💥',
  },
  support_anti_air: {
    id: 'support_anti_air',
    name: 'Support Anti-Air',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 0.5,
    organization: 0,
    softAttack: 8,
    hardAttack: 10,
    defense: 6,
    breakthrough: 2,
    armor: 0,
    piercing: 35,
    maximumSpeed: 4.0,
    supplyConsumption: 0.10,
    trainingTime: 90,
    equipmentNeeds: { anti_air_equipment: 20 },
    icon: '📡',
  },
  support_recon: {
    id: 'support_recon',
    name: 'Cavalry Recon Support',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 2.0,
    organization: 15,
    softAttack: 4,
    hardAttack: 1,
    defense: 10,
    breakthrough: 4,
    armor: 0,
    piercing: 3,
    maximumSpeed: 6.4,
    supplyConsumption: 0.03,
    trainingTime: 90,
    equipmentNeeds: { infantry_equipment: 40 },
    icon: '🐎',
  },
  support_logistics: {
    id: 'support_logistics',
    name: 'Logistics Company',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 500,
    maxHp: 2.0,
    organization: 10,
    softAttack: 0,
    hardAttack: 0,
    defense: 5,
    breakthrough: 0,
    armor: 0,
    piercing: 0,
    maximumSpeed: 4.0,
    supplyConsumption: -0.05,
    trainingTime: 90,
    equipmentNeeds: { motorized_equipment: 20 },
    icon: '📦',
  },
};

describe('Adversarial M3 Military Stress Harness', () => {
  // =========================================================================
  // SUITE 1: MODULAR CHASSIS DESIGNER BOUNDARY & STRESS TESTING
  // =========================================================================
  describe('Suite 1: Modular Chassis Designer Boundary & Stress Testing', () => {
    it('stresses NSB tank with heavy armor level 20, cast armor, and weak engine', () => {
      const superHeavyTank: ModularChassisDesign = {
        id: 'panzer_viii_maus',
        name: 'Panzer VIII Maus Super Heavy',
        category: 'tank',
        chassisType: 'super_heavy_tank_chassis',
        year: 1944,
        baseStats: {
          armor: 120,
          piercing: 30,
          maximumSpeed: 3.0,
          productionCost: 35,
          reliability: 0.0, // 100% baseline
        },
        slots: {
          main_armament: 'heavy_cannon_3',
          turret: 'super_heavy_turret',
          armor_type: 'cast_armor_max',
          engine: 'weak_gas_engine',
        },
        armorLevel: 20, // +50 armor (20 * 2.5), +10 cost (20 * 0.5)
        engineLevel: 1, // +0.4 speed, +0.4 cost
      };

      const stats = calculateCompositeChassisStats(superHeavyTank, STRESS_MODULES);

      // Base armor = 120 base + 50 (armorLevel 20) + 25 (turret) + 40 (cast armor) = 235
      // Cast armor multiplier: +40% -> 235 * 1.40 = 329.0
      expect(stats.armor).toBe(329.0);

      // Additive speed = 3.0 base + 0.4 (engineLevel 1) + 1.5 (engine module) = 4.9 km/h
      // Multipliers: turret (-15%) * cast_armor (-10%) = (1 - 0.15) * (1 - 0.10) = 0.85 * 0.90 = 0.765
      // Final speed = 4.9 * 0.765 = 3.7485 -> 3.7 km/h
      expect(stats.maximumSpeed).toBe(3.7);

      // Additive cost = 35 base + 10 (armor lvl 20) + 0.4 (engine lvl 1) + 9 (cannon) + 8 (turret) + 7 (armor) + 1 (engine) = 70.4
      // Multiplier: cast armor +15% -> 70.4 * 1.15 = 80.96 -> 81.0
      expect(stats.productionCost).toBe(81.0);

      // Reliability: 100 base - 25 (turret) - 15 (engine) = 60.0%
      expect(stats.reliability).toBe(60.0);

      // Soft / Hard Attack rollups
      expect(stats.softAttack).toBe(45);
      expect(stats.hardAttack).toBe(40);
      expect(stats.piercing).toBe(125); // 30 base + 95 cannon
      expect(stats.breakthrough).toBe(32);
      expect(stats.isValid).toBe(true);
      expect(stats.validationErrors.length).toBe(0);
    });

    it('clamps negative speed modifiers to zero and prevents negative vehicle speed', () => {
      const paralyzedTank: ModularChassisDesign = {
        id: 'immobile_bunker_tank',
        name: 'Immobile Bunker Tank',
        category: 'tank',
        chassisType: 'heavy_tank_chassis',
        year: 1943,
        baseStats: {
          maximumSpeed: 2.0,
          productionCost: 20,
        },
        slots: {
          main_armament: 'heavy_cannon_3',
          suspension: 'extreme_slow_tracks', // -20 km/h flat, -80% mult
        },
        armorLevel: 0,
        engineLevel: 0,
      };

      const stats = calculateCompositeChassisStats(paralyzedTank, STRESS_MODULES);
      // 2.0 - 20 = -18.0 -> Math.max(0, -18.0 * 0.2) = 0
      expect(stats.maximumSpeed).toBe(0);
      expect(stats.isValid).toBe(true);
    });

    it('enforces mandatory tank primary armament and flags missing weapon slot', () => {
      const unarmedTank: ModularChassisDesign = {
        id: 'unarmed_tractor_tank',
        name: 'Weaponless Medium Tank Chassis',
        category: 'tank',
        chassisType: 'medium_tank_chassis',
        year: 1938,
        baseStats: { maximumSpeed: 6.0, productionCost: 10 },
        slots: {
          engine: 'high_performance_diesel',
          turret: 'super_heavy_turret',
          // Missing main_armament!
        },
        armorLevel: 2,
        engineLevel: 2,
      };

      const stats = calculateCompositeChassisStats(unarmedTank, STRESS_MODULES);
      expect(stats.isValid).toBe(false);
      expect(stats.validationErrors).toContain('Missing primary armament');
    });

    it('verifies BBA plane thrust deficit boundary (thrust < weight vs thrust == weight)', () => {
      // Overweight plane: 10 base weight + 18 (bomb rack) + 12 (37mm cannon) = 40 weight vs 15 thrust
      const deficitPlane: ModularChassisDesign = {
        id: 'ju87_overloaded',
        name: 'Overloaded Stuka',
        category: 'plane',
        chassisType: 'small_plane_airframe',
        year: 1940,
        baseStats: { weight: 10, thrust: 0, maximumSpeed: 350, productionCost: 10 },
        slots: {
          engine: 'weak_plane_engine_1', // 15 thrust
          weapon_1: 'heavy_bomb_rack', // 18 weight
          weapon_2: 'heavy_tank_buster_cannon', // 12 weight
        },
        armorLevel: 0,
        engineLevel: 0,
      };

      const deficitStats = calculateCompositeChassisStats(deficitPlane, STRESS_MODULES);
      expect(deficitStats.isValid).toBe(false);
      expect(deficitStats.thrust).toBe(15);
      expect(deficitStats.weight).toBe(40);
      expect(deficitStats.validationErrors.some((e) => e.includes('Thrust deficit'))).toBe(true);

      // Exact boundary: thrust == weight
      const balancedPlane: ModularChassisDesign = {
        id: 'balanced_fighter',
        name: 'Thrust-Balanced Fighter',
        category: 'plane',
        chassisType: 'small_plane_airframe',
        year: 1940,
        baseStats: { weight: 3, thrust: 0, maximumSpeed: 450, productionCost: 10 },
        slots: {
          engine: 'weak_plane_engine_1', // 15 thrust
          weapon_1: 'heavy_tank_buster_cannon', // 12 weight -> total weight 3 + 12 = 15 == thrust 15!
        },
        armorLevel: 0,
        engineLevel: 0,
      };

      const balancedStats = calculateCompositeChassisStats(balancedPlane, STRESS_MODULES);
      expect(balancedStats.thrust).toBe(15);
      expect(balancedStats.weight).toBe(15);
      expect(balancedStats.isValid).toBe(true);
      expect(balancedStats.validationErrors.length).toBe(0);
    });

    it('enforces mandatory engine module for aircraft', () => {
      const gliderPlane: ModularChassisDesign = {
        id: 'military_glider',
        name: 'Unpowered Assault Glider',
        category: 'plane',
        chassisType: 'medium_plane_airframe',
        year: 1941,
        baseStats: { weight: 5, thrust: 0, maximumSpeed: 200, productionCost: 6 },
        slots: {
          weapon_1: 'heavy_bomb_rack', // 18 weight
          // No engine module assigned!
        },
        armorLevel: 0,
        engineLevel: 0,
      };

      const gliderStats = calculateCompositeChassisStats(gliderPlane, STRESS_MODULES);
      expect(gliderStats.isValid).toBe(false);
      expect(gliderStats.validationErrors).toContain('Missing engine module');
    });

    it('stresses MtG ship composite stats for battleship vs destroyer configurations', () => {
      const battleshipYamato: ModularChassisDesign = {
        id: 'super_battleship_yamato',
        name: 'Super Battleship Yamato',
        category: 'ship',
        chassisType: 'ship_hull_heavy',
        year: 1941,
        baseStats: {
          armor: 80,
          maximumSpeed: 18.0,
          surfaceVisibility: 24,
          surfaceDetection: 10,
          subDetection: 0,
          fuelConsumption: 12.0,
          productionCost: 8000,
        },
        slots: {
          ship_battery: 'super_heavy_battery_460mm',
          secondary_battery: 'dual_purpose_secondary_152mm',
          engine: 'naval_turbine_super',
          armor_type: 'heavy_ship_belt_armor',
        },
        armorLevel: 10, // +25 armor, +5 cost
        engineLevel: 8, // +3.2 speed, +3.2 cost
      };

      const bbStats = calculateCompositeChassisStats(battleshipYamato, STRESS_MODULES);
      expect(bbStats.isValid).toBe(true);
      expect(bbStats.hardAttack).toBe(65);
      expect(bbStats.softAttack).toBe(18);
      expect(bbStats.airAttack).toBe(14);
      expect(bbStats.piercing).toBe(60);

      // Base armor: 80 + 25 (armor lvl 10) + 60 (belt armor) = 165
      // Belt armor multiplier: +30% -> 165 * 1.30 = 214.5
      expect(bbStats.armor).toBe(214.5);

      // Speed: 18.0 base + 3.2 (engine lvl 8) + 34 (engine) - 4 (armor) = 51.2
      // Multiplier: -15% -> 51.2 * 0.85 = 43.52 -> 43.5
      expect(bbStats.maximumSpeed).toBe(43.5);

      // Destroyer ASW Escort
      const destroyerFletcher: ModularChassisDesign = {
        id: 'destroyer_fletcher',
        name: 'Fletcher ASW Escort',
        category: 'ship',
        chassisType: 'ship_hull_light',
        year: 1942,
        baseStats: {
          armor: 5,
          maximumSpeed: 30.0,
          surfaceVisibility: 8,
          surfaceDetection: 12,
          subDetection: 5,
          fuelConsumption: 2.0,
          productionCost: 900,
        },
        slots: {
          secondary_battery: 'dual_purpose_secondary_152mm',
          engine: 'naval_turbine_super',
          radar_sonar: 'advanced_sonar_array',
        },
        armorLevel: 0,
        engineLevel: 0,
      };

      const ddStats = calculateCompositeChassisStats(destroyerFletcher, STRESS_MODULES);
      expect(ddStats.isValid).toBe(true);
      expect(ddStats.subDetection).toBe(33); // 5 base + 28 sonar
      expect(ddStats.surfaceDetection).toBe(27); // 12 base + 15 sonar
      expect(ddStats.airAttack).toBe(14);
      expect(ddStats.maximumSpeed).toBe(64); // 30 + 34
    });
  });

  // =========================================================================
  // SUITE 2: 5x5 DIVISION DESIGNER MATH STRESS & COMBINATORIAL ROLLUP
  // =========================================================================
  describe('Suite 2: 5x5 Division Designer Math Stress & Combinatorial Rollup', () => {
    it('handles empty division template with zero division error protection', () => {
      const emptyDivision: DivisionTemplateState = {
        id: 'empty_division',
        name: 'Empty Template',
        grid: [
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ],
        supportCompanies: [null, null, null, null, null],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(emptyDivision);
      expect(rollup.totalBattalions).toBe(0);
      expect(rollup.totalSupportCompanies).toBe(0);
      expect(rollup.combatWidth).toBe(0);
      expect(rollup.manpower).toBe(0);
      expect(rollup.maxHp).toBe(0);
      expect(rollup.organization).toBe(0);
      expect(rollup.softAttack).toBe(0);
      expect(rollup.hardAttack).toBe(0);
      expect(rollup.armor).toBe(0);
      expect(rollup.piercing).toBe(0);
      expect(rollup.maximumSpeed).toBe(0);
      expect(rollup.trainingTime).toBe(0);
      expect(Number.isNaN(rollup.organization)).toBe(false);
      expect(Number.isNaN(rollup.armor)).toBe(false);
      expect(Number.isNaN(rollup.piercing)).toBe(false);
    });

    it('verifies single battalion division stats match unit stats identically', () => {
      const singleTank: DivisionTemplateState = {
        id: 'single_tank_brigade',
        name: 'Lone Heavy Tank Brigade',
        grid: [
          [BATTALION_CATALOG_STRESS.heavy_tank, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ],
        supportCompanies: [],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(singleTank);
      expect(rollup.totalBattalions).toBe(1);
      expect(rollup.totalSupportCompanies).toBe(0);
      expect(rollup.combatWidth).toBe(2);
      expect(rollup.manpower).toBe(500);
      expect(rollup.organization).toBe(10);
      // Weighted Armor: 0.3 * 100 + 0.7 * 100 = 100
      expect(rollup.armor).toBe(100);
      // Weighted Piercing: 0.4 * 75 + 0.6 * 75 = 75
      expect(rollup.piercing).toBe(75);
      expect(rollup.maximumSpeed).toBe(5.0);
      expect(rollup.softAttack).toBe(28);
      expect(rollup.hardAttack).toBe(32);
    });

    it('verifies weighted armor formula on 24 infantry + 1 super heavy tank (30% max + 70% avg)', () => {
      // 24 Infantry (armor = 0) + 1 Super Heavy Tank (armor = 140)
      // Total units = 25
      // Max armor = 140
      // Average armor = (24 * 0 + 1 * 140) / 25 = 140 / 25 = 5.6
      // Weighted armor = 0.3 * 140 + 0.7 * 5.6 = 42.0 + 3.92 = 45.92 -> 45.9
      const grid: Array<Array<BattalionTypeInfo | null>> = [];
      let placedTank = false;

      for (let col = 0; col < 5; col++) {
        const colBattalions: Array<BattalionTypeInfo | null> = [];
        for (let row = 0; row < 5; row++) {
          if (!placedTank) {
            colBattalions.push(BATTALION_CATALOG_STRESS.super_heavy_tank);
            placedTank = true;
          } else {
            colBattalions.push(BATTALION_CATALOG_STRESS.infantry);
          }
        }
        grid.push(colBattalions);
      }

      const spaceMarineTemplate: DivisionTemplateState = {
        id: 'space_marine_division',
        name: 'Space Marine 24 Inf + 1 SHT',
        grid,
        supportCompanies: [],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(spaceMarineTemplate);
      expect(rollup.totalBattalions).toBe(25);
      expect(rollup.combatWidth).toBe(50); // 25 * 2
      expect(rollup.armor).toBe(45.9);
    });

    it('verifies weighted piercing formula on 24 infantry + 1 tank destroyer (40% max + 60% avg)', () => {
      // 24 Infantry (piercing = 4) + 1 Heavy Tank Destroyer (piercing = 120)
      // Total units = 25
      // Max piercing = 120
      // Average piercing = (24 * 4 + 1 * 120) / 25 = (96 + 120) / 25 = 216 / 25 = 8.64
      // Weighted piercing = 0.4 * 120 + 0.6 * 8.64 = 48.0 + 5.184 = 53.184 -> 53.2
      const grid: Array<Array<BattalionTypeInfo | null>> = [];
      let placedTd = false;

      for (let col = 0; col < 5; col++) {
        const colBattalions: Array<BattalionTypeInfo | null> = [];
        for (let row = 0; row < 5; row++) {
          if (!placedTd) {
            colBattalions.push(BATTALION_CATALOG_STRESS.tank_destroyer);
            placedTd = true;
          } else {
            colBattalions.push(BATTALION_CATALOG_STRESS.infantry);
          }
        }
        grid.push(colBattalions);
      }

      const antiTankTemplate: DivisionTemplateState = {
        id: 'anti_tank_infantry',
        name: '24 Inf + 1 TD Division',
        grid,
        supportCompanies: [],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(antiTankTemplate);
      expect(rollup.totalBattalions).toBe(25);
      expect(rollup.piercing).toBe(53.2);
    });

    it('verifies speed bottleneck: slowest combat battalion strictly dictates division speed', () => {
      // 24 Motorized Infantry (12.0 km/h) + 1 Super Heavy Tank (3.5 km/h)
      const grid: Array<Array<BattalionTypeInfo | null>> = [];
      let placedSht = false;

      for (let col = 0; col < 5; col++) {
        const colBattalions: Array<BattalionTypeInfo | null> = [];
        for (let row = 0; row < 5; row++) {
          if (!placedSht) {
            colBattalions.push(BATTALION_CATALOG_STRESS.super_heavy_tank); // 3.5 km/h
            placedSht = true;
          } else {
            colBattalions.push(BATTALION_CATALOG_STRESS.motorized); // 12.0 km/h
          }
        }
        grid.push(colBattalions);
      }

      const mixedSpeedTemplate: DivisionTemplateState = {
        id: 'bottlenecked_motorized',
        name: 'Motorized Division with 1 SHT Bottleneck',
        grid,
        supportCompanies: [],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(mixedSpeedTemplate);
      expect(rollup.maximumSpeed).toBe(3.5);
    });

    it('proves support companies do NOT slow down combat battalions in HOI4', () => {
      // 10 Motorized battalions (12.0 km/h) + 5 Support companies (4.0 km/h each)
      const motorizedGrid: Array<Array<BattalionTypeInfo | null>> = [
        [BATTALION_CATALOG_STRESS.motorized, BATTALION_CATALOG_STRESS.motorized, null, null, null],
        [BATTALION_CATALOG_STRESS.motorized, BATTALION_CATALOG_STRESS.motorized, null, null, null],
        [BATTALION_CATALOG_STRESS.motorized, BATTALION_CATALOG_STRESS.motorized, null, null, null],
        [BATTALION_CATALOG_STRESS.motorized, BATTALION_CATALOG_STRESS.motorized, null, null, null],
        [BATTALION_CATALOG_STRESS.motorized, BATTALION_CATALOG_STRESS.motorized, null, null, null],
      ];

      const supportList = [
        BATTALION_CATALOG_STRESS.support_engineer, // 4.0 km/h
        BATTALION_CATALOG_STRESS.support_artillery, // 4.0 km/h
        BATTALION_CATALOG_STRESS.support_anti_air, // 4.0 km/h
        BATTALION_CATALOG_STRESS.support_recon, // 6.4 km/h
        BATTALION_CATALOG_STRESS.support_logistics, // 4.0 km/h
      ];

      const template: DivisionTemplateState = {
        id: 'fast_motorized_with_support',
        name: 'Motorized Division With Slow Support',
        grid: motorizedGrid,
        supportCompanies: supportList,
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(template);
      expect(rollup.totalBattalions).toBe(10);
      expect(rollup.totalSupportCompanies).toBe(5);
      // Crucial HOI4 Rule: Combat width excludes support companies (10 * 2 = 20w)
      expect(rollup.combatWidth).toBe(20);
      // Crucial HOI4 Rule: Support companies do NOT drag down combat speed!
      expect(rollup.maximumSpeed).toBe(12.0);
    });

    it('verifies support companies govern speed ONLY when zero combat battalions are present', () => {
      const supportOnlyTemplate: DivisionTemplateState = {
        id: 'support_only_brigade',
        name: 'Garrison Support Unit',
        grid: [
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ],
        supportCompanies: [
          BATTALION_CATALOG_STRESS.support_recon, // 6.4 km/h
          BATTALION_CATALOG_STRESS.support_engineer, // 4.0 km/h
        ],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(supportOnlyTemplate);
      expect(rollup.totalBattalions).toBe(0);
      expect(rollup.totalSupportCompanies).toBe(2);
      expect(rollup.combatWidth).toBe(0);
      expect(rollup.maximumSpeed).toBe(4.0); // Slowest support company
    });

    it('stresses regimental attachments accumulator across all 5 regiments', () => {
      const template: DivisionTemplateState = {
        id: 'regimental_boosted_division',
        name: 'Artillery Reinforced Division',
        grid: [
          [BATTALION_CATALOG_STRESS.infantry, null, null, null, null],
          [BATTALION_CATALOG_STRESS.infantry, null, null, null, null],
          [BATTALION_CATALOG_STRESS.infantry, null, null, null, null],
          [BATTALION_CATALOG_STRESS.infantry, null, null, null, null],
          [BATTALION_CATALOG_STRESS.infantry, null, null, null, null],
        ],
        supportCompanies: [],
        regimentalAttachments: [
          { regimentColumn: 0, attachmentId: 'reg_art_1', bonusSoftAttack: 5, bonusHardAttack: 2, bonusPlanningSpeed: 0.05 },
          { regimentColumn: 1, attachmentId: 'reg_art_2', bonusSoftAttack: 5, bonusHardAttack: 2, bonusPlanningSpeed: 0.05 },
          { regimentColumn: 2, attachmentId: 'reg_art_3', bonusSoftAttack: 5, bonusHardAttack: 2, bonusPlanningSpeed: 0.05 },
          { regimentColumn: 3, attachmentId: 'reg_art_4', bonusSoftAttack: 5, bonusHardAttack: 2, bonusPlanningSpeed: 0.05 },
          { regimentColumn: 4, attachmentId: 'reg_art_5', bonusSoftAttack: 5, bonusHardAttack: 2, bonusPlanningSpeed: 0.05 },
        ],
      };

      const rollup = calculateDivisionStats(template);
      // 5 infantry battalions: base soft attack = 5 * 6 = 30
      // Regimental attachments: 5 * 5 = +25 soft attack -> Total 55
      expect(rollup.softAttack).toBe(55);
      // Hard attack: 5 * 1 = 5 + 5 * 2 = 10 -> Total 15
      expect(rollup.hardAttack).toBe(15);
    });
  });

  // =========================================================================
  // SUITE 3: MILITARY HQS & COMMAND AURA RADII & GENERAL STAFF TRAITS
  // =========================================================================
  describe('Suite 3: Military HQs, Command Auras & Staff Trait Stacking', () => {
    const STAFF_TRAITS_STRESS: Record<string, GeneralStaffTrait> = {
      logistics_master: {
        id: 'logistics_master',
        name: 'Logistics Master General',
        description: 'Increases regional supply throughput.',
        supplyThroughputBonus: 0.20,
        planningSpeedMultiplier: 0.10,
        reinforceRateBonus: 0.05,
        commandPowerUpkeepCost: 0.15,
      },
      deep_battle_coordinator: {
        id: 'deep_battle_coordinator',
        name: 'Deep Battle Coordinator',
        description: 'Greatly increases maximum planning values.',
        supplyThroughputBonus: 0.10,
        planningSpeedMultiplier: 0.35,
        reinforceRateBonus: 0.10,
        commandPowerUpkeepCost: 0.25,
      },
      blitzkrieg_staff_officer: {
        id: 'blitzkrieg_staff_officer',
        name: 'Mobile Warfare Chief of Staff',
        description: 'Imparts divisional movement speed and breakthrough bonuses.',
        supplyThroughputBonus: 0.05,
        planningSpeedMultiplier: 0.25,
        reinforceRateBonus: 0.08,
        commandPowerUpkeepCost: 0.20,
      },
      fortress_defense_expert: {
        id: 'fortress_defense_expert',
        name: 'Static Defense & Fortress Engineer',
        description: 'Increases entrenchment speed and defensive bonuses.',
        supplyThroughputBonus: 0.15,
        planningSpeedMultiplier: 0.05,
        reinforceRateBonus: 0.12,
        commandPowerUpkeepCost: 0.10,
      },
    };

    it('empirically simulates overlapping command aura radii between multiple HQs', () => {
      // Simulate linear front along provinces 100 to 110:
      // Army Group HQ at Prov 102 (radius 5: covers 97..107)
      // Field Army HQ at Prov 106 (radius 3: covers 103..109)
      // Corps HQ at Prov 115 (radius 2: covers 113..117)
      const hqs: MilitaryHqDef[] = [
        {
          id: 'army_group_north',
          name: 'Army Group North HQ',
          level: 'army_group_hq',
          auraRadiusProvinces: 5,
          staffTraits: ['logistics_master'],
          assignedCommanderName: 'Wilhelm Ritter von Leeb',
          baseSupplyBonus: 0.20,
          basePlanningMultiplier: 0.25,
          locationProvinceId: 102,
        },
        {
          id: 'sixteenth_army',
          name: '16th Army Headquarters',
          level: 'army_hq',
          auraRadiusProvinces: 3,
          staffTraits: ['deep_battle_coordinator'],
          assignedCommanderName: 'Ernst Busch',
          baseSupplyBonus: 0.15,
          basePlanningMultiplier: 0.20,
          locationProvinceId: 106,
        },
        {
          id: 'isolated_corps',
          name: 'Isolated Reserve Corps',
          level: 'corps_hq',
          auraRadiusProvinces: 2,
          staffTraits: ['fortress_defense_expert'],
          assignedCommanderName: 'General Staff',
          baseSupplyBonus: 0.10,
          basePlanningMultiplier: 0.10,
          locationProvinceId: 115,
        },
      ];

      // Check coverage for a given province:
      const getCoveringHqs = (provId: number) => {
        return hqs.filter((h) => Math.abs(h.locationProvinceId - provId) <= h.auraRadiusProvinces);
      };

      // Province 105: distance to HQ 102 is 3 (<=5) -> covered by Army Group!
      // Distance to HQ 106 is 1 (<=3) -> covered by 16th Army!
      // Province 105 is in an overlapping command aura!
      const prov105Coverage = getCoveringHqs(105);
      expect(prov105Coverage.length).toBe(2);
      expect(prov105Coverage.map((h) => h.id)).toContain('army_group_north');
      expect(prov105Coverage.map((h) => h.id)).toContain('sixteenth_army');

      // Province 101: distance to 102 is 1 (<=5). Distance to 106 is 5 (>3). Single coverage
      const prov101Coverage = getCoveringHqs(101);
      expect(prov101Coverage.length).toBe(1);
      expect(prov101Coverage[0].id).toBe('army_group_north');

      // Province 111: distance to 102 is 9 (>5). Distance to 106 is 5 (>3). Distance to 115 is 4 (>2). Zero coverage!
      const prov111Coverage = getCoveringHqs(111);
      expect(prov111Coverage.length).toBe(0);

      // Province 115: exactly at Isolated Corps location
      const prov115Coverage = getCoveringHqs(115);
      expect(prov115Coverage.length).toBe(1);
      expect(prov115Coverage[0].id).toBe('isolated_corps');
    });

    it('stresses General Staff trait stacking calculations on a quad-trait High Command HQ', () => {
      const traits = [
        STAFF_TRAITS_STRESS.logistics_master,
        STAFF_TRAITS_STRESS.deep_battle_coordinator,
        STAFF_TRAITS_STRESS.blitzkrieg_staff_officer,
        STAFF_TRAITS_STRESS.fortress_defense_expert,
      ];

      const totalSupplyBonus = traits.reduce((sum, t) => sum + t.supplyThroughputBonus, 0);
      const totalPlanningMultiplier = traits.reduce((sum, t) => sum + t.planningSpeedMultiplier, 0);
      const totalReinforceRate = traits.reduce((sum, t) => sum + t.reinforceRateBonus, 0);
      const totalCpUpkeep = traits.reduce((sum, t) => sum + t.commandPowerUpkeepCost, 0);

      // Supply: 0.20 + 0.10 + 0.05 + 0.15 = 0.50 (+50%)
      expect(Math.round(totalSupplyBonus * 100)).toBe(50);

      // Planning: 0.10 + 0.35 + 0.25 + 0.05 = 0.75 (+75%)
      expect(Math.round(totalPlanningMultiplier * 100)).toBe(75);

      // Reinforce: 0.05 + 0.10 + 0.08 + 0.12 = 0.35 (+35%)
      expect(Math.round(totalReinforceRate * 100)).toBe(35);

      // CP Upkeep: 0.15 + 0.25 + 0.20 + 0.10 = 0.70 CP/day
      expect(Math.round(totalCpUpkeep * 100)).toBe(70);
    });
  });

  // =========================================================================
  // SUITE 4: DOCTRINE MUTUAL EXCLUSIVITY SWITCHING & STAT PRUNING
  // =========================================================================
  describe('Suite 4: Doctrine Mutual Exclusivity Switching & Stat Pruning', () => {
    const DOCTRINES_STRESS: DoctrineNodeDef[] = [
      // Mobile Warfare branch
      {
        id: 'mobile_warfare',
        name: 'Mobile Warfare',
        branch: 'mobile_warfare',
        category: 'land',
        level: 1,
        costXp: 100,
        mutuallyExclusiveWith: ['superior_firepower', 'grand_battleplan', 'mass_assault'],
        statModifiers: { armor_speed: '+10%', breakthrough: '+15%' },
        description: 'Rapid armored thrusts.',
      },
      {
        id: 'blitzkrieg',
        name: 'Blitzkrieg',
        branch: 'mobile_warfare',
        category: 'land',
        level: 2,
        costXp: 100,
        parentDoctrineId: 'mobile_warfare',
        statModifiers: { tank_breakthrough: '+20%' },
        description: 'Armored spearheads.',
      },
      {
        id: 'modern_blitzkrieg',
        name: 'Modern Blitzkrieg',
        branch: 'mobile_warfare',
        category: 'land',
        level: 3,
        costXp: 100,
        parentDoctrineId: 'blitzkrieg',
        statModifiers: { armor_org: '+5' },
        description: 'Integrated armor.',
      },

      // Superior Firepower branch
      {
        id: 'superior_firepower',
        name: 'Superior Firepower',
        branch: 'superior_firepower',
        category: 'land',
        level: 1,
        costXp: 100,
        mutuallyExclusiveWith: ['mobile_warfare', 'grand_battleplan', 'mass_assault'],
        statModifiers: { infantry_soft_attack: '+10%', artillery_soft_attack: '+15%' },
        description: 'Heavy ordnance.',
      },
      {
        id: 'shock_and_awe',
        name: 'Shock and Awe',
        branch: 'superior_firepower',
        category: 'land',
        level: 2,
        costXp: 100,
        parentDoctrineId: 'superior_firepower',
        statModifiers: { support_soft_attack: '+25%' },
        description: 'Rolling barrages.',
      },

      // Grand Battleplan branch
      {
        id: 'grand_battleplan',
        name: 'Grand Battleplan',
        branch: 'grand_battleplan',
        category: 'land',
        level: 1,
        costXp: 100,
        mutuallyExclusiveWith: ['mobile_warfare', 'superior_firepower', 'mass_assault'],
        statModifiers: { max_planning: '+30%', max_entrenchment: '+10' },
        description: 'Rigid methodical planning.',
      },

      // Naval Doctrines
      {
        id: 'fleet_in_being',
        name: 'Fleet in Being',
        branch: 'fleet_in_being',
        category: 'naval',
        level: 1,
        costXp: 100,
        mutuallyExclusiveWith: ['trade_interdiction', 'base_strike'],
        statModifiers: { battleship_armor: '+10%' },
        description: 'Battlelines.',
      },
      {
        id: 'trade_interdiction',
        name: 'Trade Interdiction',
        branch: 'trade_interdiction',
        category: 'naval',
        level: 1,
        costXp: 100,
        mutuallyExclusiveWith: ['fleet_in_being', 'base_strike'],
        statModifiers: { sub_stealth: '+20%' },
        description: 'Wolfpacks.',
      },
      {
        id: 'base_strike',
        name: 'Base Strike',
        branch: 'base_strike',
        category: 'naval',
        level: 1,
        costXp: 100,
        mutuallyExclusiveWith: ['fleet_in_being', 'trade_interdiction'],
        statModifiers: { carrier_sortie: '+20%' },
        description: 'Carrier air power.',
      },
    ];

    // Mirroring DoctrineStudio's mutual exclusivity switching logic
    function switchDoctrineUnlock(
      unlockedSet: Set<string>,
      targetDoctrine: DoctrineNodeDef,
      database: DoctrineNodeDef[]
    ): Set<string> {
      const next = new Set(unlockedSet);
      if (next.has(targetDoctrine.id)) {
        next.delete(targetDoctrine.id);
      } else {
        if (targetDoctrine.mutuallyExclusiveWith) {
          targetDoctrine.mutuallyExclusiveWith.forEach((mutId) => {
            database
              .filter((d) => d.branch === mutId || d.id === mutId)
              .forEach((d) => next.delete(d.id));
          });
        }
        next.add(targetDoctrine.id);
      }
      return next;
    }

    it('purges child doctrines when switching from Mobile Warfare to Superior Firepower', () => {
      // Initially, player has Mobile Warfare + Blitzkrieg + Modern Blitzkrieg unlocked
      let unlocked = new Set<string>(['mobile_warfare', 'blitzkrieg', 'modern_blitzkrieg']);

      // Player clicks unlock on Superior Firepower
      const supFire = DOCTRINES_STRESS.find((d) => d.id === 'superior_firepower')!;
      unlocked = switchDoctrineUnlock(unlocked, supFire, DOCTRINES_STRESS);

      // Verify Mobile Warfare AND all child nodes are eradicated
      expect(unlocked.has('mobile_warfare')).toBe(false);
      expect(unlocked.has('blitzkrieg')).toBe(false);
      expect(unlocked.has('modern_blitzkrieg')).toBe(false);

      // Verify Superior Firepower is unlocked
      expect(unlocked.has('superior_firepower')).toBe(true);
      expect(unlocked.size).toBe(1);
    });

    it('enforces tripartite naval doctrine exclusivity (Fleet in Being vs Trade Interdiction vs Base Strike)', () => {
      let unlocked = new Set<string>(['fleet_in_being']);

      // Switch to Trade Interdiction
      const tradeInt = DOCTRINES_STRESS.find((d) => d.id === 'trade_interdiction')!;
      unlocked = switchDoctrineUnlock(unlocked, tradeInt, DOCTRINES_STRESS);
      expect(unlocked.has('fleet_in_being')).toBe(false);
      expect(unlocked.has('trade_interdiction')).toBe(true);

      // Switch to Base Strike
      const baseStrike = DOCTRINES_STRESS.find((d) => d.id === 'base_strike')!;
      unlocked = switchDoctrineUnlock(unlocked, baseStrike, DOCTRINES_STRESS);
      expect(unlocked.has('trade_interdiction')).toBe(false);
      expect(unlocked.has('fleet_in_being')).toBe(false);
      expect(unlocked.has('base_strike')).toBe(true);
    });

    it('verifies cumulative modifiers table reflects ONLY current doctrine branch', () => {
      const unlocked = new Set<string>(['superior_firepower', 'shock_and_awe']);
      const cumulativeTable: Record<string, string> = {};

      unlocked.forEach((id) => {
        const doc = DOCTRINES_STRESS.find((d) => d.id === id);
        if (doc) {
          Object.entries(doc.statModifiers).forEach(([k, v]) => {
            cumulativeTable[k] = v;
          });
        }
      });

      expect(cumulativeTable.infantry_soft_attack).toBe('+10%');
      expect(cumulativeTable.artillery_soft_attack).toBe('+15%');
      expect(cumulativeTable.support_soft_attack).toBe('+25%');
      // Must NOT contain Mobile Warfare stats!
      expect(cumulativeTable.armor_speed).toBeUndefined();
      expect(cumulativeTable.breakthrough).toBeUndefined();
    });
  });
});
