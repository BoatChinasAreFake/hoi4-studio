import { describe, it, expect } from 'vitest';
import {
  rasterizeLineBresenham,
  find2x2Clusters,
  prune2x2Blocks,
  rasterizeRiverPolyline,
} from '../src/utils/riverRasterizer';
import { generateUniqueRGB } from '../src/components/map/ProvinceSlicer';
import { analyzeFocusTreeDeadlocks } from '../src/utils/tarjanDeadlockSolver';
import { verifySupplyConnectivity } from '../src/components/map/RailwayNetworkBuilder';
import type { Railway, SupplyNode } from '../src/types/map';
import type { FocusNodeData } from '../src/types/focus';

describe('Adversarial Test Suite 1: River Rasterizer 1px Guarantee', () => {
  it('handles self-intersecting loops and figure-8 paths with 0 2x2 blocks', () => {
    // Figure-8 crossing at (20, 20)
    const figure8: [number, number][] = [
      [10, 10],
      [30, 30],
      [30, 10],
      [10, 30],
      [20, 5],
    ];

    const result = rasterizeRiverPolyline(figure8, 1);
    const pixelKeys = new Set(result.pixels.map(([x, y]) => `${x},${y}`));
    const clusters = find2x2Clusters(pixelKeys);

    expect(clusters.length).toBe(0);
    expect(result.valid1px).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('handles extreme diagonal lines and sharp staircases with 0 2x2 blocks', () => {
    // Steep diagonal
    const steepDiag: [number, number][] = [
      [0, 0],
      [15, 100],
      [30, 0],
    ];
    const resSteep = rasterizeRiverPolyline(steepDiag, 2);
    const clustersSteep = find2x2Clusters(new Set(resSteep.pixels.map(([x, y]) => `${x},${y}`)));
    expect(clustersSteep.length).toBe(0);
    expect(resSteep.valid1px).toBe(true);

    // 45-degree long diagonal
    const diag45: [number, number][] = [
      [0, 0],
      [50, 50],
      [100, 0],
    ];
    const resDiag = rasterizeRiverPolyline(diag45, 1);
    const clustersDiag = find2x2Clusters(new Set(resDiag.pixels.map(([x, y]) => `${x},${y}`)));
    expect(clustersDiag.length).toBe(0);
    expect(resDiag.valid1px).toBe(true);
  });

  it('handles acute hairpin angles (<15 degrees) with 0 2x2 blocks', () => {
    // Sharp hairpin return
    const hairpin: [number, number][] = [
      [10, 10],
      [100, 100],
      [12, 13], // Sharp turn backward almost parallel
    ];

    const result = rasterizeRiverPolyline(hairpin, 3);
    const clusters = find2x2Clusters(new Set(result.pixels.map(([x, y]) => `${x},${y}`)));
    expect(clusters.length).toBe(0);
    expect(result.valid1px).toBe(true);
  });

  it('handles inward spiral and multi-bend serpentine paths with strict 1px enforcement', () => {
    // Inward spiral
    const spiral: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [10, 100],
      [10, 15],
      [85, 15],
      [85, 85],
      [25, 85],
      [25, 30],
      [70, 30],
    ];

    const result = rasterizeRiverPolyline(spiral, 4);
    const clusters = find2x2Clusters(new Set(result.pixels.map(([x, y]) => `${x},${y}`)));
    expect(clusters.length).toBe(0);
    expect(result.valid1px).toBe(true);
    expect(result.coloredPixels[0].rgb).toEqual([0, 255, 0]); // Source is green
    expect(result.coloredPixels[result.coloredPixels.length - 1].rgb).toEqual([255, 0, 0]); // Mouth is red
  });

  it('handles high-frequency oscillating saw-tooth pattern without 2x2 bottlenecks', () => {
    const sawtooth: [number, number][] = [];
    for (let i = 0; i < 20; i++) {
      sawtooth.push([i * 10, (i % 2 === 0 ? 0 : 30)]);
    }

    const result = rasterizeRiverPolyline(sawtooth, 1);
    const clusters = find2x2Clusters(new Set(result.pixels.map(([x, y]) => `${x},${y}`)));
    expect(clusters.length).toBe(0);
    expect(result.valid1px).toBe(true);
  });

  it('protects endpoints while eliminating artificial 2x2 dense clusters', () => {
    // Artificial 2x2 cluster with leading and trailing path
    const syntheticPoints: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [2, 3],
      [3, 2],
      [3, 3], // [2,2], [3,2], [2,3], [3,3] forms 2x2
      [4, 4],
      [5, 5],
    ];

    const pruned = prune2x2Blocks(syntheticPoints);
    const clusters = find2x2Clusters(new Set(pruned.map(([x, y]) => `${x},${y}`)));
    expect(clusters.length).toBe(0);
    // Endpoints must be preserved
    expect(pruned[0]).toEqual([0, 0]);
    expect(pruned[pruned.length - 1]).toEqual([5, 5]);
  });

  it('stress tests 200 randomized complex polylines with zero 2x2 blocks remaining', () => {
    // Seeded pseudo-random generator for deterministic repeatability
    let seed = 123456789;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let testIdx = 0; testIdx < 200; testIdx++) {
      const numPoints = Math.floor(rng() * 15) + 5;
      const points: [number, number][] = [];
      let curX = Math.floor(rng() * 200);
      let curY = Math.floor(rng() * 200);
      points.push([curX, curY]);

      for (let p = 1; p < numPoints; p++) {
        // Generate random steps including acute angles and self-intersections
        const dx = Math.floor(rng() * 60) - 30;
        const dy = Math.floor(rng() * 60) - 30;
        curX += dx;
        curY += dy;
        points.push([curX, curY]);
      }

      const result = rasterizeRiverPolyline(points, 1);
      const pixelSet = new Set(result.pixels.map(([x, y]) => `${x},${y}`));
      const remainingClusters = find2x2Clusters(pixelSet);

      expect(remainingClusters.length).toBe(0);
      expect(result.valid1px).toBe(true);
      expect(result.violations.length).toBe(0);
    }
  });
});

