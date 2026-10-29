export type SuperEventFrameSkin = 'tno' | 'kaiserreich' | 'vanilla' | 'red_flood';

export interface SuperEventDef {
  id: string;
  titleLocKey: string;
  titleText: string;
  quoteLocKey: string;
  quoteText: string;
  quoteAuthor: string;
  buttonLocKey: string;
  buttonText: string;
  bannerSprite: string;
  bannerUrl?: string;
  soundEffect: string;
  audioUrl?: string;
  frameSkin: SuperEventFrameSkin;
  fireOnlyOnce: boolean;
  effect?: string;
}

export interface CountryWizardConfig {
  tag: string;
  name: string;
  adjective: string;
  color: [number, number, number];
  graphicalCulture: string;
  capitalProvinceId: number;
  stateId: number;
  stateName: string;
  stateProvinces: number[];
  rulingParty: 'democratic' | 'communism' | 'fascism' | 'neutrality';
  leaderName: string;
  leaderIdeology: string;
  leaderPortrait?: string;
}

export interface GeneratedFile {
  path: string;
  content: string | Uint8Array;
  isBinary: boolean;
}

export interface CountryWizardResult {
  tag: string;
  files: GeneratedFile[];
  directories: string[];
}

export interface CountryLeaderRole {
  ideology: string;
  traits: string[];
  expire?: string;
  id?: number;
}

export interface CorpsCommanderRole {
  skill: number;
  attack: number;
  defense: number;
  planning: number;
  logistics: number;
  traits: string[];
}

export interface NavyLeaderRole {
  skill: number;
  attack: number;
  defense: number;
  maneuvering: number;
  coordination: number;
  traits: string[];
}

export interface AdvisorRole {
  slot: string;
  /** Restricts hiring to one country tag (emitted as `allowed = { original_tag = TAG }`). */
  allowedTag?: string;
  ideaToken?: string;
  ledger?: 'civilian' | 'army' | 'navy' | 'air';
  cost?: number;
  traits: string[];
  aiWillDo?: number;
}

export interface ScientistRole {
  traits: string[];
  specializations: Record<string, number>;
}

export interface CharacterDef {
  token: string;
  name: string;
  gender: 'male' | 'female';
  portraits: {
    civilianLarge?: string;
    civilianSmall?: string;
    armyLarge?: string;
    armySmall?: string;
  };
  countryLeader?: CountryLeaderRole;
  corpsCommander?: CorpsCommanderRole;
  navyLeader?: NavyLeaderRole;
  advisor?: AdvisorRole;
  scientist?: ScientistRole;
}

export interface BopRange {
  id: string;
  min: number;
  max: number;
  modifiers: Record<string, number | string>;
  onActivate?: string;
  onDeactivate?: string;
}

export interface BopSide {
  id: string;
  name: string;
  icon?: string;
  ranges: BopRange[];
}

export interface BopDefinition {
  token: string;
  initialValue: number;
  leftSide: string;
  rightSide: string;
  decisionCategory?: string;
  neutralRange?: BopRange;
  sides: BopSide[];
}

export interface FactionRule {
  leaderVetoPeace: boolean;
  canPuppetJoin: boolean;
  worldTensionThreshold: number;
  offensiveWarAllowed: boolean;
  mutualDefenseTrigger: boolean;
}

export interface FactionGoal {
  id: string;
  name: string;
  description: string;
  rewardModifier: Record<string, number | string>;
}

export interface FactionDef {
  name: string;
  leaderTag: string;
  ideology: string;
  rules: FactionRule;
  goals: FactionGoal[];
  memberTags: string[];
}

export interface IdeologyDefinition {
  name: string;
  group: 'democratic' | 'communism' | 'fascism' | 'neutrality' | 'custom';
  color: [number, number, number];
  subTypes: string[];
  rules: {
    can_force_government: boolean;
    can_puppet: boolean;
    can_send_volunteers: boolean;
    can_be_spymaster: boolean;
    can_declare_war_on_same_ideology: boolean;
  };
  warImpactOnWorldTension: number;
  dynamicFactionNames: string[];
}

export interface AutonomyLevel {
  id: string;
  name: string;
  minFreedomLevel: number;
  manpowerInfluence: number;
  rules: {
    can_not_declare_war: boolean;
    can_decline_call_to_war: boolean;
    can_be_spymaster: boolean;
    contributes_operatives: boolean;
  };
  modifiers: Record<string, number | string>;
}

export interface ScriptedDiploAction {
  id: string;
  name: string;
  costPP: number;
  costCP: number;
  requiresAcceptance: boolean;
  allowedTrigger: string;
  visibleTrigger: string;
  aiAcceptanceFormula: string;
  onSentEffect: string;
  completeEffect: string;
  rejectEffect: string;
}

export interface TimedActivity {
  id: string;
  name: string;
  durationDays: number;
  equipmentCost: Record<string, number>;
  onExpireEffect: string;
  cancelTrigger: string;
}

export type Hoi4Language =
  | 'english'
  | 'braz_por'
  | 'french'
  | 'german'
  | 'japanese'
  | 'korean'
  | 'polish'
  | 'russian'
  | 'simp_chinese'
  | 'spanish';

export interface LocMatrixEntry {
  key: string;
  translations: Record<Hoi4Language, string>;
}

export interface SymbolRefactorEntry {
  path: string;
  content: string;
  diff?: string;
  count?: number;
}
