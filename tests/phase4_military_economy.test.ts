import { describe, it, expect } from 'vitest';
import {
  validateTechTreeDag,
  calculateResearchCost,
  calculateMarketDeliverySchedule,
  calculateCompositeChassisStats,
  calculateDivisionStats,
} from '../src/utils/phase4Generators';
import type {
  TechNode,
  RaidMissionDef,
  SpecialProjectDef,
  MarketSubsidiesConfig,
  StrategicResourceDef,
  CustomBuildingDef,
} from '../src/types/economy';
import type {
  ModularChassisDesign,
  EquipmentModuleDef,
  DivisionTemplateState,
  BattalionTypeInfo,
  MilitaryHqDef,
  DoctrineNodeDef,
} from '../src/types/military';

describe('Phase 4: Economy, Tech Trees, Special Projects, Raids & Military Suite', () => {
  // ==========================================
  // 1. Technology & Research Tree Spatial Grid
  // ==========================================
  describe('1. Technology & Research Tree Spatial Grid', () => {
    const sampleTechTree: TechNode[] = [
      {
        id: 'infantry_weapons_1',
        name: 'Basic Infantry Weapons',
        folder: 'infantry_folder',
        x: 1,
        y: 0,
        researchCost: 1.0,
        startYear: 1936,
        dependencies: [],
        mutuallyExclusive: [],
        enableEquipments: ['infantry_equipment_1'],
        categories: ['infantry_weapons'],
      },
      {
        id: 'improved_infantry_weapons',
        name: 'Improved Infantry Weapons',
        folder: 'infantry_folder',
        x: 1,
        y: 2,
        researchCost: 1.5,
        startYear: 1939,
        dependencies: ['infantry_weapons_1'],
        mutuallyExclusive: [],
        enableEquipments: ['infantry_equipment_2'],
        categories: ['infantry_weapons'],
      },
      {
        id: 'support_weapons_1',
        name: 'Support Weapons I',
        folder: 'infantry_folder',
        x: 3,
        y: 0,
        researchCost: 1.0,
        startYear: 1936,
        dependencies: [],
        mutuallyExclusive: [],
        categories: ['infantry_weapons'],
      },
    ];

    it('verifies clean DAG structure without cycles or coordinate collisions', () => {
      const validation = validateTechTreeDag(sampleTechTree);
      expect(validation.isValid).toBe(true);
      expect(validation.cycleDetected).toBe(false);
      expect(validation.orphanDependencies.length).toBe(0);
      expect(validation.coordinateCollisions.length).toBe(0);
      expect(validation.mutualExclusionConflicts.length).toBe(0);
    });

    it('detects cyclic dependencies (A -> B -> A) in tech trees', () => {
      const cyclicNodes: TechNode[] = [
        {
          id: 'tech_alpha',
          name: 'Tech Alpha',
          folder: 'armor_folder',
          x: 0,
          y: 0,
          researchCost: 1.0,
          startYear: 1936,
          dependencies: ['tech_beta'],
          mutuallyExclusive: [],
          categories: ['armor'],
        },
        {
          id: 'tech_beta',
          name: 'Tech Beta',
          folder: 'armor_folder',
          x: 0,
          y: 2,
          researchCost: 1.0,
          startYear: 1937,
          dependencies: ['tech_alpha'],
          mutuallyExclusive: [],
          categories: ['armor'],
        },
      ];

      const validation = validateTechTreeDag(cyclicNodes);
      expect(validation.isValid).toBe(false);
      expect(validation.cycleDetected).toBe(true);
      expect(validation.cyclicNodes).toContain('tech_alpha');
      expect(validation.cyclicNodes).toContain('tech_beta');
    });

    it('detects coordinate collisions in the same folder', () => {
      const collisionNodes: TechNode[] = [
        {
          id: 'node_one',
          name: 'Node One',
          folder: 'naval_folder',
          x: 2,
          y: 4,
          researchCost: 1.0,
          startYear: 1936,
          dependencies: [],
          mutuallyExclusive: [],
          categories: ['naval'],
        },
        {
          id: 'node_two',
          name: 'Node Two',
          folder: 'naval_folder',
          x: 2,
          y: 4, // Collision at (2, 4) in naval_folder
          researchCost: 1.0,
          startYear: 1936,
          dependencies: [],
          mutuallyExclusive: [],
          categories: ['naval'],
        },
      ];

      const validation = validateTechTreeDag(collisionNodes);
      expect(validation.isValid).toBe(false);
      expect(validation.coordinateCollisions.length).toBe(1);
      expect(validation.coordinateCollisions[0]).toContain('naval_folder_2_4');
    });

    it('detects mutual exclusion conflicts where a dependency is also XOR excluded', () => {
      const conflictNodes: TechNode[] = [
        {
          id: 'node_parent',
          name: 'Parent Node',
          folder: 'industry_folder',
          x: 0,
          y: 0,
          researchCost: 1.0,
          startYear: 1936,
          dependencies: [],
          mutuallyExclusive: [],
          categories: ['industry'],
        },
        {
          id: 'node_child',
          name: 'Conflicted Child',
          folder: 'industry_folder',
          x: 0,
          y: 2,
          researchCost: 1.0,
          startYear: 1937,
          dependencies: ['node_parent'],
          mutuallyExclusive: ['node_parent'], // Cannot require and be mutually exclusive with same node
          categories: ['industry'],
        },
      ];

      const validation = validateTechTreeDag(conflictNodes);
      expect(validation.isValid).toBe(false);
      expect(validation.mutualExclusionConflicts.length).toBe(1);
    });

    it('calculates research cost with ahead-of-time penalty and national research bonus', () => {
      // Base cost 2.0 = 200 base days
      // Start year 1940, simulated current year 1938 -> 2 years ahead
      // Ahead penalty factor = 1 + 2 * 2.0 = 5.0
      // National research bonus 50% -> bonus factor = 0.50
      // Expected: 200 * 5.0 * 0.50 = 500 days
      const result = calculateResearchCost(2.0, 1940, 1938, 50, 2.0);
      expect(result.isAheadOfTime).toBe(true);
      expect(result.yearsAhead).toBe(2);
      expect(result.baseDays).toBe(200);
      expect(result.aheadPenaltyFactor).toBe(5.0);
      expect(result.bonusFactor).toBe(0.50);
      expect(result.finalResearchDays).toBe(500);

      // On-time research: current year 1940 >= start year 1940
      const onTime = calculateResearchCost(1.5, 1940, 1940, 0, 2.0);
      expect(onTime.isAheadOfTime).toBe(false);
      expect(onTime.aheadPenaltyFactor).toBe(1.0);
      expect(onTime.finalResearchDays).toBe(150);
    });
  });

  // ==========================================
  // 2. Raids & Strategic Locations Studio
  // ==========================================
  describe('2. Tactical Raids & Strategic Locations', () => {
    const sampleRaid: RaidMissionDef = {
      id: 'heavy_water_sabotage',
      name: 'Heavy Water Plant Sabotage',
      category: 'commando_raid',
      arrowType: 'land',
      commandPower: 25,
      targetStateId: 112,
      targetProvinceId: 3412,
      detectionRisk: 35,
      prepPhases: [
        { name: 'Infiltration', durationDays: 14, requiredIntel: 40, commandPowerCost: 10 },
        { name: 'Explosive Charge Rigging', durationDays: 3, requiredIntel: 65, commandPowerCost: 15 },
      ],
      requiredEquipment: { infantry_equipment: 100, support_equipment: 20 },
      successEffect: {
        damageBuildingType: 'nuclear_facility',
        damageBuildingLevel: 2,
        addWarSupport: 0.05,
      },
      failureEffect: {
        addWarSupport: -0.02,
        killOperativesChance: 50,
      },
    };

    it('validates tactical raid mission schema and requirements', () => {
      expect(sampleRaid.id).toBe('heavy_water_sabotage');
      expect(sampleRaid.category).toBe('commando_raid');
      expect(sampleRaid.commandPower).toBe(25);
      expect(sampleRaid.targetStateId).toBe(112);
      expect(sampleRaid.prepPhases.length).toBe(2);
      expect(sampleRaid.detectionRisk).toBeGreaterThanOrEqual(0);
      expect(sampleRaid.detectionRisk).toBeLessThanOrEqual(100);
    });

    it('calculates total preparation duration and cumulative command power upkeep', () => {
      const totalPrepDays = sampleRaid.prepPhases.reduce((acc, p) => acc + p.durationDays, 0);
      const totalCpCost = sampleRaid.prepPhases.reduce((acc, p) => acc + p.commandPowerCost, 0);
      expect(totalPrepDays).toBe(17);
      expect(totalCpCost).toBe(25);
    });
  });

  // ==========================================
  // 3. Special Projects (Götterdämmerung)
  // ==========================================
  describe('3. Special Projects, Facilities & Scientists (Götterdämmerung)', () => {
    const atomicProject: SpecialProjectDef = {
      id: 'special_project_atomic_bomb',
      name: 'Uranprojekt Atomic Warhead',
      projectType: 'nuclear',
      facilityType: 'nuclear_facility',
      prototypeCostResources: { steel: 12, chromium: 8, tungsten: 6 },
      prototypeCostCivFactories: 5,
      prototypeTimeDays: 180,
      complexity: 'insane',
      assignedScientistId: 'werner_heisenberg',
      unlockedBreakthroughs: ['heavy_water_separation', 'plutonium_breeding'],
      rewardOutput: {
        enableEquipment: 'nuclear_bomb',
        customEffectTooltip: 'Enables strategic atomic bombings.',
        bonusTechSpeed: 0.20,
      },
    };

    it('validates special project configuration and complexity classification', () => {
      expect(atomicProject.projectType).toBe('nuclear');
      expect(atomicProject.complexity).toBe('insane');
      expect(atomicProject.prototypeTimeDays).toBe(180);
      expect(atomicProject.prototypeCostCivFactories).toBe(5);
      expect(atomicProject.prototypeCostResources.steel).toBe(12);
      expect(atomicProject.rewardOutput.enableEquipment).toBe('nuclear_bomb');
      expect(atomicProject.unlockedBreakthroughs.length).toBe(2);
    });
  });

  // ==========================================
  // 4. International Market & Subsidies (AAT)
  // ==========================================
  describe('4. International Market & Equipment Subsidies (AAT)', () => {
    it('calculates market delivery schedule, batches, and bilateral subsidy savings', () => {
      // 200 units of infantry equipment (IC: 4.0)
      // Total IC = 800 IC
      // Civ Exchange ratio: 5.0 -> base contract cost = 800 / 5.0 = 160 credits
      // Bilateral subsidy: 25% discount, 30% speed bonus
      // Subsidized cost = 160 * (1 - 0.25) = 120 credits
      // Batches = ceil(200 / 50) = 4 batches
      // Civ factories paid: 3
      // Days per batch = (30 / 3) * (1 - 0.15) = 10 * 0.85 = 9 -> clamped to 10 days
      // Total days = 10 * 4 = 40 days
      const schedule = calculateMarketDeliverySchedule(200, 4.0, 3, 25, 30, 5.0, 30);
      expect(schedule.totalIc).toBe(800);
      expect(schedule.totalContractCost).toBe(160);
      expect(schedule.subsidizedCost).toBe(120);
      expect(schedule.batches).toBe(4);
      expect(schedule.daysPerBatch).toBe(10);
      expect(schedule.totalDeliveryDays).toBe(40);
    });
  });

  // ==========================================
  // 5. Strategic Resources & Custom Buildings
  // ==========================================
  describe('5. Strategic Resources & Custom Buildings', () => {
    const resources: StrategicResourceDef[] = [
      { id: 'oil', name: 'Crude Oil', icon: '🛢️', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
      { id: 'uranium', name: 'Uranium Ore', icon: '☢️', baseCicCost: 2, isCustom: true, convoysRequiredPerUnit: 2 },
    ];

    const buildings: CustomBuildingDef[] = [
      {
        id: 'industrial_complex',
        name: 'Civilian Factory',
        icon: '🏭',
        isProvincial: false,
        baseCost: 10800,
        perLevelExtraCost: 0,
        maxLevel: 20,
        sharesSlots: true,
        showOnMap: true,
        damageFactor: 1.0,
      },
      {
        id: 'coastal_bunker',
        name: 'Coastal Fort',
        icon: '🌊',
        isProvincial: true,
        baseCost: 500,
        perLevelExtraCost: 500,
        maxLevel: 10,
        sharesSlots: false,
        showOnMap: true,
        damageFactor: 0.5,
      },
    ];

    it('validates resource trade parameters and custom resource tokens', () => {
      expect(resources[0].isCustom).toBe(false);
      expect(resources[1].isCustom).toBe(true);
      expect(resources[1].baseCicCost).toBe(2);
      expect(resources[1].convoysRequiredPerUnit).toBe(2);
    });

    it('distinguishes provincial vs state buildings and enforces slot sharing rules', () => {
      const civFactory = buildings[0];
      const coastalFort = buildings[1];

      expect(civFactory.isProvincial).toBe(false);
      expect(civFactory.sharesSlots).toBe(true);
      expect(civFactory.maxLevel).toBe(20);

      expect(coastalFort.isProvincial).toBe(true);
      expect(coastalFort.sharesSlots).toBe(false);
      expect(coastalFort.perLevelExtraCost).toBe(500);
    });
  });

  // ==========================================
  // 6. Modular Chassis Designer
  // ==========================================
  describe('6. Modular Chassis Designer (Tanks, Planes, Ships)', () => {
    const testModules: EquipmentModuleDef[] = [
      {
        id: 'medium_cannon_1',
        name: 'Medium Cannon I',
        category: 'tank',
        allowedSlotTypes: ['main_armament'],
        stats: { softAttack: 25, hardAttack: 15, piercing: 45, productionCost: 4 },
      },
      {
        id: 'three_man_medium_turret',
        name: 'Three-Man Medium Turret',
        category: 'tank',
        allowedSlotTypes: ['turret'],
        stats: { breakthrough: 18, productionCost: 3 },
        multipliers: { reliability: -0.10 },
      },
      {
        id: 'welded_armor',
        name: 'Welded Armor',
        category: 'tank',
        allowedSlotTypes: ['armor_type'],
        stats: { armor: 15, productionCost: 2 },
        multipliers: { armor: 0.20 },
      },
      {
        id: 'single_engine_2',
        name: 'Single Engine II',
        category: 'plane',
        allowedSlotTypes: ['engine'],
        stats: { thrust: 22, maximumSpeed: 520, productionCost: 6 },
      },
      {
        id: 'cannon_20mm_2x',
        name: '2x 20mm Aircraft Cannons',
        category: 'plane',
        allowedSlotTypes: ['weapon_1'],
        stats: { airAttack: 26, weight: 6, productionCost: 4.5 },
      },
    ];

    it('calculates medium tank composite stats with armor and engine upgrade levels', () => {
      const tankDesign: ModularChassisDesign = {
        id: 'test_medium_tank',
        name: 'Medium Tank Test',
        category: 'tank',
        chassisType: 'medium_tank_chassis',
        year: 1939,
        baseStats: {
          armor: 40,
          piercing: 10,
          maximumSpeed: 4.5,
          productionCost: 9,
          reliability: 0.0,
        },
        slots: {
          main_armament: 'medium_cannon_1',
          turret: 'three_man_medium_turret',
          armor_type: 'welded_armor',
        },
        armorLevel: 4, // +10 armor (4*2.5), +2.0 cost (4*0.5)
        engineLevel: 5, // +2.0 speed (5*0.4), +2.0 cost (5*0.4)
      };

      const stats = calculateCompositeChassisStats(tankDesign, testModules);
      expect(stats.isValid).toBe(true);
      expect(stats.softAttack).toBe(25);
      expect(stats.hardAttack).toBe(15);
      expect(stats.breakthrough).toBe(18);
      expect(stats.piercing).toBe(55); // 10 base + 45 cannon

      // Base armor = 40 + 10 (armor level 4) + 15 (welded armor) = 65
      // Armor multiplier = +20% -> 65 * 1.2 = 78
      expect(stats.armor).toBe(78);

      // Speed = 4.5 base + 2.0 (engine level 5) = 6.5 km/h
      expect(stats.maximumSpeed).toBe(6.5);

      // Reliability = 100% * (1 - 0.10) = 90%
      expect(stats.reliability).toBe(90);

      // Cost = 9 base + 2 (armor lvl) + 2 (engine lvl) + 4 (cannon) + 3 (turret) + 2 (welded armor) = 22
      expect(stats.productionCost).toBe(22);
    });

    it('detects plane thrust deficit when airframe weight exceeds engine thrust', () => {
      const planeDesign: ModularChassisDesign = {
        id: 'overweight_plane',
        name: 'Overweight Fighter',
        category: 'plane',
        chassisType: 'small_plane_airframe',
        year: 1940,
        baseStats: {
          weight: 20, // 20 base weight + 6 (cannons) = 26 weight > 22 thrust!
          thrust: 0,
          maximumSpeed: 450,
          productionCost: 10,
        },
        slots: {
          engine: 'single_engine_2', // 22 thrust
          weapon_1: 'cannon_20mm_2x', // 6 weight
        },
        armorLevel: 0,
        engineLevel: 0,
      };

      const stats = calculateCompositeChassisStats(planeDesign, testModules);
      expect(stats.isValid).toBe(false);
      expect(stats.validationErrors.some((e) => e.includes('Thrust deficit'))).toBe(true);
    });
  });

  // ==========================================
  // 7. 5x5 Division Template Grid & Support
  // ==========================================
  describe('7. 5x5 Division Template Grid & Regimental Attachments', () => {
    const infBattalion: BattalionTypeInfo = {
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
    };

    const artBattalion: BattalionTypeInfo = {
      id: 'artillery_brigade',
      name: 'Towed Artillery',
      category: 'artillery',
      isSupportCompany: false,
      combatWidth: 3,
      manpower: 500,
      maxHp: 0.6,
      organization: 0,
      softAttack: 25,
      hardAttack: 2,
      defense: 10,
      breakthrough: 6,
      armor: 0,
      piercing: 5,
      maximumSpeed: 4.0,
      supplyConsumption: 0.20,
      trainingTime: 120,
      equipmentNeeds: { artillery_equipment: 36 },
      icon: '💥',
    };

    const supportEng: BattalionTypeInfo = {
      id: 'engineer',
      name: 'Engineer Support Company',
      category: 'support',
      isSupportCompany: true,
      combatWidth: 0, // Zero combat width!
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
    };

    it('performs accurate division stat rollups adhering to HOI4 rules', () => {
      // 7 Inf battalions + 2 Art battalions + 1 Engineer support company
      const template: DivisionTemplateState = {
        id: '7_2_inf_art',
        name: '7-2 Infantry Division',
        grid: [
          [infBattalion, infBattalion, infBattalion, null, null],
          [infBattalion, infBattalion, infBattalion, null, null],
          [infBattalion, artBattalion, artBattalion, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ],
        supportCompanies: [supportEng, null, null, null, null],
        regimentalAttachments: [
          {
            regimentColumn: 0,
            attachmentId: 'regimental_recon',
            bonusSoftAttack: 3,
            bonusHardAttack: 1,
            bonusPlanningSpeed: 0.05,
          },
        ],
      };

      const rollup = calculateDivisionStats(template);

      expect(rollup.totalBattalions).toBe(9);
      expect(rollup.totalSupportCompanies).toBe(1);

      // Combat width: only combat battalions contribute! 7*2 + 2*3 = 14 + 6 = 20w (support contributes 0)
      expect(rollup.combatWidth).toBe(20);

      // Manpower: 7*1000 + 2*500 + 1*300 = 8,300
      expect(rollup.manpower).toBe(8300);

      // Soft attack: 7*6 (42) + 2*25 (50) + 1*4 (4) + 3 (regimental attachment) = 99
      expect(rollup.softAttack).toBe(99);

      // Hard attack: 7*1 (7) + 2*2 (4) + 1*2 (2) + 1 (regimental attachment) = 14
      expect(rollup.hardAttack).toBe(14);

      // Organization: average across all 10 units
      // Total org = 7*60 (420) + 2*0 (0) + 1*20 (20) = 440 / 10 = 44.0
      expect(rollup.organization).toBe(44.0);

      // Speed: slowest combat unit = 4.0 km/h
      expect(rollup.maximumSpeed).toBe(4.0);

      // Training time: max unit training time = 120 days (artillery)
      expect(rollup.trainingTime).toBe(120);
    });
  });

  // ==========================================
  // 8. Military HQs & Command Auras
  // ==========================================
  describe('8. Military Headquarters (HQs) & Command Auras', () => {
    const armyGroupHq: MilitaryHqDef = {
      id: 'army_group_center_hq',
      name: 'Army Group Center Headquarters',
      level: 'army_group_hq',
      auraRadiusProvinces: 5,
      staffTraits: ['deep_battle_coordinator', 'logistics_master'],
      assignedCommanderName: 'Fedor von Bock',
      baseSupplyBonus: 0.20,
      basePlanningMultiplier: 0.25,
      locationProvinceId: 6521,
    };

    it('validates HQ level hierarchy and operational aura radius', () => {
      expect(armyGroupHq.level).toBe('army_group_hq');
      expect(armyGroupHq.auraRadiusProvinces).toBe(5);
      expect(armyGroupHq.baseSupplyBonus).toBe(0.20);
      expect(armyGroupHq.basePlanningMultiplier).toBe(0.25);
      expect(armyGroupHq.staffTraits).toContain('logistics_master');
    });
  });

  // ==========================================
  // 9. Doctrines & Special Forces
  // ==========================================
  describe('9. Doctrines & Special Forces Trees', () => {
    const mobileWarfare: DoctrineNodeDef = {
      id: 'mobile_warfare',
      name: 'Mobile Warfare',
      branch: 'mobile_warfare',
      category: 'land',
      level: 1,
      costXp: 100,
      mutuallyExclusiveWith: ['superior_firepower', 'grand_battleplan', 'mass_assault'],
      statModifiers: {
        armor_speed_factor: '+10%',
        breakthrough_factor: '+15%',
      },
      description: 'Emphasizes high-speed mechanized breakthroughs.',
      icon: '⚡',
    };

    const superiorFirepower: DoctrineNodeDef = {
      id: 'superior_firepower',
      name: 'Superior Firepower',
      branch: 'superior_firepower',
      category: 'land',
      level: 1,
      costXp: 100,
      mutuallyExclusiveWith: ['mobile_warfare', 'grand_battleplan', 'mass_assault'],
      statModifiers: {
        infantry_soft_attack: '+10%',
        artillery_soft_attack: '+15%',
      },
      description: 'Focuses on massive artillery preparation.',
      icon: '💥',
    };

    it('enforces mutual exclusivity between major land doctrine branches', () => {
      expect(mobileWarfare.mutuallyExclusiveWith).toContain('superior_firepower');
      expect(superiorFirepower.mutuallyExclusiveWith).toContain('mobile_warfare');
    });
  });
});
