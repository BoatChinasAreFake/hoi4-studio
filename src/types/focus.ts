export interface FocusNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  symbol: string; // Editor emblem: ★, ⚒, ⚑, ⚙, ✦, ⚓, ✈, ♜, ☀
  icon: string;
  cost: number;
  x: number;
  y: number;
  relative_position_id?: string;
  prerequisites: string[][]; // OR groups of AND prerequisites
  mutually_exclusive: string[];
  prereqMode?: 'all' | 'any';
  description?: string;
  reward?: string;
  available?: string;
  ai?: number;
  status?: 'available' | 'in_progress' | 'completed' | 'locked';
}

export interface FocusTemplate {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  cost: number;
  reward: string;
}

export interface FocusProject {
  version: number;
  treeId: string;
  tag: string;
  title: string;
  nodes: FocusNodeData[];
  templates?: FocusTemplate[];
}

export interface FocusTree {
  id: string;
  country_factor_raw?: string;
  default_tree: boolean;
  focuses: FocusNodeData[];
}

export type ActivityHub = 
  | 'narrative'
  | 'military'
  | 'map'
  | 'politics'
  | 'economy'
  | 'ui'
  | 'simulation';
