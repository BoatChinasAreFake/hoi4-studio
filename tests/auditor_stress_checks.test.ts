import { describe, it, expect } from 'vitest';
import { isPointInPolygon } from '../src/components/map/MapCanvas';
import { splitPolygonByLine, calculatePolygonCenter, generateUniqueRGB } from '../src/components/map/ProvinceSlicer';
import { rasterizeLineBresenham, prune2x2Blocks, find2x2Clusters, rasterizeRiverPolyline } from '../src/utils/riverRasterizer';
import { runMapDiagnosticsScan } from '../src/components/map/MapLinter';
import { analyzeFocusTreeDeadlocks } from '../src/utils/tarjanDeadlockSolver';
import { verifySupplyConnectivity } from '../src/components/map/RailwayNetworkBuilder';
import { formatHoi4Date } from '../src/components/simulation/SandboxSimulator';
import type { Province, State, RiverPath, Railway, SupplyNode } from '../src/types/map';
import type { FocusNodeData } from '../src/types/focus';

describe('Auditor Forensic Check: Ray-Casting Point-in-Polygon', () => {
  // U-shaped concave polygon
  // (0,0) ---- (30,0)
  //   |          |
  // (0,30)    (30,30)
  //   |   (10,10)-(20,10)
  //   |     |       |
  // (0,30)-(10,30) (20,30)-(30,30)
  const uShape: [number, number][] = [
    [0, 0],
    [30, 0],
    [30, 30],
    [20, 30],
    [20, 10],
    [10, 10],
    [10, 30],
    [0, 30],
  ];

  it('correctly classifies interior points of concave U-shape', () => {
    expect(isPointInPolygon(5, 5, uShape)).toBe(true);  // Left arm
    expect(isPointInPolygon(25, 5, uShape)).toBe(true); // Right arm
    expect(isPointInPolygon(15, 5, uShape)).toBe(true); // Base connecting arm
    expect(isPointInPolygon(5, 20, uShape)).toBe(true); // Left prong
    expect(isPointInPolygon(25, 20, uShape)).toBe(true);// Right prong
  });

  it('correctly classifies exterior pocket cavity of concave U-shape as OUTSIDE', () => {
    // The cavity between the two prongs (10 < x < 20, 10 < y <= 30)
    expect(isPointInPolygon(15, 20, uShape)).toBe(false);
    expect(isPointInPolygon(15, 25, uShape)).toBe(false);
    expect(isPointInPolygon(15, 12, uShape)).toBe(false);
  });

  it('correctly classifies far outside points', () => {
    expect(isPointInPolygon(-10, 15, uShape)).toBe(false);
    expect(isPointInPolygon(40, 15, uShape)).toBe(false);
    expect(isPointInPolygon(15, -10, uShape)).toBe(false);
    expect(isPointInPolygon(15, 40, uShape)).toBe(false);
  });
});

describe('Auditor Forensic Check: Bresenham Line & Extreme Angles', () => {
  it('handles degenerate 0-length line (point)', () => {
    const pt = rasterizeLineBresenham(10, 10, 10, 10);
    expect(pt).toEqual([[10, 10]]);
  });

  it('handles purely horizontal line in both directions', () => {
    const fwd = rasterizeLineBresenham(0, 5, 5, 5);
    expect(fwd).toEqual([[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]]);

    const rev = rasterizeLineBresenham(5, 5, 0, 5);
    expect(rev).toEqual([[5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]]);
  });

  it('handles purely vertical line in both directions', () => {
    const down = rasterizeLineBresenham(3, 0, 3, 4);
    expect(down).toEqual([[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]]);

    const up = rasterizeLineBresenham(3, 4, 3, 0);
    expect(up).toEqual([[3, 4], [3, 3], [3, 2], [3, 1], [3, 0]]);
  });

  it('handles steep negative slope (-3:1)', () => {
    const steep = rasterizeLineBresenham(0, 9, 3, 0);
    expect(steep.length).toBe(10);
    expect(steep[0]).toEqual([0, 9]);
    expect(steep[steep.length - 1]).toEqual([3, 0]);
  });
});

describe('Auditor Forensic Check: Slicer Edge Crossings & Centroid', () => {
  it('accurately divides polygon into two valid halves and updates centroid', () => {
    const box: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];

    // Horizontal cut line at y = 50
    const [top, bottom] = splitPolygonByLine(box, [-10, 50], [110, 50]);
    expect(top.length).toBeGreaterThanOrEqual(4);
    expect(bottom.length).toBeGreaterThanOrEqual(4);

    const cTop = calculatePolygonCenter(top);
    const cBottom = calculatePolygonCenter(bottom);
    expect(cTop[1]).toBeGreaterThanOrEqual(50);
    expect(cBottom[1]).toBeLessThanOrEqual(50);
  });
});

