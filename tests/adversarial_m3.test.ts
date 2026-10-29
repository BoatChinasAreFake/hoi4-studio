import { describe, it, expect } from 'vitest';
import {
  validateTechTreeDag,
  calculateResearchCost,
  calculateMarketDeliverySchedule,
  calculateCompositeChassisStats,
  calculateDivisionStats,
} from '../src/utils/phase4Generators';
import type { TechNode } from '../src/types/economy';
import type {
  ModularChassisDesign,
  EquipmentModuleDef,
  DivisionTemplateState,
  BattalionTypeInfo,
} from '../src/types/military';

describe('Adversarial M3 Suite: Stress Testing Military & Economy Engines', () => {
  describe('Adversarial Tech Tree DAG Stress & Cycle Detection', () => {
    it('detects self-referential cycle where a tech depends on itself', () => {
      const selfLoopNode: TechNode = {
        id: 'self_loop_tech',
        name: 'Looping Tech',
        folder: 'industry_folder',
        x: 0,
        y: 0,
        researchCost: 1.0,
        startYear: 1936,
        dependencies: ['self_loop_tech'],
        mutuallyExclusive: [],
        categories: ['industry'],
      };

      const res = validateTechTreeDag([selfLoopNode]);
      expect(res.isValid).toBe(false);
      expect(res.cycleDetected).toBe(true);
      expect(res.cyclicNodes).toContain('self_loop_tech');
    });

    it('detects indirect 4-node cycle in complex branch (A -> B -> C -> D -> B)', () => {
      const complexCycle: TechNode[] = [
        {
          id: 'root',
          name: 'Root',
          folder: 'armor_folder',
          x: 0,
          y: 0,
          researchCost: 1.0,
          startYear: 1936,
          dependencies: [],
          mutuallyExclusive: [],
          categories: ['armor'],
        },
        {
          id: 'node_b',
          name: 'Node B',
          folder: 'armor_folder',
          x: 1,
          y: 1,
          researchCost: 1.0,
          startYear: 1937,
          dependencies: ['root', 'node_d'],
          mutuallyExclusive: [],
          categories: ['armor'],
        },
        {
          id: 'node_c',
          name: 'Node C',
          folder: 'armor_folder',
          x: 2,
          y: 2,
          researchCost: 1.0,
          startYear: 1938,
          dependencies: ['node_b'],
          mutuallyExclusive: [],
          categories: ['armor'],
        },
        {
          id: 'node_d',
          name: 'Node D',
          folder: 'armor_folder',
          x: 3,
          y: 3,
          researchCost: 1.0,
          startYear: 1939,
          dependencies: ['node_c'],
          mutuallyExclusive: [],
          categories: ['armor'],
        },
      ];

      const res = validateTechTreeDag(complexCycle);
      expect(res.isValid).toBe(false);
      expect(res.cycleDetected).toBe(true);
      expect(res.cyclicNodes).toContain('node_b');
      expect(res.cyclicNodes).toContain('node_c');
      expect(res.cyclicNodes).toContain('node_d');
      expect(res.cyclicNodes).not.toContain('root');
    });

    it('gracefully validates empty tech tree with 0 nodes', () => {
      const res = validateTechTreeDag([]);
      expect(res.isValid).toBe(true);
      expect(res.cycleDetected).toBe(false);
      expect(res.cyclicNodes.length).toBe(0);
    });

    it('handles deep linear chain of 50 consecutive dependencies without overflow', () => {
      const deepChain: TechNode[] = [];
      for (let i = 0; i < 50; i++) {
        deepChain.push({
          id: `chain_${i}`,
          name: `Chain Node ${i}`,
          folder: 'electronics_folder',
          x: i % 5,
          y: Math.floor(i / 5),
          researchCost: 1.0,
          startYear: 1936 + i,
          dependencies: i > 0 ? [`chain_${i - 1}`] : [],
          mutuallyExclusive: [],
          categories: ['electronics'],
        });
      }

      const res = validateTechTreeDag(deepChain);
      expect(res.isValid).toBe(true);
      expect(res.cycleDetected).toBe(false);
    });
  });

  describe('Adversarial Research Cost Bounds & Calculations', () => {
    it('handles extreme ahead-of-time penalty (e.g. 10 years ahead)', () => {
      // 10 years ahead, penalty per year 2.0 -> ahead factor = 1 + 10 * 2.0 = 21.0
      // Base cost 2.0 -> 220 base days * 21.0 = 4,620 days
      const res = calculateResearchCost(2.0, 1946, 1936, 0, 2.0);
      expect(res.isAheadOfTime).toBe(true);
      expect(res.yearsAhead).toBe(10);
      expect(res.aheadPenaltyFactor).toBe(21.0);
      expect(res.finalResearchDays).toBe(4620);
    });

    it('large bonuses shorten research without ever reaching zero', () => {
      // bonuses add to research speed: 150% -> time factor 1 / 2.5
      const res = calculateResearchCost(1.0, 1936, 1936, 150, 2.0);
      expect(res.bonusFactor).toBeCloseTo(0.4, 10);
      expect(res.finalResearchDays).toBe(44); // 110 * 0.4
    });

    it('correctly handles zero ahead of time penalty when research is current or past', () => {
      const res = calculateResearchCost(1.0, 1936, 1942, 0, 2.0);
      expect(res.isAheadOfTime).toBe(false);
      expect(res.yearsAhead).toBe(0);
      expect(res.aheadPenaltyFactor).toBe(1.0);
      expect(res.finalResearchDays).toBe(110);
    });
  });

  describe('Adversarial Modular Chassis Designer Bounds & Physical Constraints', () => {
    const modules: EquipmentModuleDef[] = [
      {
        id: 'mod_engine',
        name: 'Single Engine',
        category: 'plane',
        allowedSlotTypes: ['engine'],
        stats: { thrust: 25, productionCost: 5 },
      },
      {
        id: 'mod_gun',
        name: 'Light Gun',
        category: 'plane',
        allowedSlotTypes: ['weapon_1'],
        stats: { weight: 5, airAttack: 10 },
      },
    ];

    it('validates exact boundary where thrust equals airframe weight (thrust == weight)', () => {
      const design: ModularChassisDesign = {
        id: 'balanced_plane',
        name: 'Balanced Plane',
        category: 'plane',
        chassisType: 'small_plane_airframe',
        year: 1936,
        baseStats: { weight: 20, thrust: 0 },
        slots: { engine: 'mod_engine', weapon_1: 'mod_gun' }, // weight: 20 + 5 = 25, thrust: 25
        armorLevel: 0,
        engineLevel: 0,
      };

      const stats = calculateCompositeChassisStats(design, modules);
      expect(stats.thrust).toBe(25);
      expect(stats.weight).toBe(25);
      expect(stats.isValid).toBe(true);
      expect(stats.validationErrors.length).toBe(0);
    });

    it('detects fractional thrust deficit (weight 25.1 > thrust 25.0)', () => {
      const design: ModularChassisDesign = {
        id: 'deficit_plane',
        name: 'Deficit Plane',
        category: 'plane',
        chassisType: 'small_plane_airframe',
        year: 1936,
        baseStats: { weight: 20.1, thrust: 0 },
        slots: { engine: 'mod_engine', weapon_1: 'mod_gun' }, // weight 25.1 > 25.0
        armorLevel: 0,
        engineLevel: 0,
      };

      const stats = calculateCompositeChassisStats(design, modules);
      expect(stats.isValid).toBe(false);
      expect(stats.validationErrors.some((e) => e.includes('Thrust deficit'))).toBe(true);
    });
  });

  describe('Adversarial Division Designer Rollup Edge Cases', () => {
    it('returns zeroed stats for completely empty template without NaN or throwing', () => {
      const emptyTemplate: DivisionTemplateState = {
        id: 'empty_div',
        name: 'Empty Division',
        grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
        supportCompanies: [null, null, null, null, null],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(emptyTemplate);
      expect(rollup.totalBattalions).toBe(0);
      expect(rollup.totalSupportCompanies).toBe(0);
      expect(rollup.combatWidth).toBe(0);
      expect(rollup.manpower).toBe(0);
      expect(rollup.organization).toBe(0);
      expect(rollup.maximumSpeed).toBe(0);
      expect(Number.isNaN(rollup.organization)).toBe(false);
      expect(Number.isNaN(rollup.armor)).toBe(false);
    });

    it('governs division speed by slowest combat battalion even when fast battalion is present', () => {
      const slowHeavyTank: BattalionTypeInfo = {
        id: 'heavy_tank',
        name: 'Heavy Tank',
        category: 'armor',
        isSupportCompany: false,
        combatWidth: 2,
        manpower: 500,
        maxHp: 20,
        organization: 10,
        softAttack: 15,
        hardAttack: 20,
        defense: 10,
        breakthrough: 40,
        armor: 100,
        piercing: 80,
        maximumSpeed: 3.5, // SLOW
        supplyConsumption: 0.25,
        trainingTime: 120,
        equipmentNeeds: {},
        icon: '🏰',
      };

      const fastMotorized: BattalionTypeInfo = {
        id: 'motorized',
        name: 'Motorized',
        category: 'mobile',
        isSupportCompany: false,
        combatWidth: 2,
        manpower: 1000,
        maxHp: 25,
        organization: 60,
        softAttack: 8,
        hardAttack: 2,
        defense: 25,
        breakthrough: 5,
        armor: 0,
        piercing: 5,
        maximumSpeed: 12.0, // FAST
        supplyConsumption: 0.12,
        trainingTime: 100,
        equipmentNeeds: {},
        icon: '🚚',
      };

      const template: DivisionTemplateState = {
        id: 'mixed_speed_div',
        name: 'Mixed Speed Division',
        grid: [
          [slowHeavyTank, fastMotorized, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ],
        supportCompanies: [null, null, null, null, null],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(template);
      expect(rollup.totalBattalions).toBe(2);
      expect(rollup.maximumSpeed).toBe(3.5); // Constrained by slowest!
      // Armor rollup test: 40% max (100) + 60% avg (50) = 40 + 30 = 70 (ARMOR_VS_AVERAGE = 0.4)
      expect(rollup.armor).toBe(70);
      // Piercing rollup test: 40% max (80) + 60% avg (42.5) = 32 + 25.5 = 57.5
      expect(rollup.piercing).toBe(57.5);
    });

    it('correctly handles support-only division without combat battalions', () => {
      const reconSupport: BattalionTypeInfo = {
        id: 'recon',
        name: 'Recon Support',
        category: 'support',
        isSupportCompany: true,
        combatWidth: 0,
        manpower: 300,
        maxHp: 2.0,
        organization: 20,
        softAttack: 4,
        hardAttack: 1,
        defense: 8,
        breakthrough: 4,
        armor: 0,
        piercing: 4,
        maximumSpeed: 10.0,
        supplyConsumption: 0.04,
        trainingTime: 90,
        equipmentNeeds: {},
        icon: '🔭',
      };

      const template: DivisionTemplateState = {
        id: 'support_only_div',
        name: 'Support Only',
        grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
        supportCompanies: [reconSupport, null, null, null, null],
        regimentalAttachments: [],
      };

      const rollup = calculateDivisionStats(template);
      expect(rollup.totalBattalions).toBe(0);
      expect(rollup.totalSupportCompanies).toBe(1);
      expect(rollup.combatWidth).toBe(0); // Support has 0 combat width
      expect(rollup.manpower).toBe(300);
      expect(rollup.maximumSpeed).toBe(10.0); // Falls back to support speed
      expect(rollup.organization).toBe(20.0);
    });
  });

  describe('Adversarial International Market & Subsidies Calculations', () => {
    it('gracefully handles 0 civ factories allocation by clamping to baseline minimum 1 factory', () => {
      const schedule = calculateMarketDeliverySchedule(100, 5.0, 0, 0, 0, 5.0, 30);
      expect(schedule.batches).toBe(2); // 100 / 50 = 2 batches
      expect(schedule.daysPerBatch).toBe(30);
      expect(schedule.totalDeliveryDays).toBe(60);
    });

    it('handles large equipment orders (e.g. 5,000 units) batching correctly', () => {
      const schedule = calculateMarketDeliverySchedule(5000, 2.0, 5, 20, 10, 5.0, 30);
      expect(schedule.totalIc).toBe(10000);
      expect(schedule.totalContractCost).toBe(2000);
      expect(schedule.subsidizedCost).toBe(1600); // 20% discount
      expect(schedule.batches).toBe(100); // 5000 / 50 = 100 batches
      expect(schedule.daysPerBatch).toBeGreaterThanOrEqual(10);
    });
  });
});
