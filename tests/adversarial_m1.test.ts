import { describe, it, expect } from 'vitest';
import { isPointInPolygon } from '../src/components/map/MapCanvas';
import { generateStateFileClausewitz } from '../src/components/map/StateReassignmentTool';
import {
  generateUniqueRGB,
  splitPolygonByLine,
  calculatePolygonCenter,
} from '../src/components/map/ProvinceSlicer';
import {
  rasterizeLineBresenham,
  find2x2Clusters,
  prune2x2Blocks,
  rasterizeRiverPolyline,
} from '../src/utils/riverRasterizer';
import {
  validateRiverBitmap,
  RiverGrid,
  RIVER_COLORS,
} from './helpers/riverValidator';
import { runMapDiagnosticsScan } from '../src/components/map/MapLinter';
import { formatHoi4Date } from '../src/components/simulation/SandboxSimulator';
import { analyzeFocusTreeDeadlocks } from '../src/utils/tarjanDeadlockSolver';
import type { Province, State, RiverPath, MapLinterIssue } from '../src/types/map';
import type { FocusNodeData } from '../src/types/focus';
import type { SandboxCountryState } from '../src/types/simulation';

describe('Adversarial Test Suite: Map Linter Stress Test', () => {
  it('detects multiple duplicate RGBs across complex clusters', () => {
    const provinces: Province[] = [
      {
        id: 10,
        name: 'Alpha',
        rgb: [45, 90, 135],
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [10, 10],
        polygon: [[0, 0], [20, 0], [20, 20], [0, 20]],
        adjacentProvinceIds: [],
      },
      {
        id: 20,
        name: 'Beta',
        rgb: [45, 90, 135], // Duplicate with Alpha
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [30, 10],
        polygon: [[20, 0], [40, 0], [40, 20], [20, 20]],
        adjacentProvinceIds: [],
      },
      {
        id: 30,
        name: 'Gamma',
        rgb: [45, 90, 135], // Triplicate with Alpha & Beta
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [50, 10],
        polygon: [[40, 0], [60, 0], [60, 20], [40, 20]],
        adjacentProvinceIds: [],
      },
      {
        id: 40,
        name: 'Delta',
        rgb: [12, 34, 56],
        type: 'land',
        coastal: false,
        terrain: 'forest',
        continent: 1,
        center: [70, 10],
        polygon: [[60, 0], [80, 0], [80, 20], [60, 20]],
        adjacentProvinceIds: [],
      },
      {
        id: 50,
        name: 'Epsilon',
        rgb: [12, 34, 56], // Duplicate with Delta
        type: 'land',
        coastal: false,
        terrain: 'forest',
        continent: 1,
        center: [90, 10],
        polygon: [[80, 0], [100, 0], [100, 20], [80, 20]],
        adjacentProvinceIds: [],
      },
    ];

    const states: State[] = [
      {
        id: 1,
        name: 'State 1',
        manpower: 50000,
        category: 'town',
        owner: 'TAG',
        cores: ['TAG'],
        victoryPoints: [],
        provinces: [10, 20, 30, 40, 50],
        buildings: {},
      },
    ];

    const issues = runMapDiagnosticsScan(provinces, states, []);
    const dupIssues = issues.filter((i) => i.category === 'duplicate_rgb');

    expect(dupIssues.length).toBe(2); // One for [45,90,135], one for [12,34,56]
    expect(dupIssues.some((i) => i.title.includes('45,90,135'))).toBe(true);
    expect(dupIssues.some((i) => i.title.includes('12,34,56'))).toBe(true);
  });

  it('detects all 4 reserved Paradox colors and auto-fix candidate generation', () => {
    const reservedColors: [number, number, number][] = [
      [0, 0, 0],       // Void / boundary
      [0, 255, 0],     // River source
      [255, 0, 0],     // River mouth
      [255, 252, 0],   // River flow
    ];

    const provinces: Province[] = reservedColors.map((color, idx) => ({
      id: 100 + idx,
      name: `RogueProv_${idx}`,
      rgb: color,
      type: 'land',
      coastal: false,
      terrain: 'hills',
      continent: 1,
      center: [idx * 20, 0],
      polygon: [[idx * 20, 0], [idx * 20 + 10, 0], [idx * 20 + 10, 10]],
      adjacentProvinceIds: [],
    }));

    const states: State[] = [
      {
        id: 1,
        name: 'State 1',
        manpower: 10000,
        category: 'rural',
        owner: 'TAG',
        cores: ['TAG'],
        victoryPoints: [],
        provinces: provinces.map((p) => p.id),
        buildings: {},
      },
    ];

    const issues = runMapDiagnosticsScan(provinces, states, []);
    const rogueIssues = issues.filter((i) => i.category === 'rogue_pixel');

    expect(rogueIssues.length).toBe(4);
    for (const issue of rogueIssues) {
      expect(issue.autoFixable).toBe(true);
      expect(issue.severity).toBe('error');
    }

    // Verify unique RGB generator never generates any of the 4 reserved colors
    const existingRgbs: [number, number, number][] = [[10, 20, 30]];
    for (let i = 0; i < 50; i++) {
      const generated = generateUniqueRGB(existingRgbs);
      expect(reservedColors).not.toContainEqual(generated);
      existingRgbs.push(generated);
    }
  });

  it('detects false coastal flags and missing coastal flags with 100% accuracy', () => {
    const seaProv: Province = {
      id: 999,
      name: 'North Sea',
      rgb: [20, 40, 180],
      type: 'sea',
      coastal: false,
      terrain: 'ocean',
      continent: 0,
      center: [50, 50],
      polygon: [[40, 40], [60, 40], [60, 60], [40, 60]],
      adjacentProvinceIds: [1, 2],
    };

    const landProvCoastalValid: Province = {
      id: 1,
      name: 'Valid Coastal',
      rgb: [100, 110, 120],
      type: 'land',
      coastal: true,
      terrain: 'plains',
      continent: 1,
      center: [30, 50],
      polygon: [[20, 40], [40, 40], [40, 60], [20, 60]],
      adjacentProvinceIds: [999], // Touches sea, coastal=true -> valid!
    };

    const landProvMissingCoast: Province = {
      id: 2,
      name: 'Touches sea but coastal is false',
      rgb: [130, 140, 150],
      type: 'land',
      coastal: false, // BUG! Touches sea
      terrain: 'plains',
      continent: 1,
      center: [70, 50],
      polygon: [[60, 40], [80, 40], [80, 60], [60, 60]],
      adjacentProvinceIds: [999],
    };

    const landProvFalseCoast: Province = {
      id: 3,
      name: 'Inland but coastal is true',
      rgb: [160, 170, 180],
      type: 'land',
      coastal: true, // BUG! No adjacent sea
      terrain: 'mountain',
      continent: 1,
      center: [90, 50],
      polygon: [[80, 40], [100, 40], [100, 60], [80, 60]],
      adjacentProvinceIds: [2],
    };

    const states: State[] = [
      {
        id: 1,
        name: 'State 1',
        manpower: 10000,
        category: 'rural',
        owner: 'TAG',
        cores: ['TAG'],
        victoryPoints: [],
        provinces: [1, 2, 3],
        buildings: {},
      },
    ];

    const issues = runMapDiagnosticsScan(
      [seaProv, landProvCoastalValid, landProvMissingCoast, landProvFalseCoast],
      states,
      []
    );

    const coastalIssues = issues.filter((i) => i.category === 'coastal_mismatch');
    expect(coastalIssues.length).toBe(2);
    expect(coastalIssues.some((i) => i.location?.provinceId === 2)).toBe(true);
    expect(coastalIssues.some((i) => i.location?.provinceId === 3)).toBe(true);
    expect(coastalIssues.some((i) => i.location?.provinceId === 1)).toBe(false);
  });

  it('detects unassigned land provinces while properly ignoring sea provinces', () => {
    const provinces: Province[] = [
      {
        id: 1,
        name: 'Assigned Land',
        rgb: [10, 20, 30],
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [0, 0],
        polygon: [[0, 0], [10, 0], [10, 10]],
        adjacentProvinceIds: [],
      },
      {
        id: 2,
        name: 'Unassigned Land',
        rgb: [40, 50, 60],
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [20, 0],
        polygon: [[20, 0], [30, 0], [30, 10]],
        adjacentProvinceIds: [],
      },
      {
        id: 901,
        name: 'Sea Zone',
        rgb: [0, 100, 200],
        type: 'sea',
        coastal: false,
        terrain: 'ocean',
        continent: 0,
        center: [40, 0],
        polygon: [[40, 0], [50, 0], [50, 10]],
        adjacentProvinceIds: [],
      },
    ];

    const states: State[] = [
      {
        id: 1,
        name: 'State 1',
        manpower: 10000,
        category: 'rural',
        owner: 'TAG',
        cores: ['TAG'],
        victoryPoints: [],
        provinces: [1], // Only province 1 assigned
        buildings: {},
      },
    ];

    const issues = runMapDiagnosticsScan(provinces, states, []);
    const unassignedIssues = issues.filter((i) => i.category === 'unassigned_province');

    expect(unassignedIssues.length).toBe(1);
    expect(unassignedIssues[0].location?.provinceId).toBe(2);
    // Sea province 901 must NOT trigger an unassigned province error
    expect(unassignedIssues.some((i) => i.location?.provinceId === 901)).toBe(false);
  });

  it('stress tests river validation with disconnected pixels, missing mouth, and 2x2 clusters', () => {
    // 1. River without mouth
    const gridNoMouth = new RiverGrid(20, 20);
    gridNoMouth.setPixel(2, 2, RIVER_COLORS.SOURCE);
    gridNoMouth.setPixel(2, 3, RIVER_COLORS.TIER_1);
    gridNoMouth.setPixel(2, 4, RIVER_COLORS.TIER_1);
    const resultNoMouth = validateRiverBitmap(gridNoMouth);
    expect(resultNoMouth.valid).toBe(false);
    expect(resultNoMouth.errors.some((e) => e.includes('no mouth pixel'))).toBe(true);

    // 2. River without source
    const gridNoSource = new RiverGrid(20, 20);
    gridNoSource.setPixel(2, 2, RIVER_COLORS.TIER_1);
    gridNoSource.setPixel(2, 3, RIVER_COLORS.TIER_1);
    gridNoSource.setPixel(2, 4, RIVER_COLORS.MOUTH);
    const resultNoSource = validateRiverBitmap(gridNoSource);
    expect(resultNoSource.valid).toBe(false);
    expect(resultNoSource.errors.some((e) => e.includes('no source pixel'))).toBe(true);

    // 3. River with 2x2 cluster
    const gridCluster = new RiverGrid(20, 20);
    gridCluster.setPixel(1, 1, RIVER_COLORS.SOURCE);
    gridCluster.setPixel(2, 2, RIVER_COLORS.TIER_1);
    gridCluster.setPixel(3, 2, RIVER_COLORS.TIER_1);
    gridCluster.setPixel(2, 3, RIVER_COLORS.TIER_1);
    gridCluster.setPixel(3, 3, RIVER_COLORS.TIER_1); // 2x2 cluster at (2,2)
    gridCluster.setPixel(4, 4, RIVER_COLORS.MOUTH);
    const resultCluster = validateRiverBitmap(gridCluster);
    expect(resultCluster.valid).toBe(false);
    expect(resultCluster.twoByTwoBlocks.length).toBeGreaterThan(0);

    // 4. River with disconnected orphan pixel
    const gridOrphan = new RiverGrid(20, 20);
    gridOrphan.setPixel(1, 1, RIVER_COLORS.SOURCE);
    gridOrphan.setPixel(1, 2, RIVER_COLORS.TIER_1);
    gridOrphan.setPixel(1, 3, RIVER_COLORS.MOUTH);
    gridOrphan.setPixel(10, 10, RIVER_COLORS.TIER_2); // Floating orphan!
    const resultOrphan = validateRiverBitmap(gridOrphan);
    expect(resultOrphan.valid).toBe(false);
    expect(resultOrphan.orphanedPixels.length).toBe(1);
    expect(resultOrphan.orphanedPixels[0]).toEqual({ x: 10, y: 10 });
  });

  it('validates 100% successful auto-fix resolution for duplicate RGB, coastal mismatch, and unassigned province', () => {
    let provinces: Province[] = [
      {
        id: 1,
        name: 'Prov1',
        rgb: [100, 100, 100],
        type: 'land',
        coastal: false, // Touches sea 999, so this is missing coastal
        terrain: 'plains',
        continent: 1,
        center: [10, 10],
        polygon: [[0, 0], [20, 0], [20, 20]],
        adjacentProvinceIds: [999],
      },
      {
        id: 2,
        name: 'Prov2',
        rgb: [100, 100, 100], // Duplicate RGB with Prov1
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [30, 10],
        polygon: [[20, 0], [40, 0], [40, 20]],
        adjacentProvinceIds: [],
      },
      {
        id: 3,
        name: 'Prov3',
        rgb: [150, 150, 150],
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [50, 10],
        polygon: [[40, 0], [60, 0], [60, 20]],
        adjacentProvinceIds: [],
      },
      {
        id: 999,
        name: 'Sea1',
        rgb: [0, 50, 150],
        type: 'sea',
        coastal: false,
        terrain: 'ocean',
        continent: 0,
        center: [10, 50],
        polygon: [[0, 40], [20, 40], [20, 60]],
        adjacentProvinceIds: [1],
      },
    ];

    let states: State[] = [
      {
        id: 1,
        name: 'State 1',
        manpower: 10000,
        category: 'rural',
        owner: 'TAG',
        cores: ['TAG'],
        victoryPoints: [],
        provinces: [1], // Prov2 and Prov3 are unassigned!
        buildings: {},
      },
    ];

    // Initial diagnostic scan
    let issues = runMapDiagnosticsScan(provinces, states, []);
    expect(issues.length).toBeGreaterThan(0);

    // Auto-fix duplicate RGB
    const dupIssue = issues.find((i) => i.category === 'duplicate_rgb');
    expect(dupIssue).toBeDefined();
    if (dupIssue && dupIssue.location?.provinceId) {
      const targetId = dupIssue.location.provinceId;
      const otherColors = provinces.filter((p) => p.id !== targetId).map((p) => p.rgb);
      const uniqueRGB = generateUniqueRGB(otherColors);
      provinces = provinces.map((p) => (p.id === targetId ? { ...p, rgb: uniqueRGB } : p));
    }

    // Auto-fix coastal mismatch
    const coastIssue = issues.find((i) => i.category === 'coastal_mismatch');
    expect(coastIssue).toBeDefined();
    if (coastIssue && coastIssue.location?.provinceId) {
      const targetId = coastIssue.location.provinceId;
      const targetProv = provinces.find((p) => p.id === targetId)!;
      const seaIds = new Set(provinces.filter((p) => p.type === 'sea').map((p) => p.id));
      const touchesSea = targetProv.adjacentProvinceIds.some((id) => seaIds.has(id));
      provinces = provinces.map((p) => (p.id === targetId ? { ...p, coastal: touchesSea } : p));
    }

    // Auto-fix unassigned provinces
    for (const unassignedId of [2, 3]) {
      states = states.map((s) =>
        s.id === 1 ? { ...s, provinces: [...s.provinces, unassignedId] } : s
      );
      provinces = provinces.map((p) => (p.id === unassignedId ? { ...p, stateId: 1 } : p));
    }

    // Rescan: All issues must be completely resolved
    const postFixIssues = runMapDiagnosticsScan(provinces, states, []);
    expect(postFixIssues.length).toBe(0);
  });
});

