export type ProvinceType = 'land' | 'sea' | 'lake';

export type TerrainType =
  | 'plains'
  | 'forest'
  | 'hills'
  | 'mountain'
  | 'urban'
  | 'jungle'
  | 'marsh'
  | 'desert'
  | 'ocean'
  | 'lakes';

export interface Province {
  id: number;
  name: string;
  rgb: [number, number, number];
  type: ProvinceType;
  coastal: boolean;
  terrain: TerrainType;
  continent: number;
  stateId?: number;
  polygon: [number, number][]; // Scaled 2D vector coordinates [x, y]
  center: [number, number];
  adjacentProvinceIds: number[];
}

export type StateCategory =
  | 'wasteland'
  | 'enclave'
  | 'tiny_island'
  | 'pastoral'
  | 'rural'
  | 'town'
  | 'large_town'
  | 'city'
  | 'large_city'
  | 'metropolis'
  | 'megalopolis';

export interface StateBuildings {
  infrastructure?: number;
  industrial_complex?: number;
  arms_factory?: number;
  air_base?: number;
  naval_bases?: Record<number, number>; // provinceId -> level
  bunkers?: Record<number, number>;     // provinceId -> level
  coastal_bunkers?: Record<number, number>;
}

export interface State {
  id: number;
  name: string;
  manpower: number;
  category: StateCategory;
  owner: string; // TAG, e.g. "FRA", "ITA"
  cores: string[];
  victoryPoints: { provinceId: number; points: number }[];
  provinces: number[];
  buildings: StateBuildings;
}

export interface RiverPixel {
  x: number;
  y: number;
  type: 'source' | 'flow' | 'mouth' | 'narrow' | 'medium' | 'large' | 'estuary';
  rgb: [number, number, number];
}

export interface RiverPath {
  id: string;
  name: string;
  points: [number, number][]; // User control points
  pixels: [number, number][]; // 1px rasterized path
  level: 1 | 2 | 3 | 4;
  valid1px: boolean;
  violations: string[];
}

export interface MapPositionPin {
  id: string;
  type: 'city' | 'port' | 'victory_point' | 'unit_stack' | 'air_base' | 'naval_base';
  provinceId: number;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale?: number;
  connectingSeaProv?: number;
}

export interface Railway {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  provinces: number[];
}

export interface SupplyNode {
  id: string;
  provinceId: number;
  level: number;
}

export interface MapLinterIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category:
    | 'duplicate_rgb'
    | 'rogue_pixel'
    | 'river_bottleneck'
    | 'coastal_mismatch'
    | 'unassigned_province'
    | 'invalid_junction';
  title: string;
  description: string;
  location?: { x?: number; y?: number; provinceId?: number };
  autoFixable: boolean;
}

export interface MapLayerVisibility {
  provinces: boolean;
  states: boolean;
  terrain: boolean;
  provinceLabels: boolean;
  stateLabels: boolean;
  rivers: boolean;
  railways: boolean;
  supplyNodes: boolean;
  pins: boolean;
}
