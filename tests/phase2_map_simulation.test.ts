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
  generateBuildingsTxt,
  generateUnitStacksTxt,
} from '../src/components/map/PositionsPinPlacer';
import {
  verifySupplyConnectivity,
  generateRailwaysTxt,
  generateSupplyNodesTxt,
} from '../src/components/map/RailwayNetworkBuilder';
import { runMapDiagnosticsScan } from '../src/components/map/MapLinter';
import { formatHoi4Date } from '../src/components/simulation/SandboxSimulator';
import { analyzeFocusTreeDeadlocks } from '../src/utils/tarjanDeadlockSolver';
import type { Province, State, RiverPath, MapPositionPin, Railway, SupplyNode } from '../src/types/map';
import type { FocusNodeData } from '../src/types/focus';

describe('Phase 2: 2D Vector Map Canvas & Polygon Geometry', () => {
  it('correctly tests point in polygon with ray casting', () => {
    const square: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];

    expect(isPointInPolygon(50, 50, square)).toBe(true);
    expect(isPointInPolygon(10, 10, square)).toBe(true);
    expect(isPointInPolygon(150, 50, square)).toBe(false);
    expect(isPointInPolygon(-10, 50, square)).toBe(false);
  });

  it('calculates polygon centroid accurately', () => {
    const triangle: [number, number][] = [
      [0, 0],
      [60, 0],
      [30, 60],
    ];
    const center = calculatePolygonCenter(triangle);
    expect(center[0]).toBe(30);
    expect(center[1]).toBe(20);
  });
});

