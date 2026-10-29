export type UiStudioTab =
  | 'gui_builder'
  | 'minigames'
  | 'gfx_browser'
  | 'flag_studio'
  | 'music_station'
  | 'workshop_packager';

export type SimulationStudioTab =
  | 'sandbox'
  | 'optimizer'
  | 'patch_upgrader';

// ============================================================================
// 1. GFX Tag Search & Asset Browser
// ============================================================================

export interface GfxSpriteItem {
  name: string;
  texturefile: string;
  tags: string[];
  category: string; // 'focus_icon' | 'idea' | 'portrait' | 'event_picture' | 'division_icon' | 'trait' | 'decision' | 'misc'
  noOfFrames?: number;
}

export interface GfxUsageRef {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  contextType: string;
}

// ============================================================================
// 2. WYSIWYG .gui Builder
// ============================================================================

export type GuiElementType =
  | 'containerWindowType'
  | 'iconType'
  | 'instantTextBoxType'
  | 'buttonType';

export interface GuiElementDef {
  id: string;
  type: GuiElementType;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  orientation?: string; // 'upper_left' | 'center' | 'lower_right' | 'upper_right'
  format?: 'left' | 'center' | 'right';
  font?: string; // 'hoi_16mbs' | 'hoi_18mbs' | 'hoi_20bs' | 'hoi_24header' | 'hoi_30header' | 'hoi_36header'
  spriteType?: string;
  text?: string;
  pdxTooltip?: string;
  clickSound?: string;
  scale?: number;
  children?: GuiElementDef[];
}

export type MinigameType =
  | 'parliament'
  | 'regional_grid'
  | 'balance_of_power'
  | 'pie_chart';

// ============================================================================
// 3. Automated 1-Click Flag Studio
// ============================================================================

export type FlagIdeology =
  | 'democratic'
  | 'communism'
  | 'fascism'
  | 'neutrality';

export type FlagResolution =
  | 'standard' // 82x52
  | 'medium'   // 41x26
  | 'small';   // 10x7

export interface FlagExportItem {
  tag: string;
  ideology: FlagIdeology;
  resolution: FlagResolution;
  width: number;
  height: number;
  byteCount: number;
  path: string;
  buffer: Uint8Array;
}

// ============================================================================
// 4. Music Station & Radio Studio
// ============================================================================

export interface MusicTrackModifier {
  factor: number;
  conditions: Record<string, string>;
}

export interface MusicTrack {
  id: string;
  song: string;
  title: string;
  assetFile: string;
  chanceFactor: number;
  modifiers: MusicTrackModifier[];
}

export interface MusicStation {
  id: string;
  name: string;
  coverGfx: string;
  tracks: MusicTrack[];
}

// ============================================================================
// 5. Mod Asset Optimizer & Purger
// ============================================================================

export type ModOptimizerCategory =
  | 'texture'
  | 'audio'
  | 'localization'
  | 'duplicate';

export interface ModOptimizerIssue {
  id: string;
  category: ModOptimizerCategory;
  path: string;
  details: string;
  sizeBytes: number;
  selected: boolean;
  quarantined?: boolean;
}

// ============================================================================
// 6. Vanilla Patch & Version Upgrader
// ============================================================================

export type PatchBlockStatus =
  | 'clean'
  | 'conflict'
  | 'upstream_modified'
  | 'upstream_added'
  | 'mod_custom';

export interface PatchDiffBlock {
  id: string;
  blockType: string;
  status: PatchBlockStatus;
  baseContent?: string;
  vanillaContent?: string;
  modContent?: string;
  mergedContent?: string;
  description: string;
}

// ============================================================================
// 7. Steam Workshop Publisher & Packager
// ============================================================================

export interface WorkshopMetadata {
  name: string;
  version: string;
  supportedVersion: string;
  tags: string[];
  picture: string;
  remoteFileId?: string;
  changelog: string;
  ignorePatterns: string[];
}