describe('Adversarial Test Suite 2: Unique RGB Generator Stress & Collision Testing', () => {
  it('generates 3,000 consecutive unique province colors with 100% collision-free guarantee', () => {
    const existing: [number, number, number][] = [];
    const colorSet = new Set<string>();

    for (let i = 0; i < 3000; i++) {
      const rgb = generateUniqueRGB(existing);
      const key = `${rgb[0]},${rgb[1]},${rgb[2]}`;

      // 1. Must never collide with previously generated colors
      expect(colorSet.has(key)).toBe(false);
      colorSet.add(key);
      existing.push(rgb);

      // 2. Must never match any reserved Paradox color
      expect(rgb).not.toEqual([0, 0, 0]);       // Void / boundary
      expect(rgb).not.toEqual([0, 255, 0]);     // River source
      expect(rgb).not.toEqual([255, 0, 0]);     // River mouth
      expect(rgb).not.toEqual([255, 252, 0]);   // River flow indicator

      // 3. Channels must be valid byte integers
      expect(rgb[0]).toBeGreaterThanOrEqual(0);
      expect(rgb[0]).toBeLessThanOrEqual(255);
      expect(rgb[1]).toBeGreaterThanOrEqual(0);
      expect(rgb[1]).toBeLessThanOrEqual(255);
      expect(rgb[2]).toBeGreaterThanOrEqual(0);
      expect(rgb[2]).toBeLessThanOrEqual(255);
    }

    expect(colorSet.size).toBe(3000);
  });

  it('allocates collision-free colors in a densely occupied color space (10,000 existing colors)', () => {
    // Generate 10,000 synthetic existing colors
    const denseColors: [number, number, number][] = [];
    const denseSet = new Set<string>();

    for (let i = 0; i < 10000; i++) {
      const r = (i * 7) % 256;
      const g = (i * 13) % 256;
      const b = (i * 17) % 256;
      const key = `${r},${g},${b}`;
      if (!denseSet.has(key)) {
        denseSet.add(key);
        denseColors.push([r, g, b]);
      }
    }

    // Allocate 100 new colors against the dense dataset
    for (let j = 0; j < 100; j++) {
      const newRgb = generateUniqueRGB(denseColors);
      const key = `${newRgb[0]},${newRgb[1]},${newRgb[2]}`;
      expect(denseSet.has(key)).toBe(false);
      expect(newRgb).not.toEqual([0, 0, 0]);
      expect(newRgb).not.toEqual([0, 255, 0]);
      expect(newRgb).not.toEqual([255, 0, 0]);
      expect(newRgb).not.toEqual([255, 252, 0]);
      denseSet.add(key);
      denseColors.push(newRgb);
    }
  });
});