describe('Auditor Forensic Check: Leap Year & Date Progression', () => {
  it('correctly handles 1936 leap year February 29th and year rollover', () => {
    // 1936 is a leap year (Feb has 29 days)
    // Jan 1 = day 0
    // Jan has 31 days -> Jan 31 is day 30, Feb 1 is day 31
    expect(formatHoi4Date(31)).toBe('1936.2.1.12');
    // Feb 29 is day 31 + 28 = 59
    expect(formatHoi4Date(59)).toBe('1936.2.29.12');
    // March 1 is day 60
    expect(formatHoi4Date(60)).toBe('1936.3.1.12');
    // Dec 31 is day 365
    expect(formatHoi4Date(365)).toBe('1936.12.31.12');
    // Jan 1 1937 is day 366
    expect(formatHoi4Date(366)).toBe('1937.1.1.12');
  });
});

describe('Auditor Forensic Check: Low-Level Map Linter Diagnostics Engine', () => {
  it('flags all categories of errors simultaneously without masking', () => {
    const provs: Province[] = [
      {
        id: 1,
        name: 'Normal Sea',
        rgb: [10, 20, 30],
        type: 'sea',
        coastal: true,
        terrain: 'ocean',
        continent: 0,
        center: [0, 0],
        polygon: [[0, 0], [10, 0], [10, 10]],
        adjacentProvinceIds: [2, 3],
      },
      {
        id: 2,
        name: 'Inland False Coastal',
        rgb: [40, 50, 60],
        type: 'land',
        coastal: true, // Marked coastal, but touches no sea! (adjacent to 4 only)
        terrain: 'plains',
        continent: 1,
        center: [20, 20],
        polygon: [[20, 20], [30, 20], [30, 30]],
        adjacentProvinceIds: [4],
      },
      {
        id: 3,
        name: 'Duplicate RGB 1',
        rgb: [100, 100, 100],
        type: 'land',
        coastal: false,
        terrain: 'hills',
        continent: 1,
        center: [50, 50],
        polygon: [[50, 50], [60, 50], [60, 60]],
        adjacentProvinceIds: [1],
      },
      {
        id: 4,
        name: 'Duplicate RGB 2',
        rgb: [100, 100, 100], // Duplicate of Prov 3!
        type: 'land',
        coastal: false,
        terrain: 'hills',
        continent: 1,
        center: [70, 70],
        polygon: [[70, 70], [80, 70], [80, 80]],
        adjacentProvinceIds: [2],
      },
      {
        id: 5,
        name: 'Rogue River Mouth RGB',
        rgb: [255, 0, 0], // Reserved mouth!
        type: 'land',
        coastal: false,
        terrain: 'mountain',
        continent: 1,
        center: [90, 90],
        polygon: [[90, 90], [100, 90], [100, 100]],
        adjacentProvinceIds: [],
      },
      {
        id: 6,
        name: 'Unassigned Province',
        rgb: [110, 120, 130],
        type: 'land',
        coastal: false,
        terrain: 'plains',
        continent: 1,
        center: [120, 120],
        polygon: [[120, 120], [130, 120], [130, 130]],
        adjacentProvinceIds: [],
      },
    ];

    const states: State[] = [
      {
        id: 1,
        name: 'State 1',
        manpower: 1000,
        category: 'town',
        owner: 'FRA',
        cores: ['FRA'],
        victoryPoints: [],
        provinces: [2, 3, 4, 5], // Prov 6 is missing!
        buildings: {},
      },
    ];

    const rivers: RiverPath[] = [
      {
        id: 'r_broken',
        name: 'Broken River',
        level: 2,
        points: [[0, 0], [10, 10]],
        pixels: [[0, 0], [1, 1]],
        valid1px: false, // River bottleneck violation!
        violations: ['Illegal 2x2 cluster'],
      },
    ];

    const issues = runMapDiagnosticsScan(provs, states, rivers);

    // Verify all 5 categories are reported
    const categories = new Set(issues.map((i) => i.category));
    expect(categories.has('duplicate_rgb')).toBe(true);
    expect(categories.has('rogue_pixel')).toBe(true);
    expect(categories.has('coastal_mismatch')).toBe(true);
    expect(categories.has('river_bottleneck')).toBe(true);
    expect(categories.has('unassigned_province')).toBe(true);
  });
});