describe('Phase 2: Province Slicer & Unique RGB Generator', () => {
  it('generates guaranteed-unique 24-bit RGB avoiding collisions and reserved Paradox colors', () => {
    const existing: [number, number, number][] = [
      [100, 150, 200],
      [101, 150, 200],
    ];

    const generated = generateUniqueRGB(existing);

    expect(generated.length).toBe(3);
    // Must not be any of the existing colors
    expect(existing.some(([r, g, b]) => r === generated[0] && g === generated[1] && b === generated[2])).toBe(false);

    // Reserved Paradox colors
    expect(generated).not.toEqual([0, 0, 0]);       // Void / boundary
    expect(generated).not.toEqual([0, 255, 0]);     // River source
    expect(generated).not.toEqual([255, 0, 0]);     // River mouth
    expect(generated).not.toEqual([255, 252, 0]);   // River flow
  });

  it('splits polygon along cut line into two valid sub-polygons', () => {
    const rectangle: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 50],
      [0, 50],
    ];
    // Vertical cut line at x = 50
    const [partA, partB] = splitPolygonByLine(rectangle, [50, -10], [50, 60]);

    expect(partA.length).toBeGreaterThanOrEqual(3);
    expect(partB.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Phase 2: Smart 1px Vector River Pencil', () => {
  it('rasterizes lines with Bresenham algorithm', () => {
    const line = rasterizeLineBresenham(0, 0, 4, 4);
    expect(line).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it('detects and prunes 2x2 contiguous river pixel clusters', () => {
    const rawCluster: [number, number][] = [
      [10, 10],
      [11, 10],
      [10, 11],
      [11, 11],
      [12, 12],
    ];

    const keySet = new Set(rawCluster.map(([x, y]) => `${x},${y}`));
    const detected = find2x2Clusters(keySet);
    expect(detected.length).toBeGreaterThan(0);

    const pruned = prune2x2Blocks(rawCluster);
    const prunedKeySet = new Set(pruned.map(([x, y]) => `${x},${y}`));
    expect(find2x2Clusters(prunedKeySet).length).toBe(0);
  });

  it('enforces green source (0, 255, 0) and red mouth (255, 0, 0) on river polyline', () => {
    const points: [number, number][] = [
      [10, 10],
      [20, 30],
      [30, 60],
    ];

    const result = rasterizeRiverPolyline(points, 2);

    expect(result.valid1px).toBe(true);
    expect(result.coloredPixels.length).toBeGreaterThanOrEqual(3);

    // Source is green
    expect(result.coloredPixels[0].rgb).toEqual([0, 255, 0]);
    expect(result.coloredPixels[0].type).toBe('source');

    // Mouth is red
    const last = result.coloredPixels[result.coloredPixels.length - 1];
    expect(last.rgb).toEqual([255, 0, 0]);
    expect(last.type).toBe('mouth');

    // Body pixels are size level 2 (0, 200, 255)
    expect(result.coloredPixels[1].rgb).toEqual([0, 200, 255]);
  });
});

describe('Phase 2: State Reassignment & Positions Pin Placer', () => {
  it('generates compliant Clausewitz history/states/*.txt files', () => {
    const testState: State = {
      id: 42,
      name: 'Provence',
      manpower: 1250000,
      category: 'city',
      owner: 'FRA',
      cores: ['FRA'],
      victoryPoints: [{ provinceId: 101, points: 20 }],
      provinces: [101, 102, 103],
      buildings: {
        infrastructure: 4,
        industrial_complex: 3,
        arms_factory: 2,
        naval_bases: { 101: 5 },
      },
    };

    const script = generateStateFileClausewitz(testState);
    expect(script).toContain('id = 42');
    expect(script).toContain('state_category = city');
    expect(script).toContain('owner = FRA');
    expect(script).toContain('add_core_of = FRA');
    expect(script).toContain('provinces = {');
    expect(script).toContain('101 102 103');
    expect(script).toContain('infrastructure = 4');
    expect(script).toContain('101 = { naval_base = 5 }');
  });

  it('generates buildings.txt and unitstacks.txt records', () => {
    const pins: MapPositionPin[] = [
      {
        id: 'p1',
        type: 'city',
        provinceId: 101,
        x: 140,
        y: 12.0,
        z: 280,
        rotation: 0.25,
      },
      {
        id: 'p2',
        type: 'port',
        provinceId: 102,
        x: 230,
        y: 9.8,
        z: 320,
        rotation: 1.57,
        connectingSeaProv: 901,
      },
      {
        id: 'p3',
        type: 'unit_stack',
        provinceId: 301,
        x: 420,
        y: 10.2,
        z: 270,
        rotation: 0.8,
        scale: 0.3,
      },
    ];

    const buildings = generateBuildingsTxt(pins);
    expect(buildings).toContain('101;arms_factory;140.00;12.00;280.00;0.25;0');
    expect(buildings).toContain('102;naval_base_spawn;230.00;9.80;320.00;1.57;901');

    const unitstacks = generateUnitStacksTxt(pins);
    expect(unitstacks).toContain('301;0;420.00;10.20;270.00;0.80;0.30');
  });
});

describe('Phase 2: Railway & Supply Hub Network Builder', () => {
  it('correctly verifies supply connectivity to capital using BFS graph traversal', () => {
    const railways: Railway[] = [
      { id: 'r1', level: 3, provinces: [1, 2, 3] },
      { id: 'r2', level: 2, provinces: [3, 4] },
      { id: 'r3', level: 1, provinces: [10, 11] }, // Disconnected cluster
    ];

    const supplyNodes: SupplyNode[] = [
      { id: 'n1', provinceId: 2, level: 2 },
      { id: 'n2', provinceId: 4, level: 3 },
      { id: 'n3', provinceId: 11, level: 1 }, // Disconnected
    ];

    const report = verifySupplyConnectivity(1, railways, supplyNodes);

    expect(report.capitalProvinceId).toBe(1);
    expect(report.connectedSupplyNodes).toContain(2);
    expect(report.connectedSupplyNodes).toContain(4);
    expect(report.disconnectedSupplyNodes).toContain(11);
    expect(report.disconnectedSupplyNodes.length).toBe(1);
  });

  it('generates railways.txt and supply_nodes.txt file format', () => {
    const railways: Railway[] = [
      { id: 'r1', level: 3, provinces: [6521, 11444, 3312] },
    ];
    const nodes: SupplyNode[] = [
      { id: 's1', provinceId: 67, level: 1 },
    ];

    expect(generateRailwaysTxt(railways)).toBe('3 3 6521 11444 3312');
    expect(generateSupplyNodesTxt(nodes)).toBe('1 67');
  });
});

describe('Phase 2: Low-Level Map Linter', () => {
  it('identifies duplicate RGBs, rogue colors, and unassigned provinces', () => {
    const testProvinces: Province[] = [
      {
        id: 1,
        name: 'Prov1',
        rgb: [100, 100, 100],
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [0, 0],
        polygon: [[0, 0], [10, 0], [10, 10]],
        adjacentProvinceIds: [2],
      },
      {
        id: 2,
        name: 'Prov2',
        rgb: [100, 100, 100], // Duplicate RGB!
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [20, 20],
        polygon: [[20, 20], [30, 20], [30, 30]],
        adjacentProvinceIds: [1],
      },
      {
        id: 3,
        name: 'Prov3',
        rgb: [0, 255, 0], // Rogue reserved color (river source)!
        type: 'land',
        coastal: false,
        terrain: 'mountain',
        continent: 1,
        center: [40, 40],
        polygon: [[40, 40], [50, 40], [50, 50]],
        adjacentProvinceIds: [],
      },
    ];

    const testStates: State[] = [
      {
        id: 1,
        name: 'State1',
        manpower: 1000,
        category: 'town',
        owner: 'FRA',
        cores: ['FRA'],
        victoryPoints: [],
        provinces: [1, 2], // Province 3 is unassigned!
        buildings: {},
      },
    ];

    const testRivers: RiverPath[] = [];

    const issues = runMapDiagnosticsScan(testProvinces, testStates, testRivers);

    expect(issues.some((i) => i.category === 'duplicate_rgb')).toBe(true);
    expect(issues.some((i) => i.category === 'rogue_pixel')).toBe(true);
    expect(issues.some((i) => i.category === 'unassigned_province' && i.location?.provinceId === 3)).toBe(true);
  });
});

describe('Phase 2: Game Logic Sandbox & Tarjan SCC Deadlock Solver', () => {
  it('formats HOI4 dates accurately across day ticks', () => {
    expect(formatHoi4Date(0)).toBe('1936.1.1.12');
    expect(formatHoi4Date(31)).toBe('1936.2.1.12');
    expect(formatHoi4Date(365)).toBe('1936.12.31.12'); // 1936 is a leap year
    expect(formatHoi4Date(366)).toBe('1937.1.1.12');
  });

  it('detects dependency cycles using Tarjan strongly connected components', () => {
    const cyclicFocuses: FocusNodeData[] = [
      {
        id: 'focus_a',
        name: 'Focus A',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [['focus_b']],
        mutually_exclusive: [],
      },
      {
        id: 'focus_b',
        name: 'Focus B',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 2,
        prerequisites: [['focus_a']], // A -> B -> A cycle!
        mutually_exclusive: [],
      },
    ];

    const result = analyzeFocusTreeDeadlocks(cyclicFocuses);
    expect(result.hasCycles).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.cycles[0]).toContain('focus_a');
    expect(result.cycles[0]).toContain('focus_b');
  });

  it('detects mutual exclusion prerequisite deadlocks', () => {
    const deadlockedFocuses: FocusNodeData[] = [
      {
        id: 'root_focus',
        name: 'Root',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [],
        mutually_exclusive: [],
      },
      {
        id: 'branch_a',
        name: 'Branch A',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 2,
        prerequisites: [['root_focus']],
        mutually_exclusive: ['branch_b'],
      },
      {
        id: 'branch_b',
        name: 'Branch B',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 2,
        y: 4,
        prerequisites: [['branch_a']], // Requires branch_a, but mutually exclusive with it!
        mutually_exclusive: ['branch_a'],
      },
    ];

    const result = analyzeFocusTreeDeadlocks(deadlockedFocuses);
    expect(result.hasMutualExclusionDeadlocks).toBe(true);
    expect(result.mutualExclusions.length).toBeGreaterThan(0);
  });
});