describe('Adversarial Test Suite 3: Tarjan Deadlock Solver Under Hostile Graphs', () => {
  it('detects 2-node cycles, 3-node cycles, and self-referential loops', () => {
    // Self-referential loop
    const selfLoop: FocusNodeData[] = [
      {
        id: 'self_focus',
        name: 'Self',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [['self_focus']],
        mutually_exclusive: [],
      },
    ];
    const selfRes = analyzeFocusTreeDeadlocks(selfLoop);
    expect(selfRes.hasCycles).toBe(true);
    expect(selfRes.cycles.length).toBe(1);
    expect(selfRes.cycles[0]).toEqual(['self_focus']);

    // 3-node cycle (A -> B -> C -> A)
    const triCycle: FocusNodeData[] = [
      {
        id: 'tri_a',
        name: 'A',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [['tri_c']],
        mutually_exclusive: [],
      },
      {
        id: 'tri_b',
        name: 'B',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 2,
        prerequisites: [['tri_a']],
        mutually_exclusive: [],
      },
      {
        id: 'tri_c',
        name: 'C',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 4,
        prerequisites: [['tri_b']],
        mutually_exclusive: [],
      },
    ];
    const triRes = analyzeFocusTreeDeadlocks(triCycle);
    expect(triRes.hasCycles).toBe(true);
    expect(triRes.cycles.length).toBe(1);
    expect(triRes.cycles[0].sort()).toEqual(['tri_a', 'tri_b', 'tri_c'].sort());
    // Since it's a closed cycle with no root, all nodes must be flagged as unreachable
    expect(triRes.unreachableFocuses.sort()).toEqual(['tri_a', 'tri_b', 'tri_c'].sort());
  });

  it('detects interlocking multiple cycles in a complex graph', () => {
    // Cycle 1: A -> B -> A
    // Cycle 2: B -> C -> D -> B (shares B)
    const complexCycles: FocusNodeData[] = [
      {
        id: 'node_a',
        name: 'Node A',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [['node_b']],
        mutually_exclusive: [],
      },
      {
        id: 'node_b',
        name: 'Node B',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 2,
        prerequisites: [['node_a'], ['node_d']],
        mutually_exclusive: [],
      },
      {
        id: 'node_c',
        name: 'Node C',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 2,
        y: 2,
        prerequisites: [['node_b']],
        mutually_exclusive: [],
      },
      {
        id: 'node_d',
        name: 'Node D',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 2,
        y: 4,
        prerequisites: [['node_c']],
        mutually_exclusive: [],
      },
    ];

    const res = analyzeFocusTreeDeadlocks(complexCycles);
    expect(res.hasCycles).toBe(true);
    // All 4 nodes belong to the strongly connected component
    expect(res.cycles.length).toBeGreaterThanOrEqual(1);
    const allCycleNodes = res.cycles.flat();
    expect(allCycleNodes).toContain('node_a');
    expect(allCycleNodes).toContain('node_b');
    expect(allCycleNodes).toContain('node_c');
    expect(allCycleNodes).toContain('node_d');
  });

  it('handles transitive mutual exclusion locks and AND-group exclusions', () => {
    // Transitive chain: Root -> A -> B -> C, where C is mutually exclusive with A
    const chainExcl: FocusNodeData[] = [
      {
        id: 'root',
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
        id: 'focus_a',
        name: 'Focus A',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 2,
        prerequisites: [['root']],
        mutually_exclusive: ['focus_c'],
      },
      {
        id: 'focus_b',
        name: 'Focus B',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 4,
        prerequisites: [['focus_a']],
        mutually_exclusive: [],
      },
      {
        id: 'focus_c',
        name: 'Focus C',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 6,
        prerequisites: [['focus_b']],
        mutually_exclusive: ['focus_a'],
      },
    ];

    const resChain = analyzeFocusTreeDeadlocks(chainExcl);
    expect(resChain.hasMutualExclusionDeadlocks).toBe(true);
    expect(resChain.mutualExclusions.length).toBeGreaterThanOrEqual(1);
    expect(
      resChain.mutualExclusions.some(
        (m) =>
          (m.focusA === 'focus_a' && m.focusB === 'focus_c') ||
          (m.focusA === 'focus_c' && m.focusB === 'focus_a')
      )
    ).toBe(true);

    // AND-group mutual exclusion: child requires both X and Y in the same prerequisite group
    const andGroupExcl: FocusNodeData[] = [
      {
        id: 'par_x',
        name: 'Parent X',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [],
        mutually_exclusive: ['par_y'],
      },
      {
        id: 'par_y',
        name: 'Parent Y',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 2,
        y: 0,
        prerequisites: [],
        mutually_exclusive: ['par_x'],
      },
      {
        id: 'child_z',
        name: 'Child Z',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 1,
        y: 2,
        prerequisites: [['par_x', 'par_y']], // Requires BOTH, but they exclude each other
        mutually_exclusive: [],
      },
    ];

    const resAnd = analyzeFocusTreeDeadlocks(andGroupExcl);
    expect(resAnd.hasMutualExclusionDeadlocks).toBe(true);
    expect(
      resAnd.mutualExclusions.some(
        (m) => m.reason.includes('Child Z') || m.reason.includes('same prerequisite group')
      )
    ).toBe(true);
  });

  it('handles disconnected island branches and orphan prerequisites gracefully', () => {
    // Focus referencing non-existent parent
    const orphanFocus: FocusNodeData[] = [
      {
        id: 'orphan_node',
        name: 'Orphan',
        symbol: '★',
        icon: 'goal',
        cost: 10,
        x: 0,
        y: 0,
        prerequisites: [['non_existent_parent_999']],
        mutually_exclusive: [],
      },
    ];

    // Must not throw exception
    expect(() => analyzeFocusTreeDeadlocks(orphanFocus)).not.toThrow();
    const res = analyzeFocusTreeDeadlocks(orphanFocus);
    expect(res.hasCycles).toBe(false);
  });
});

