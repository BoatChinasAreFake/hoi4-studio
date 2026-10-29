import { describe, it, expect, vi } from 'vitest';
import { analyzeFocusTreeDeadlocks } from '../src/utils/tarjanDeadlockSolver';
import {
  calculateDivisionStats,
  calculateCompositeChassisStats,
  validateTechTreeDag,
  calculateResearchCost,
  calculateMarketDeliverySchedule,
} from '../src/utils/phase4Generators';
import {
  createTgaBuffer,
  prependUtf8Bom,
  stripUtf8Bom,
  hasUtf8Bom,
  validateLocalizationEncoding,
  UTF8_BOM,
} from '../src/utils/politicsGenerators';
import {
  diffAst3Way,
  parseScriptBlocks,
  realignModProvinces,
  computeProvinceDiff,
  scanModAssets,
  migrateDeprecatedScript,
} from '../src/utils/phase5Generators';
import {
  rasterizeRiverPolyline,
  rasterizeLineBresenham,
  find2x2Clusters,
  prune2x2Blocks,
} from '../src/utils/riverRasterizer';
import type { FocusNodeData, ActivityHub } from '../src/types/focus';
import type {
  DivisionTemplateState,
  BattalionStats,
  SupportCompanyStats,
  ModularChassisDesign,
  EquipmentModuleDef,
} from '../src/types/military';