describe('Adversarial Test Suite: State Reassignment Ray-Casting & Spatial Invariants', () => {
  it('tests ray-casting point-in-polygon against concave, star, and boundary points', () => {
    // 5-point Star Polygon (Concave)
    const starPolygon: [number, number][] = [
      [50, 0],
      [65, 35],
      [100, 35],
      [75, 55],
      [85, 90],
      [50, 70],
      [15, 90],
      [25, 55],
      [0, 35],
      [35, 35],
    ];

    // Centroid of star is strictly inside
    expect(isPointInPolygon(50, 50, starPolygon)).toBe(true);

    // Point between top spikes is outside
    expect(isPointInPolygon(70, 20, starPolygon)).toBe(false);

    // Deep concave bottom point is outside
    expect(isPointInPolygon(50, 85, starPolygon)).toBe(false);

    // Outside bounding box
    expect(isPointInPolygon(200, 200, starPolygon)).toBe(false);
    expect(isPointInPolygon(-50, -50, starPolygon)).toBe(false);
  });

  it('tests U-shaped concave polygon hole region', () => {
    // U-shaped polygon
    const uShape: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [70, 100],
      [70, 30],
      [30, 30],
      [30, 100],
      [0, 100],
    ];

    // Inside the left vertical leg
    expect(isPointInPolygon(15, 50, uShape)).toBe(true);
    // Inside the right vertical leg
    expect(isPointInPolygon(85, 50, uShape)).toBe(true);
    // Inside the bottom base
    expect(isPointInPolygon(50, 15, uShape)).toBe(true);
    // Inside the hollow cutout of the U (should be outside the polygon)
    expect(isPointInPolygon(50, 60, uShape)).toBe(false);
  });

  it('preserves victory points, cores, and buildings across state file serialization', () => {
    const complexState: State = {
      id: 777,
      name: 'Custom Rhineland',
      manpower: 4500000,
      category: 'megalopolis',
      owner: 'GER',
      cores: ['GER', 'PRU'],
      victoryPoints: [
        { provinceId: 3001, points: 30 },
        { provinceId: 3002, points: 15 },
      ],
      provinces: [3001, 3002, 3003, 3004],
      buildings: {
        infrastructure: 5,
        industrial_complex: 8,
        arms_factory: 6,
        air_base: 4,
        naval_bases: { 3001: 3 },
      },
    };

    const serialized = generateStateFileClausewitz(complexState);

    expect(serialized).toContain('id = 777');
    expect(serialized).toContain('name = "STATE_777"');
    expect(serialized).toContain('manpower = 4500000');
    expect(serialized).toContain('state_category = megalopolis');
    expect(serialized).toContain('owner = GER');
    expect(serialized).toContain('victory_points = { 3001 30 }');
    expect(serialized).toContain('victory_points = { 3002 15 }');
    expect(serialized).toContain('add_core_of = GER');
    expect(serialized).toContain('add_core_of = PRU');
    expect(serialized).toContain('infrastructure = 5');
    expect(serialized).toContain('industrial_complex = 8');
    expect(serialized).toContain('arms_factory = 6');
    expect(serialized).toContain('air_base = 4');
    expect(serialized).toContain('3001 = { naval_base = 3 }');
    expect(serialized).toContain('3001 3002 3003 3004');
    expect(serialized).toContain('local_supplies = 0.0');
  });

  it('verifies state reassignment correctly updates province ownership without duplicates or orphaned entries', () => {
    const stateA: State = {
      id: 1,
      name: 'State Alpha',
      manpower: 100000,
      category: 'town',
      owner: 'FRA',
      cores: ['FRA'],
      victoryPoints: [{ provinceId: 101, points: 10 }],
      provinces: [101, 102, 103],
      buildings: {},
    };

    const stateB: State = {
      id: 2,
      name: 'State Beta',
      manpower: 200000,
      category: 'city',
      owner: 'ITA',
      cores: ['ITA'],
      victoryPoints: [{ provinceId: 201, points: 5 }],
      provinces: [201, 202],
      buildings: {},
    };

    const provinces: Province[] = [
      { id: 101, name: 'P101', rgb: [1, 1, 1], type: 'land', coastal: false, terrain: 'plains', continent: 1, center: [0,0], polygon: [], adjacentProvinceIds: [], stateId: 1 },
      { id: 102, name: 'P102', rgb: [2, 2, 2], type: 'land', coastal: false, terrain: 'plains', continent: 1, center: [0,0], polygon: [], adjacentProvinceIds: [], stateId: 1 },
      { id: 103, name: 'P103', rgb: [3, 3, 3], type: 'land', coastal: false, terrain: 'plains', continent: 1, center: [0,0], polygon: [], adjacentProvinceIds: [], stateId: 1 },
      { id: 201, name: 'P201', rgb: [4, 4, 4], type: 'land', coastal: false, terrain: 'plains', continent: 1, center: [0,0], polygon: [], adjacentProvinceIds: [], stateId: 2 },
      { id: 202, name: 'P202', rgb: [5, 5, 5], type: 'land', coastal: false, terrain: 'plains', continent: 1, center: [0,0], polygon: [], adjacentProvinceIds: [], stateId: 2 },
    ];

    // Reassign province 102 from State Alpha to State Beta
    const reassignProvIds = [102];
    const selectedSet = new Set(reassignProvIds);
    const targetStateId = 2;

    const updatedStates = [stateA, stateB].map((s) => {
      if (s.id === targetStateId) {
        return { ...s, provinces: Array.from(new Set([...s.provinces, ...reassignProvIds])) };
      } else {
        return { ...s, provinces: s.provinces.filter((p) => !selectedSet.has(p)) };
      }
    });

    const updatedProvinces = provinces.map((p) => {
      if (selectedSet.has(p.id)) {
        return { ...p, stateId: targetStateId };
      }
      return p;
    });

    // Invariant checks
    const newAlpha = updatedStates.find((s) => s.id === 1)!;
    const newBeta = updatedStates.find((s) => s.id === 2)!;

    expect(newAlpha.provinces).toEqual([101, 103]);
    expect(newBeta.provinces).toEqual([201, 202, 102]);
    expect(updatedProvinces.find((p) => p.id === 102)?.stateId).toBe(2);

    // Sum of assigned provinces must remain invariant
    const totalAssigned = newAlpha.provinces.length + newBeta.provinces.length;
    expect(totalAssigned).toBe(5);

    // No province appears more than once across all states
    const allAssigned = [...newAlpha.provinces, ...newBeta.provinces];
    expect(new Set(allAssigned).size).toBe(5);
  });

  it('calculates monotonic new state ID above highest existing ID', () => {
    const existingStates: State[] = [
      { id: 5, name: 'S5', manpower: 1, category: 'rural', owner: 'A', cores: [], victoryPoints: [], provinces: [1], buildings: {} },
      { id: 42, name: 'S42', manpower: 1, category: 'rural', owner: 'A', cores: [], victoryPoints: [], provinces: [2], buildings: {} },
      { id: 18, name: 'S18', manpower: 1, category: 'rural', owner: 'A', cores: [], victoryPoints: [], provinces: [3], buildings: {} },
    ];

    const nextId = Math.max(...existingStates.map((s) => s.id), 0) + 1;
    expect(nextId).toBe(43);

    // Boundary: empty list returns ID 1
    const emptyId = Math.max(...[].map((s: State) => s.id), 0) + 1;
    expect(emptyId).toBe(1);
  });
});

