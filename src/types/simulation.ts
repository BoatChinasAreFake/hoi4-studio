export type IdeologyGroup = 'democratic' | 'communism' | 'fascism' | 'neutrality';

export interface SandboxCountryState {
  tag: string;
  name: string;
  politicalPower: number;
  politicalPowerDailyGain: number;
  stability: number; // 0.0 to 1.0
  warSupport: number; // 0.0 to 1.0
  commandPower: number; // 0 to 100
  manpower: number;
  civilianFactories: number;
  militaryFactories: number;
  dockyards: number;
  ideologies: Record<IdeologyGroup, number>; // Percentages totaling 100
  rulingParty: IdeologyGroup;
  nationalSpirits: { id: string; name: string; modifiers: string }[];
  activeFocus: { id: string; daysRemaining: number; totalDays: number } | null;
  completedFocuses: string[];
  countryFlags: Record<string, boolean | number>;
  variables: Record<string, number>;
}

export interface SimulationTickReport {
  day: number;
  date: string; // e.g. "1936.01.01.12"
  events: string[];
  focusCompleted?: string;
}

export interface DeadlockAnalysisResult {
  hasCycles: boolean;
  cycles: string[][];
  hasMutualExclusionDeadlocks: boolean;
  mutualExclusions: { focusA: string; focusB: string; reason: string }[];
  unreachableFocuses: string[];
  independentRoots: string[];
  totalEvaluated: number;
}