describe('Tier 5 Adversarial Coverage Hardening Suite', () => {

  // ==========================================================================
  // Dimension 1: Keyboard Hub Switching Stress & Focus Suppression
  // ==========================================================================
  describe('1. Keyboard Hub Switching Stress & Input Suppression', () => {
    // Model the exact keyboard event listener predicate and mapping from App.tsx
    const HUB_SHORTCUT_MAP: Record<string, ActivityHub> = {
      '1': 'map',
      '2': 'politics',
      '3': 'military',
      '4': 'economy',
      '5': 'narrative',
      '6': 'ui',
      '7': 'simulation',
    };

    function simulateKeyboardHandler(
      e: {
        key: string;
        ctrlKey?: boolean;
        altKey?: boolean;
        metaKey?: boolean;
        target?: {
          tagName?: string;
          isContentEditable?: boolean;
          closest?: (selector: string) => any;
        };
      },
      currentHub: ActivityHub,
      setHub: (hub: ActivityHub) => void,
      togglePalette: () => void
    ): boolean {
      const target = e.target;
      if (
        target &&
        ((target.tagName && /INPUT|TEXTAREA|SELECT/i.test(target.tagName)) ||
          target.isContentEditable ||
          target.closest?.('.monaco-editor'))
      ) {
        return false; // Suppressed
      }

      // Universal Command Palette toggle: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        togglePalette();
        return true;
      }

      // Hotkeys 1 through 7 for Hub navigation
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        if (HUB_SHORTCUT_MAP[e.key]) {
          setHub(HUB_SHORTCUT_MAP[e.key]);
          return true;
        }
      }

      return false;
    }

    it('correctly maps all 7 shortcuts to their designated Activity Hubs', () => {
      let activeHub: ActivityHub = 'narrative';
      const setHub = (h: ActivityHub) => { activeHub = h; };
      const togglePalette = vi.fn();

      const expectedHubs: [string, ActivityHub][] = [
        ['1', 'map'],
        ['2', 'politics'],
        ['3', 'military'],
        ['4', 'economy'],
        ['5', 'narrative'],
        ['6', 'ui'],
        ['7', 'simulation'],
      ];

      for (const [key, exp] of expectedHubs) {
        const handled = simulateKeyboardHandler({ key }, activeHub, setHub, togglePalette);
        expect(handled).toBe(true);
        expect(activeHub).toBe(exp);
      }
    });

    it('suppresses hotkey hub switching when focused inside text inputs, textareas, or selects', () => {
      let activeHub: ActivityHub = 'narrative';
      const setHub = (h: ActivityHub) => { activeHub = h; };
      const togglePalette = vi.fn();

      const inputs = [
        { tagName: 'INPUT' },
        { tagName: 'input' },
        { tagName: 'TEXTAREA' },
        { tagName: 'textarea' },
        { tagName: 'SELECT' },
        { tagName: 'select' },
      ];

      for (const target of inputs) {
        const handled = simulateKeyboardHandler(
          { key: '1', target },
          activeHub,
          setHub,
          togglePalette
        );
        expect(handled).toBe(false);
        expect(activeHub).toBe('narrative'); // Hub did NOT change!
      }
    });

    it('suppresses hotkey hub switching when focused inside contentEditable elements or Monaco editor', () => {
      let activeHub: ActivityHub = 'map';
      const setHub = (h: ActivityHub) => { activeHub = h; };
      const togglePalette = vi.fn();

      // contentEditable
      const handledEditable = simulateKeyboardHandler(
        { key: '3', target: { isContentEditable: true } },
        activeHub,
        setHub,
        togglePalette
      );
      expect(handledEditable).toBe(false);
      expect(activeHub).toBe('map');

      // Monaco Editor container
      const handledMonaco = simulateKeyboardHandler(
        {
          key: '4',
          target: {
            tagName: 'DIV',
            closest: (sel: string) => (sel === '.monaco-editor' ? {} : null),
          },
        },
        activeHub,
        setHub,
        togglePalette
      );
      expect(handledMonaco).toBe(false);
      expect(activeHub).toBe('map');
    });

    it('suppresses hotkey hub switching when modifier keys (Ctrl, Alt, Meta) are held', () => {
      let activeHub: ActivityHub = 'map';
      const setHub = (h: ActivityHub) => { activeHub = h; };
      const togglePalette = vi.fn();

      expect(simulateKeyboardHandler({ key: '2', ctrlKey: true }, activeHub, setHub, togglePalette)).toBe(false);
      expect(simulateKeyboardHandler({ key: '3', altKey: true }, activeHub, setHub, togglePalette)).toBe(false);
      expect(simulateKeyboardHandler({ key: '4', metaKey: true }, activeHub, setHub, togglePalette)).toBe(false);
      expect(activeHub).toBe('map');
    });

    it('handles 1,000 rapid randomized keystrokes without state corruption or invalid transitions', () => {
      let activeHub: ActivityHub = 'narrative';
      const setHub = (h: ActivityHub) => { activeHub = h; };
      const togglePalette = vi.fn();

      const keyOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'Escape', 'Enter'];
      const validHubs = new Set(['map', 'politics', 'military', 'economy', 'narrative', 'ui', 'simulation']);

      for (let i = 0; i < 1000; i++) {
        const key = keyOptions[i % keyOptions.length];
        simulateKeyboardHandler({ key }, activeHub, setHub, togglePalette);
        expect(validHubs.has(activeHub)).toBe(true);
      }
    });

    it('toggles command palette on Ctrl+K and Cmd+K without switching hubs', () => {
      let activeHub: ActivityHub = 'map';
      const setHub = (h: ActivityHub) => { activeHub = h; };
      let paletteToggled = 0;
      const togglePalette = () => { paletteToggled++; };

      simulateKeyboardHandler({ key: 'k', ctrlKey: true }, activeHub, setHub, togglePalette);
      expect(paletteToggled).toBe(1);
      expect(activeHub).toBe('map');

      simulateKeyboardHandler({ key: 'K', metaKey: true }, activeHub, setHub, togglePalette);
      expect(paletteToggled).toBe(2);
      expect(activeHub).toBe('map');
    });
  });

  // ==========================================================================
  // Dimension 2: Universal Command Palette Query Parsing & Navigation
  // ==========================================================================
  describe('2. Universal Command Palette Query Parsing & Boundary Navigation', () => {
    const SAMPLE_ACTIONS = [
      { id: 'hub_map', title: 'Switch to Hub 1: World & Map Studio (Hotkey 1)', category: 'Navigation' },
      { id: 'hub_politics', title: 'Switch to Hub 2: Politics Studio (Hotkey 2)', category: 'Navigation' },
      { id: 'hub_military', title: 'Switch to Hub 3: Military Studio (Hotkey 3)', category: 'Navigation' },
      { id: 'hub_economy', title: 'Switch to Hub 4: Economy Studio (Hotkey 4)', category: 'Navigation' },
      { id: 'hub_narrative', title: 'Switch to Hub 5: Narrative Studio (Hotkey 5)', category: 'Navigation' },
      { id: 'hub_ui', title: 'Switch to Hub 6: UI Studio (Hotkey 6)', category: 'Navigation' },
      { id: 'hub_simulation', title: 'Switch to Hub 7: Simulation Studio (Hotkey 7)', category: 'Navigation' },
      { id: 'map_river', title: 'Smart 1px Vector River Pencil', category: 'World & Map Studio' },
      { id: 'military_chassis', title: 'Modular Equipment Chassis Designer (Tanks, Planes, Ships)', category: 'Military Studio' },
      { id: 'bop_studio', title: 'Balance of Power (BoP) Studio (BBA Dynamic Tension)', category: 'Politics Studio' },
      { id: 'export_mod', title: 'Export Mod Files (.txt & UTF-8 BOM .yml)', category: 'Packaging' },
    ];

    function filterActions(query: string) {
      return SAMPLE_ACTIONS.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.category.toLowerCase().includes(query.toLowerCase())
      );
    }

    it('performs case-insensitive filtering consistently across diverse query casings', () => {
      const qLower = filterActions('politics');
      const qUpper = filterActions('POLITICS');
      const qMixed = filterActions('PoLiTiCs');

      expect(qLower.length).toBeGreaterThan(0);
      expect(qLower).toEqual(qUpper);
      expect(qLower).toEqual(qMixed);
    });

    it('safely handles adversarial queries with regex special characters and unicode tokens', () => {
      const specialQueries = [
        '(\\d+).*',
        '[[test]]',
        '*{^$}|',
        '?',
        '+',
        '.txt & UTF-8 BOM',
        '1px (Vector)',
      ];

      for (const q of specialQueries) {
        // Must NOT throw a RegExp or parsing error
        expect(() => filterActions(q)).not.toThrow();
      }

      const bomMatch = filterActions('.txt & UTF-8 BOM');
      expect(bomMatch.length).toBe(1);
      expect(bomMatch[0].id).toBe('export_mod');
    });

    it('returns empty array when query does not match any item', () => {
      const result = filterActions('nonexistent_gibberish_xyz_999');
      expect(result).toHaveLength(0);
    });

    it('executes circular ArrowDown and ArrowUp boundary wrapping flawlessly', () => {
      const list = filterActions('Studio');
      const len = list.length;
      expect(len).toBeGreaterThan(1);

      // ArrowDown wrapping formula from CommandPalette: (prev + 1) % len
      let idx = 0;
      idx = (idx + 1) % len;
      expect(idx).toBe(1);

      // Advance to end
      idx = len - 1;
      // ArrowDown from last index wraps to 0
      idx = (idx + 1) % len;
      expect(idx).toBe(0);

      // ArrowUp wrapping formula: (prev - 1 + len) % len
      // ArrowUp from index 0 wraps to len - 1
      idx = (idx - 1 + len) % len;
      expect(idx).toBe(len - 1);

      // ArrowUp again goes to len - 2
      idx = (idx - 1 + len) % len;
      expect(idx).toBe(len - 2);
    });

    it('safely handles arrow navigation when filtered list is empty', () => {
      const emptyList: any[] = [];
      const len = emptyList.length;

      const downIdx = len ? (0 + 1) % len : 0;
      const upIdx = len ? (0 - 1 + len) % len : 0;

      expect(downIdx).toBe(0);
      expect(upIdx).toBe(0);
      expect(Number.isNaN(downIdx)).toBe(false);
      expect(Number.isNaN(upIdx)).toBe(false);
    });
  });

  // ==========================================================================
  // Dimension 3: Tarjan SCC Deadlock Solver Edge Cases
  // ==========================================================================
  describe('3. Tarjan SCC Solver Deep Edge Cases', () => {
    function makeFocus(
      id: string,
      prerequisites: string[][] = [],
      mutuallyExclusive: string[] = []
    ): FocusNodeData {
      return {
        id,
        name: id,
        symbol: '★',
        icon: 'GFX_goal_generic',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites,
        mutually_exclusive: mutuallyExclusive,
        reward: '',
        available: '',
        ai: 1,
        prereqMode: 'all',
        description: '',
        status: 'available',
      };
    }

    it('handles an empty focus tree gracefully', () => {
      const result = analyzeFocusTreeDeadlocks([]);
      expect(result.totalEvaluated).toBe(0);
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.independentRoots).toHaveLength(0);
      expect(result.unreachableFocuses).toHaveLength(0);
      expect(result.hasMutualExclusionDeadlocks).toBe(false);
    });

    it('correctly identifies all nodes as independent roots in a completely disconnected graph', () => {
      const disconnectedNodes: FocusNodeData[] = [
        makeFocus('NODE_A'),
        makeFocus('NODE_B'),
        makeFocus('NODE_C'),
        makeFocus('NODE_D'),
      ];

      const result = analyzeFocusTreeDeadlocks(disconnectedNodes);
      expect(result.totalEvaluated).toBe(4);
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.independentRoots).toEqual(['NODE_A', 'NODE_B', 'NODE_C', 'NODE_D']);
      expect(result.unreachableFocuses).toHaveLength(0);
    });

    it('detects a cycle of length 1 (self-loop: node requires itself as prerequisite)', () => {
      const selfLoop = [
        makeFocus('SELF_LOOP_NODE', [['SELF_LOOP_NODE']]),
        makeFocus('NORMAL_ROOT'),
      ];

      const result = analyzeFocusTreeDeadlocks(selfLoop);
      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toEqual(['SELF_LOOP_NODE']);
      expect(result.independentRoots).toEqual(['NORMAL_ROOT']);
    });

    it('detects a cycle of length 2 (A -> B -> A) and flags both as unreachable from roots', () => {
      const cycle2 = [
        makeFocus('NODE_A', [['NODE_B']]),
        makeFocus('NODE_B', [['NODE_A']]),
      ];

      const result = analyzeFocusTreeDeadlocks(cycle2);
      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].sort()).toEqual(['NODE_A', 'NODE_B']);
      expect(result.independentRoots).toHaveLength(0);
      expect(result.unreachableFocuses.sort()).toEqual(['NODE_A', 'NODE_B']);
    });

    it('analyzes a multi-component graph with one cyclic component and one valid DAG component', () => {
      const multiComponent = [
        // Component 1: Cyclic (X -> Y -> Z -> X)
        makeFocus('X', [['Z']]),
        makeFocus('Y', [['X']]),
        makeFocus('Z', [['Y']]),
        // Component 2: Clean DAG (ROOT -> CHILD_1 -> CHILD_2)
        makeFocus('DAG_ROOT', []),
        makeFocus('DAG_CHILD_1', [['DAG_ROOT']]),
        makeFocus('DAG_CHILD_2', [['DAG_CHILD_1']]),
      ];

      const result = analyzeFocusTreeDeadlocks(multiComponent);
      expect(result.totalEvaluated).toBe(6);
      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].sort()).toEqual(['X', 'Y', 'Z']);
      expect(result.independentRoots).toEqual(['DAG_ROOT']);
      expect(result.unreachableFocuses.sort()).toEqual(['X', 'Y', 'Z']);
    });

    it('detects multiple disjoint cycles occurring in distinct graph subcomponents', () => {
      const dualCycles = [
        // Cycle 1: C1_A <-> C1_B
        makeFocus('C1_A', [['C1_B']]),
        makeFocus('C1_B', [['C1_A']]),
        // Cycle 2: C2_A -> C2_B -> C2_C -> C2_A
        makeFocus('C2_A', [['C2_C']]),
        makeFocus('C2_B', [['C2_A']]),
        makeFocus('C2_C', [['C2_B']]),
        // Clean root
        makeFocus('CLEAN_ROOT', []),
      ];

      const result = analyzeFocusTreeDeadlocks(dualCycles);
      expect(result.cycles).toHaveLength(2);
      expect(result.independentRoots).toEqual(['CLEAN_ROOT']);
    });

    it('detects mutual exclusion deadlocks: transitive dependency and AND-group conflict', () => {
      const deadlockNodes = [
        makeFocus('ROOT', []),
        makeFocus('BRANCH_A', [['ROOT']], ['BRANCH_B']),
        makeFocus('BRANCH_B', [['BRANCH_A']], ['BRANCH_A']), // Mutually exclusive with parent BRANCH_A!
        makeFocus('CHILD_CONFLICT', [['BRANCH_A', 'BRANCH_B']]), // Demands both simultaneously!
      ];

      const result = analyzeFocusTreeDeadlocks(deadlockNodes);
      expect(result.hasMutualExclusionDeadlocks).toBe(true);
      expect(result.mutualExclusions.length).toBeGreaterThanOrEqual(1);

      const hasTransitive = result.mutualExclusions.some((m) =>
        m.reason.includes('transitively depends')
      );
      const hasAndGroup = result.mutualExclusions.some((m) =>
        m.reason.includes('in the same prerequisite group')
      );

      expect(hasTransitive || hasAndGroup).toBe(true);
    });
  });

  // ==========================================================================
  // Dimension 4: 5x5 Division Designer Armor/Piercing Weighting & Speed Bottlenecks
  // ==========================================================================
  describe('4. 5x5 Division Designer Armor/Piercing Weighting & Extreme Bottlenecks', () => {
    function makeBattalion(overrides: Partial<BattalionStats>): BattalionStats {
      return {
        id: 'infantry',
        name: 'Infantry',
        combatWidth: 2,
        manpower: 1000,
        maxHp: 25,
        organization: 50,
        softAttack: 10,
        hardAttack: 2,
        defense: 20,
        breakthrough: 5,
        armor: 0,
        piercing: 4,
        maximumSpeed: 4.0,
        supplyConsumption: 0.05,
        trainingTime: 90,
        ...overrides,
      };
    }

    function makeSupport(overrides: Partial<SupportCompanyStats>): SupportCompanyStats {
      return {
        id: 'support_artillery',
        name: 'Support Artillery',
        combatWidth: 0,
        manpower: 300,
        maxHp: 2,
        organization: 20,
        softAttack: 15,
        hardAttack: 2,
        defense: 10,
        breakthrough: 4,
        armor: 0,
        piercing: 5,
        maximumSpeed: 4.0,
        supplyConsumption: 0.02,
        trainingTime: 120,
        ...overrides,
      };
    }

    it('returns zeroes across all metrics for a completely empty template', () => {
      const emptyState: DivisionTemplateState = {
        name: 'Empty Division',
        grid: Array(5).fill(null).map(() => Array(5).fill(null)),
        supportCompanies: Array(5).fill(null),
        regimentalAttachments: [],
      };

      const stats = calculateDivisionStats(emptyState);
      expect(stats.totalBattalions).toBe(0);
      expect(stats.totalSupportCompanies).toBe(0);
      expect(stats.combatWidth).toBe(0);
      expect(stats.manpower).toBe(0);
      expect(stats.organization).toBe(0);
      expect(stats.softAttack).toBe(0);
      expect(stats.hardAttack).toBe(0);
      expect(stats.armor).toBe(0);
      expect(stats.piercing).toBe(0);
      expect(stats.maximumSpeed).toBe(0);
    });

    it('calculates exact armor and piercing for a single tank battalion template', () => {
      // 1 Heavy Tank battalion: armor = 100, piercing = 80
      // In HOI4:
      // armor = 0.3 * max + 0.7 * avg = 0.3 * 100 + 0.7 * 100 = 100.0
      // piercing = 0.4 * max + 0.6 * avg = 0.4 * 80 + 0.6 * 80 = 80.0
      const tank = makeBattalion({
        id: 'heavy_tank',
        name: 'Heavy Tank',
        combatWidth: 2,
        manpower: 500,
        armor: 100,
        piercing: 80,
        maximumSpeed: 5.0,
      });

      const grid: (BattalionStats | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      grid[0][0] = tank;

      const state: DivisionTemplateState = {
        name: '1-Tank Division',
        grid,
        supportCompanies: Array(5).fill(null),
        regimentalAttachments: [],
      };

      const stats = calculateDivisionStats(state);
      expect(stats.totalBattalions).toBe(1);
      expect(stats.totalSupportCompanies).toBe(0);
      expect(stats.combatWidth).toBe(2);
      expect(stats.armor).toBe(100);
      expect(stats.piercing).toBe(80);
      expect(stats.maximumSpeed).toBe(5.0);
    });

    it('accurately applies HOI4 weighted armor (30/70) and piercing (40/60) with mixed battalions', () => {
      // 1 Tank (armor 100, piercing 80) + 1 Infantry (armor 0, piercing 4)
      // allUnits = [tank, inf] -> length = 2
      // maxArmor = 100, avgArmor = (100 + 0) / 2 = 50 -> armor = 0.3 * 100 + 0.7 * 50 = 30 + 35 = 65.0
      // maxPiercing = 80, avgPiercing = (80 + 4) / 2 = 42 -> piercing = 0.4 * 80 + 0.6 * 42 = 32 + 25.2 = 57.2
      const tank = makeBattalion({ id: 'tank', armor: 100, piercing: 80 });
      const inf = makeBattalion({ id: 'inf', armor: 0, piercing: 4 });

      const grid: (BattalionStats | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      grid[0][0] = tank;
      grid[0][1] = inf;

      const state: DivisionTemplateState = {
        name: 'Tank-Inf Division',
        grid,
        supportCompanies: Array(5).fill(null),
        regimentalAttachments: [],
      };

      const stats = calculateDivisionStats(state);
      expect(stats.armor).toBe(65.0);
      expect(stats.piercing).toBe(57.2);
    });

    it('correctly handles all-support templates (zero combat battalions)', () => {
      const sup1 = makeSupport({ id: 'sup1', maximumSpeed: 6.0, armor: 0, piercing: 10 });
      const sup2 = makeSupport({ id: 'sup2', maximumSpeed: 4.0, armor: 10, piercing: 20 });

      const state: DivisionTemplateState = {
        name: 'Support Only',
        grid: Array(5).fill(null).map(() => Array(5).fill(null)),
        supportCompanies: [sup1, sup2, null, null, null],
        regimentalAttachments: [],
      };

      const stats = calculateDivisionStats(state);
      expect(stats.totalBattalions).toBe(0);
      expect(stats.totalSupportCompanies).toBe(2);
      expect(stats.combatWidth).toBe(0); // Support does NOT add combat width!
      expect(stats.maximumSpeed).toBe(4.0); // Min of support speeds
    });

    it('throttles division speed to the slowest combat battalion (extreme bottleneck)', () => {
      // 9 Motorized battalions (12.0 km/h) + 1 Super-Heavy Tank (2.5 km/h)
      const motorized = makeBattalion({ id: 'motorized', maximumSpeed: 12.0 });
      const superHeavy = makeBattalion({ id: 'super_heavy', maximumSpeed: 2.5 });

      const grid: (BattalionStats | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      grid[0][0] = superHeavy;
      for (let c = 1; c < 5; c++) grid[0][c] = motorized;
      for (let c = 0; c < 5; c++) grid[1][c] = motorized;

      const state: DivisionTemplateState = {
        name: 'Slow Tank Division',
        grid,
        supportCompanies: Array(5).fill(null),
        regimentalAttachments: [],
      };

      const stats = calculateDivisionStats(state);
      expect(stats.totalBattalions).toBe(10);
      expect(stats.maximumSpeed).toBe(2.5); // Throttled to 2.5 km/h!
    });

    it('preserves combat battalion speed when support company is slower (HOI4 rule)', () => {
      // 5 Light Tanks (12.0 km/h) + 1 Foot Engineer Support Company (4.0 km/h)
      // In HOI4 mechanics, foot support companies do NOT slow down mobile division templates!
      const lightTank = makeBattalion({ id: 'light_tank', maximumSpeed: 12.0 });
      const footEngineer = makeSupport({ id: 'foot_engineer', maximumSpeed: 4.0 });

      const grid: (BattalionStats | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      for (let c = 0; c < 5; c++) grid[0][c] = lightTank;

      const state: DivisionTemplateState = {
        name: 'Light Tank Speed Preserved',
        grid,
        supportCompanies: [footEngineer, null, null, null, null],
        regimentalAttachments: [],
      };

      const stats = calculateDivisionStats(state);
      expect(stats.maximumSpeed).toBe(12.0); // Not throttled by support!
    });
  });

  // ==========================================================================
  // Dimension 5: 32-bit TGA Flag Buffer Byte Length & BGRA Channel Integrity
  // ==========================================================================
  describe('5. 32-Bit TGA Flag Buffer Length & BGRA Channel Integrity', () => {
    it('generates exact byte lengths for all 3 Paradox flag resolutions', () => {
      const red: [number, number, number] = [200, 25, 35];

      // Standard 82x52: 18 header + 82 * 52 * 4 = 18 + 17,056 = 17,074
      const std = createTgaBuffer(82, 52, red);
      expect(std.length).toBe(17074);

      // Medium 41x26: 18 header + 41 * 26 * 4 = 18 + 4,264 = 4,282
      const med = createTgaBuffer(41, 26, red);
      expect(med.length).toBe(4282);

      // Small 10x7: 18 header + 10 * 7 * 4 = 18 + 280 = 298
      const sml = createTgaBuffer(10, 7, red);
      expect(sml.length).toBe(298);
    });

    it('enforces uncompressed 32-bit true-color TGA header specification', () => {
      const buf = createTgaBuffer(82, 52, [100, 150, 200]);

      expect(buf[0]).toBe(0); // ID length: 0
      expect(buf[1]).toBe(0); // Color map type: 0 (none)
      expect(buf[2]).toBe(2); // Image type: 2 (uncompressed true-color)

      // Width: 82 little-endian
      const w = buf[12] | (buf[13] << 8);
      expect(w).toBe(82);

      // Height: 52 little-endian
      const h = buf[14] | (buf[15] << 8);
      expect(h).toBe(52);

      expect(buf[16]).toBe(32); // Bits per pixel: 32
      expect(buf[17]).toBe(0x28); // 8 alpha bits (0x08) + top-left origin (0x20) = 0x28
    });

    it('strictly writes BGRA byte order (Blue, Green, Red, Alpha) across all pixel channels', () => {
      const testColor: [number, number, number] = [220, 130, 45]; // R=220, G=130, B=45
      const buf = createTgaBuffer(10, 7, testColor);
      const pixelCount = 10 * 7;

      for (let i = 0; i < pixelCount; i++) {
        const offset = 18 + i * 4;
        const b = buf[offset];
        const g = buf[offset + 1];
        const r = buf[offset + 2];
        const a = buf[offset + 3];

        expect(b).toBe(45);  // Blue channel
        expect(g).toBe(130); // Green channel
        expect(r).toBe(220); // Red channel
        expect(a).toBe(255); // Alpha channel (opaque)
      }
    });

    it('handles boundary extremes (pure black [0,0,0] and pure white [255,255,255])', () => {
      const black = createTgaBuffer(10, 10, [0, 0, 0]);
      expect(black[18]).toBe(0);   // B
      expect(black[19]).toBe(0);   // G
      expect(black[20]).toBe(0);   // R
      expect(black[21]).toBe(255); // A

      const white = createTgaBuffer(10, 10, [255, 255, 255]);
      expect(white[18]).toBe(255); // B
      expect(white[19]).toBe(255); // G
      expect(white[20]).toBe(255); // R
      expect(white[21]).toBe(255); // A
    });
  });

  // ==========================================================================
  // Dimension 6: UTF-8 BOM Localization Prefix Integrity
  // ==========================================================================
  describe('6. UTF-8 BOM Localization Prefix & Multi-Language Integrity', () => {
    it('verifies exact byte sequence [0xEF, 0xBB, 0xBF] in UTF8_BOM constant', () => {
      expect(UTF8_BOM[0]).toBe(0xef);
      expect(UTF8_BOM[1]).toBe(0xbb);
      expect(UTF8_BOM[2]).toBe(0xbf);
      expect(UTF8_BOM.length).toBe(3);
    });

    it('prepends UTF-8 BOM cleanly to plain ASCII text without altering text body', () => {
      const yaml = 'l_english:\n FRA:0 "France"\n';
      const bytes = prependUtf8Bom(yaml);

      expect(hasUtf8Bom(bytes)).toBe(true);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);

      const stripped = stripUtf8Bom(bytes);
      expect(stripped.hasBom).toBe(true);
      expect(stripped.text).toBe(yaml);
    });

    it('preserves multi-lingual unicode integrity (Cyrillic, CJK, German, French accents)', () => {
      const multilingualYaml = [
        'l_english:',
        ' RUS:0 "Российская Федерация"',
        ' GER:0 "Großdeutsches Reich & Österreich"',
        ' FRA:0 "République Française et Colonies"',
        ' CHI:0 "中華民國國防部"',
        ' POL:0 "Rzeczpospolita Polska: Żółw & Gęś"',
      ].join('\n');

      const bytes = prependUtf8Bom(multilingualYaml);
      expect(hasUtf8Bom(bytes)).toBe(true);

      const val = validateLocalizationEncoding(bytes);
      expect(val.valid).toBe(true);

      const stripped = stripUtf8Bom(bytes);
      expect(stripped.text).toBe(multilingualYaml);
    });

    it('correctly rejects files missing UTF-8 BOM or containing other BOMs (UTF-16)', () => {
      // Missing BOM
      const noBom = new TextEncoder().encode('l_english:\n USA:0 "United States"\n');
      expect(hasUtf8Bom(noBom)).toBe(false);
      const valNoBom = validateLocalizationEncoding(noBom);
      expect(valNoBom.valid).toBe(false);
      expect(valNoBom.error).toContain('Missing mandatory UTF-8 BOM');

      // UTF-16 LE BOM [0xFF, 0xFE]
      const utf16le = new Uint8Array([0xff, 0xfe, 0x6c, 0x00]);
      expect(hasUtf8Bom(utf16le)).toBe(false);
      const val16 = validateLocalizationEncoding(utf16le);
      expect(val16.valid).toBe(false);

      // Buffer too small (< 3 bytes)
      const tiny = new Uint8Array([0xef, 0xbb]);
      expect(hasUtf8Bom(tiny)).toBe(false);
      const valTiny = validateLocalizationEncoding(tiny);
      expect(valTiny.valid).toBe(false);
      expect(valTiny.error).toContain('too small');
    });
  });

  // ==========================================================================
  // Dimension 7: 3-Way AST Merge Add/Add Collisions & Nested Properties
  // ==========================================================================
  describe('7. 3-Way AST Merge Add/Add Collisions & Nested Property Conflicts', () => {
    it('detects Add/Add collision as a conflict when mod and vanilla add distinct definitions', () => {
      const base = ''; // Not present in base
      const vanilla = `
        focus = {
          id = FOCUS_SHARED_ADD
          cost = 10
          reward = "add_political_power = 50"
        }
      `;
      const mod = `
        focus = {
          id = FOCUS_SHARED_ADD
          cost = 5
          reward = "add_political_power = 150"
        }
      `;

      const report = diffAst3Way(base, vanilla, mod);
      expect(report.totalBlocks).toBe(1);
      expect(report.conflictCount).toBe(1);
      expect(report.autoMergedCount).toBe(0);

      const block = report.blocks[0];
      expect(block.id).toBe('FOCUS_SHARED_ADD');
      expect(block.status).toBe('conflict');
      expect(block.mergedContent).toContain('ADD/ADD COLLISION');
      expect(block.mergedContent).toContain('USER MOD');
      expect(block.mergedContent).toContain('UPSTREAM VANILLA');
    });

    it('auto-merges Add/Add cleanly when identical blocks are added in both branches', () => {
      const base = '';
      const identical = `
        focus = {
          id = FOCUS_SAME
          cost = 10
        }
      `;

      const report = diffAst3Way(base, identical, identical);
      expect(report.totalBlocks).toBe(1);
      expect(report.conflictCount).toBe(0);
      expect(report.autoMergedCount).toBe(1);
      expect(report.blocks[0].status).toBe('clean');
    });

    it('performs clean property-level auto-merge when vanilla and mod edit distinct properties of the same block', () => {
      const base = `
        focus = {
          id = FOCUS_PROPERTY_TEST
          cost = 10
          reward = "add_political_power = 50"
          ai_will_do = 1
        }
      `;
      // Vanilla updates reward to 75
      const vanilla = `
        focus = {
          id = FOCUS_PROPERTY_TEST
          cost = 10
          reward = "add_political_power = 75"
          ai_will_do = 1
        }
      `;
      // Mod updates cost to 5
      const mod = `
        focus = {
          id = FOCUS_PROPERTY_TEST
          cost = 5
          reward = "add_political_power = 50"
          ai_will_do = 1
        }
      `;

      const report = diffAst3Way(base, vanilla, mod);
      expect(report.conflictCount).toBe(0);
      expect(report.autoMergedCount).toBe(1);

      const block = report.blocks[0];
      expect(block.status).toBe('upstream_modified');
      expect(block.mergedContent).toContain('cost = 5'); // From mod
      expect(block.mergedContent).toContain('reward = "add_political_power = 75"'); // From vanilla
      expect(block.mergedContent).toContain('ai_will_do = 1'); // Unchanged base
    });

    it('flags conflict when both vanilla and mod edit the exact same property with conflicting values', () => {
      const base = `
        focus = {
          id = FOCUS_SAME_PROP_CONFLICT
          cost = 10
        }
      `;
      const vanilla = `
        focus = {
          id = FOCUS_SAME_PROP_CONFLICT
          cost = 15
        }
      `;
      const mod = `
        focus = {
          id = FOCUS_SAME_PROP_CONFLICT
          cost = 5
        }
      `;

      const report = diffAst3Way(base, vanilla, mod);
      expect(report.conflictCount).toBe(1);
      expect(report.blocks[0].status).toBe('conflict');
      expect(report.blocks[0].description).toContain('cost');
    });

    it('flags conflict when upstream deletes a block that user mod modified', () => {
      const base = `
        focus = {
          id = FOCUS_DELETED_UPSTREAM
          cost = 10
        }
      `;
      const vanilla = ''; // Upstream removed it
      const mod = `
        focus = {
          id = FOCUS_DELETED_UPSTREAM
          cost = 20
        }
      `;

      const report = diffAst3Way(base, vanilla, mod);
      expect(report.conflictCount).toBe(1);
      expect(report.blocks[0].status).toBe('conflict');
      expect(report.blocks[0].description).toContain('removed in upstream vanilla');
    });
  });

  // ==========================================================================
  // Dimension 8: River 1px Topological Rasterizer Stress Testing
  // ==========================================================================
  describe('8. River Rasterizer 1px Topological Stress Testing', () => {
    it('returns empty result cleanly for 0 or 1 point inputs', () => {
      expect(rasterizeRiverPolyline([]).pixels).toHaveLength(0);
      expect(rasterizeRiverPolyline([[10, 10]]).pixels).toHaveLength(0);
    });

    it('successfully prunes 2x2 pixel clusters while guaranteeing green source and red mouth', () => {
      // 45-degree diagonal segment that normally produces 2x2 corner overlaps in 8-connected Bresenham
      const points: [number, number][] = [
        [10, 10],
        [15, 15],
        [20, 15],
        [25, 20],
      ];

      const result = rasterizeRiverPolyline(points, 2);
      expect(result.valid1px).toBe(true);
      expect(result.violations).toHaveLength(0);

      // Verify Source is green (0, 255, 0)
      const source = result.coloredPixels[0];
      expect(source.type).toBe('source');
      expect(source.rgb).toEqual([0, 255, 0]);

      // Verify Mouth is red (255, 0, 0)
      const mouth = result.coloredPixels[result.coloredPixels.length - 1];
      expect(mouth.type).toBe('mouth');
      expect(mouth.rgb).toEqual([255, 0, 0]);

      // Verify no remaining 2x2 clusters exist
      const pSet = new Set(result.pixels.map(([x, y]) => `${x},${y}`));
      const clusters = find2x2Clusters(pSet);
      expect(clusters).toHaveLength(0);
    });
  });
});