describe('Adversarial Test Suite 4: Railway BFS Connectivity Under Complex Topologies', () => {
  it('correctly isolates disconnected islands and dead ends', () => {
    const capital = 1;

    // Island 1 (Capital network)
    // 1 -> 2 -> 3 -> 4
    const railways: Railway[] = [
      { id: 'r1', level: 3, provinces: [1, 2, 3] },
      { id: 'r2', level: 2, provinces: [3, 4] },
      // Island 2 (Disconnected overseas network)
      { id: 'r3', level: 5, provinces: [100, 101, 102, 103] },
      { id: 'r4', level: 4, provinces: [103, 104] },
      // Island 3 (Isolated loop)
      { id: 'r5', level: 1, provinces: [200, 201, 202, 200] },
    ];

    const supplyNodes: SupplyNode[] = [
      { id: 'sn_cap', provinceId: 1, level: 5 },    // Capital itself
      { id: 'sn_2', provinceId: 2, level: 3 },      // Connected
      { id: 'sn_4', provinceId: 4, level: 2 },      // Connected at dead end
      { id: 'sn_101', provinceId: 101, level: 4 },  // Disconnected (island 2)
      { id: 'sn_104', provinceId: 104, level: 1 },  // Disconnected (island 2)
      { id: 'sn_201', provinceId: 201, level: 1 },  // Disconnected (island 3)
      { id: 'sn_orphan', provinceId: 999, level: 1 }, // Disconnected node with no rails
    ];

    const report = verifySupplyConnectivity(capital, railways, supplyNodes);

    expect(report.connectedSupplyNodes.sort()).toEqual([1, 2, 4].sort());
    expect(report.disconnectedSupplyNodes.sort()).toEqual([101, 104, 201, 999].sort());
    expect(report.allReachableProvinces.has(1)).toBe(true);
    expect(report.allReachableProvinces.has(4)).toBe(true);
    expect(report.allReachableProvinces.has(100)).toBe(false);
    expect(report.allReachableProvinces.has(200)).toBe(false);
  });

  it('handles redundant multi-ring railway grids and cyclic track loops without infinite recursion', () => {
    // 2x2 grid network with diagonal cross connections
    // 1 -- 2 -- 3
    // |  X |  X |
    // 4 -- 5 -- 6
    const railways: Railway[] = [
      { id: 'h1', level: 2, provinces: [1, 2, 3] },
      { id: 'h2', level: 2, provinces: [4, 5, 6] },
      { id: 'v1', level: 2, provinces: [1, 4] },
      { id: 'v2', level: 2, provinces: [2, 5] },
      { id: 'v3', level: 2, provinces: [3, 6] },
      { id: 'd1', level: 1, provinces: [1, 5, 3] },
      { id: 'd2', level: 1, provinces: [4, 2, 6] },
    ];

    const supplyNodes: SupplyNode[] = [
      { id: 'sn_3', provinceId: 3, level: 2 },
      { id: 'sn_5', provinceId: 5, level: 3 },
      { id: 'sn_6', provinceId: 6, level: 1 },
    ];

    const report = verifySupplyConnectivity(1, railways, supplyNodes);

    expect(report.connectedSupplyNodes.length).toBe(3);
    expect(report.disconnectedSupplyNodes.length).toBe(0);
    expect(report.allReachableProvinces.size).toBe(6);
  });

  it('handles linear chain of 500 provinces with a single bottleneck severance', () => {
    const chainLength = 500;
    const breakPoint = 250;

    // Chain 1..250 is connected to capital 1
    // Chain 251..500 is severed
    const partA: number[] = [];
    for (let i = 1; i <= breakPoint; i++) partA.push(i);

    const partB: number[] = [];
    for (let i = breakPoint + 1; i <= chainLength; i++) partB.push(i);

    const railways: Railway[] = [
      { id: 'part_a', level: 3, provinces: partA },
      { id: 'part_b', level: 3, provinces: partB },
    ];

    const supplyNodes: SupplyNode[] = [
      { id: 'sn_near', provinceId: 100, level: 2 },
      { id: 'sn_mid', provinceId: 250, level: 2 },
      { id: 'sn_severed_start', provinceId: 251, level: 2 },
      { id: 'sn_severed_end', provinceId: 500, level: 2 },
    ];

    const report = verifySupplyConnectivity(1, railways, supplyNodes);

    expect(report.connectedSupplyNodes.sort()).toEqual([100, 250].sort());
    expect(report.disconnectedSupplyNodes.sort()).toEqual([251, 500].sort());
  });

  it('handles isolated capital with no connected railways', () => {
    const railways: Railway[] = [
      { id: 'r1', level: 2, provinces: [10, 11, 12] },
    ];

    const supplyNodes: SupplyNode[] = [
      { id: 'sn_cap', provinceId: 1, level: 5 },
      { id: 'sn_11', provinceId: 11, level: 2 },
    ];

    const report = verifySupplyConnectivity(1, railways, supplyNodes);

    // Capital itself is always reachable as origin
    expect(report.connectedSupplyNodes).toEqual([1]);
    expect(report.disconnectedSupplyNodes).toEqual([11]);
  });
});