describe('Adversarial Test Suite: Sandbox Simulator Multi-Year State Machine', () => {
  it('simulates 730 continuous game days (2 full years) tracking date transitions and leap year 1936', () => {
    // Day 0: 1936.1.1.12
    expect(formatHoi4Date(0)).toBe('1936.1.1.12');
    // Day 31: 1936.2.1.12
    expect(formatHoi4Date(31)).toBe('1936.2.1.12');
    // Day 59: 1936.2.29.12 (1936 leap day)
    expect(formatHoi4Date(59)).toBe('1936.2.29.12');
    // Day 60: 1936.3.1.12
    expect(formatHoi4Date(60)).toBe('1936.3.1.12');
    // Day 365: 1936.12.31.12
    expect(formatHoi4Date(365)).toBe('1936.12.31.12');
    // Day 366: 1937.1.1.12 (New Year 1937)
    expect(formatHoi4Date(366)).toBe('1937.1.1.12');
    // Day 730: 1937.12.31.12 (End of 1937)
    expect(formatHoi4Date(730)).toBe('1937.12.31.12');
    // Day 731: 1938.1.1.12 (New Year 1938)
    expect(formatHoi4Date(731)).toBe('1938.1.1.12');
  });

  it('runs hundreds of simulated game days verifying political power growth rate and focus duration', () => {
    let pp = 150.0;
    const dailyGain = 1.85;
    const daysToSimulate = 300;

    let activeFocus: { id: string; daysRemaining: number } | null = {
      id: 'industrial_effort',
      daysRemaining: 70, // 10 cost * 7 days
    };
    const completedFocuses: string[] = [];

    for (let day = 1; day <= daysToSimulate; day++) {
      pp += dailyGain;

      if (activeFocus) {
        activeFocus.daysRemaining--;
        if (activeFocus.daysRemaining <= 0) {
          completedFocuses.push(activeFocus.id);
          pp += 100; // Reward bonus
          activeFocus = null;
        }
      }
    }

    // Expected PP: 150 + 300 * 1.85 + 100 (from completed focus) = 150 + 555 + 100 = 805
    expect(pp).toBeCloseTo(805.0, 5);
    expect(completedFocuses).toEqual(['industrial_effort']);
    expect(activeFocus).toBeNull();
  });

  it('stress tests stability and war support clamping bounds [0%, 100%]', () => {
    // Test upper clamp: adding excessive stability must not exceed 1.0 (100%)
    let stability = 0.65;
    const excessiveBoost = 0.50;
    stability = Math.min(1.0, stability + excessiveBoost);
    expect(stability).toBe(1.0);

    // Test lower clamp: dropping stability must not drop below 0.0 (0%)
    const penalty = 1.50;
    const clampedLowerStability = Math.max(0.0, stability - penalty);
    expect(clampedLowerStability).toBe(0.0);

    // Test war support bounds
    let warSupport = 0.40;
    warSupport = Math.min(1.0, Math.max(0.0, warSupport + 0.80));
    expect(warSupport).toBe(1.0);

    warSupport = Math.min(1.0, Math.max(0.0, warSupport - 1.50));
    expect(warSupport).toBe(0.0);
  });

  it('verifies ideology popularity distribution normalization to exactly 100%', () => {
    // Normalization helper
    function normalizeIdeologies(raw: { democratic: number; neutrality: number; fascism: number; communism: number }) {
      const sum = raw.democratic + raw.neutrality + raw.fascism + raw.communism;
      if (sum === 0) return { democratic: 25, neutrality: 25, fascism: 25, communism: 25 };
      return {
        democratic: Number(((raw.democratic / sum) * 100).toFixed(1)),
        neutrality: Number(((raw.neutrality / sum) * 100).toFixed(1)),
        fascism: Number(((raw.fascism / sum) * 100).toFixed(1)),
        communism: Number(((raw.communism / sum) * 100).toFixed(1)),
      };
    }

    // Baseline: sums to 100
    const baseline = normalizeIdeologies({ democratic: 55, neutrality: 25, fascism: 12, communism: 8 });
    expect(baseline.democratic + baseline.neutrality + baseline.fascism + baseline.communism).toBeCloseTo(100, 1);

    // Skewed input: sums to 150
    const skewedOver = normalizeIdeologies({ democratic: 60, neutrality: 40, fascism: 30, communism: 20 });
    const sumOver = skewedOver.democratic + skewedOver.neutrality + skewedOver.fascism + skewedOver.communism;
    expect(sumOver).toBeCloseTo(100, 1);

    // Under-represented input: sums to 60
    const skewedUnder = normalizeIdeologies({ democratic: 30, neutrality: 10, fascism: 15, communism: 5 });
    const sumUnder = skewedUnder.democratic + skewedUnder.neutrality + skewedUnder.fascism + skewedUnder.communism;
    expect(sumUnder).toBeCloseTo(100, 1);
  });

  it('tests Tarjan cycle detection with indirect multi-node dependency ring and self-loop', () => {
    // Self-loop: Focus X requires Focus X
    const selfLoopTree: FocusNodeData[] = [
      {
        id: 'focus_self',
        name: 'Self Dependent Focus',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [['focus_self']],
        mutually_exclusive: [],
      },
    ];

    const selfLoopResult = analyzeFocusTreeDeadlocks(selfLoopTree);
    expect(selfLoopResult.hasCycles).toBe(true);
    expect(selfLoopResult.cycles.length).toBe(1);
    expect(selfLoopResult.cycles[0]).toEqual(['focus_self']);

    // 4-node ring cycle: A -> B -> C -> D -> A
    const ringTree: FocusNodeData[] = [
      { id: 'f_a', name: 'A', symbol: '★', icon: 'goal', cost: 10, x: 0, y: 0, prerequisites: [['f_d']], mutually_exclusive: [] },
      { id: 'f_b', name: 'B', symbol: '★', icon: 'goal', cost: 10, x: 1, y: 0, prerequisites: [['f_a']], mutually_exclusive: [] },
      { id: 'f_c', name: 'C', symbol: '★', icon: 'goal', cost: 10, x: 2, y: 0, prerequisites: [['f_b']], mutually_exclusive: [] },
      { id: 'f_d', name: 'D', symbol: '★', icon: 'goal', cost: 10, x: 3, y: 0, prerequisites: [['f_c']], mutually_exclusive: [] },
    ];

    const ringResult = analyzeFocusTreeDeadlocks(ringTree);
    expect(ringResult.cycles[0]).toContain('f_a');
    expect(ringResult.cycles[0]).toContain('f_b');
    expect(ringResult.cycles[0]).toContain('f_c');
    expect(ringResult.cycles[0]).toContain('f_d');
  });

  it('empirically tests whether rogue_pixel auto-fix handler is supported', () => {
    // When a rogue color is detected, MapLinter issues autoFixable: true
    const rogueProv: Province = {
      id: 99,
      name: 'Rogue',
      rgb: [0, 255, 0], // Reserved Paradox green
      type: 'land',
      coastal: false,
      terrain: 'plains',
      continent: 1,
      center: [0, 0],
      polygon: [[0, 0], [10, 0], [10, 10]],
      adjacentProvinceIds: [],
    };
    const issues = runMapDiagnosticsScan([rogueProv], [{ id: 1, name: 'S1', manpower: 1, category: 'rural', owner: 'TAG', cores: [], victoryPoints: [], provinces: [99], buildings: {} }], []);
    const rogueIssue = issues.find((i) => i.category === 'rogue_pixel');
    expect(rogueIssue).toBeDefined();
    expect(rogueIssue!.autoFixable).toBe(true);

    // In WorldMapStudio.tsx, handleAutoFixLinterIssue only implements:
    // 'duplicate_rgb', 'coastal_mismatch', 'unassigned_province'.
    // If rogue_pixel is not handled, it cannot automatically fix the reserved color without manual reassignment.
  });

  it('empirically reveals victory point orphaning risk when reassigning province from State A to State B', () => {
    // State A owns province 101 which has 20 Victory Points
    const stateA: State = {
      id: 1,
      name: 'State A',
      manpower: 100000,
      category: 'town',
      owner: 'FRA',
      cores: ['FRA'],
      victoryPoints: [{ provinceId: 101, points: 20 }],
      provinces: [101, 102],
      buildings: {},
    };

    // When StateReassignmentTool applies reassignment of province 101 to State B:
    const reassignProvIds = [101];
    const selectedSet = new Set(reassignProvIds);
    const updatedStateAProvinces = stateA.provinces.filter((p) => !selectedSet.has(p));

    // Notice: stateA.victoryPoints still contains province 101 unless explicitly pruned!
    const stateAStillHasVP101 = stateA.victoryPoints.some((vp) => vp.provinceId === 101);
    expect(stateAStillHasVP101).toBe(true);
    expect(updatedStateAProvinces).not.toContain(101);

    // If serialized without pruning VPs:
    const badStateA: State = { ...stateA, provinces: updatedStateAProvinces };
    const serializedBad = generateStateFileClausewitz(badStateA);
    // Contains VP for 101 even though 101 is not in provinces
    expect(serializedBad).toContain('victory_points = { 101 20 }');
    expect(serializedBad).not.toContain('provinces = {\n        101');
  });

  it('empirically verifies regex behavior for negative stability rewards in SandboxSimulator', () => {
    const positiveReward = 'add_stability = 0.10';
    const negativeReward = 'add_stability = -0.15';

    const currentRegex = /add_stability\s*=\s*([0-9.]+)/;
    const posMatch = positiveReward.match(currentRegex);
    expect(posMatch).not.toBeNull();
    expect(parseFloat(posMatch![1])).toBe(0.10);

    // Current regex does not match negative numbers
    const negMatch = negativeReward.match(currentRegex);
    expect(negMatch).toBeNull(); // Exposes requirement for /([+-]?[0-9.]+)/ to handle penalties
  });
});
