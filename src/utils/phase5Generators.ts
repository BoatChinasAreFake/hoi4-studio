import type {
  PatchDiffBlock,
  GuiElementDef,
  FlagIdeology,
  FlagResolution,
  FlagExportItem,
  ModOptimizerIssue,
  WorkshopMetadata,
} from '../types/ui';

// ============================================================================
// 1. 3-Way AST Diffing & Merge Conflict Engine
// ============================================================================

export interface ParsedBlock {
  id: string;
  blockType: string;
  raw: string;
  properties: Map<string, string>;
}

export interface ThreeWayDiffReport {
  blocks: PatchDiffBlock[];
  totalBlocks: number;
  conflictCount: number;
  autoMergedCount: number;
  mergedScript: string;
}

/**
 * Parses Clausewitz script blocks into structured AST entries with properties.
 */
export function parseScriptBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const blockRegex = /([a-zA-Z0-9_]+)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    const blockType = match[1];
    const body = match[2];
    const raw = match[0].trim();

    const idMatch = body.match(/\bid\s*=\s*([a-zA-Z0-9_]+)/) ||
                    body.match(/\bname\s*=\s*"([^"]+)"/) ||
                    body.match(/\bname\s*=\s*([a-zA-Z0-9_]+)/);
    const id = idMatch ? idMatch[1] : `block_${blocks.length + 1}`;

    const properties = new Map<string, string>();
    const propRegex = /([a-zA-Z0-9_]+)\s*=\s*("(?:[^"\\]|\\.)*"|\{[^{}]*\}|[a-zA-Z0-9_.-]+)/g;
    let propMatch: RegExpExecArray | null;
    while ((propMatch = propRegex.exec(body)) !== null) {
      if (propMatch[1] !== 'id') {
        properties.set(propMatch[1], propMatch[2].trim());
      }
    }

    blocks.push({ id, blockType, raw, properties });
  }

  return blocks;
}

/**
 * Executes a 3-way AST merge across Base Vanilla, Updated Vanilla, and User Mod scripts.
 * Correctly identifies Add/Add collisions as conflicts when contents differ.
 */
export function diffAst3Way(
  baseContent: string,
  vanillaContent: string,
  modContent: string
): ThreeWayDiffReport {
  const baseBlocks = new Map(parseScriptBlocks(baseContent).map(b => [b.id, b]));
  const vanillaBlocks = new Map(parseScriptBlocks(vanillaContent).map(b => [b.id, b]));
  const modBlocks = new Map(parseScriptBlocks(modContent).map(b => [b.id, b]));

  const allIds = new Set<string>([
    ...baseBlocks.keys(),
    ...vanillaBlocks.keys(),
    ...modBlocks.keys(),
  ]);

  const resultBlocks: PatchDiffBlock[] = [];
  let conflictCount = 0;
  let autoMergedCount = 0;

  for (const id of allIds) {
    const base = baseBlocks.get(id);
    const vanilla = vanillaBlocks.get(id);
    const mod = modBlocks.get(id);

    // Scenario 1: Only in Mod -> Custom mod block
    if (!base && !vanilla && mod) {
      resultBlocks.push({
        id,
        blockType: mod.blockType,
        status: 'mod_custom',
        modContent: mod.raw,
        mergedContent: mod.raw,
        description: 'Custom mod content added; preserved cleanly.',
      });
      autoMergedCount++;
      continue;
    }

    // Scenario 2: Only in Vanilla Update -> New upstream content
    if (!base && vanilla && !mod) {
      resultBlocks.push({
        id,
        blockType: vanilla.blockType,
        status: 'upstream_added',
        vanillaContent: vanilla.raw,
        mergedContent: vanilla.raw,
        description: 'New content added in upstream vanilla update; auto-merged.',
      });
      autoMergedCount++;
      continue;
    }

    // Scenario 3: Add/Add Collision (Not in Base, added in both Vanilla and Mod)
    if (!base && vanilla && mod) {
      if (vanilla.raw === mod.raw) {
        resultBlocks.push({
          id,
          blockType: vanilla.blockType,
          status: 'clean',
          vanillaContent: vanilla.raw,
          modContent: mod.raw,
          mergedContent: mod.raw,
          description: 'Identical new block added in both branches.',
        });
        autoMergedCount++;
      } else {
        conflictCount++;
        const conflictMerged = `# <<<<<<< USER MOD (ADD/ADD COLLISION)\n${mod.raw}\n# ======= UPSTREAM VANILLA\n${vanilla.raw}\n# >>>>>>> END CONFLICT`;
        resultBlocks.push({
          id,
          blockType: vanilla.blockType,
          status: 'conflict',
          vanillaContent: vanilla.raw,
          modContent: mod.raw,
          mergedContent: conflictMerged,
          description: `Add/Add conflict: Both mod and vanilla added '${id}' with different definitions.`,
        });
      }
      continue;
    }

    // Scenario 4: Present across all 3
    if (base && vanilla && mod) {
      const vanillaChanged = vanilla.raw !== base.raw;
      const modChanged = mod.raw !== base.raw;

      if (!vanillaChanged && !modChanged) {
        resultBlocks.push({
          id,
          blockType: base.blockType,
          status: 'clean',
          baseContent: base.raw,
          vanillaContent: vanilla.raw,
          modContent: mod.raw,
          mergedContent: mod.raw,
          description: 'Identical across all versions.',
        });
        autoMergedCount++;
      } else if (vanillaChanged && !modChanged) {
        resultBlocks.push({
          id,
          blockType: base.blockType,
          status: 'upstream_modified',
          baseContent: base.raw,
          vanillaContent: vanilla.raw,
          modContent: mod.raw,
          mergedContent: vanilla.raw,
          description: 'Upstream vanilla modified; auto-merged into mod.',
        });
        autoMergedCount++;
      } else if (!vanillaChanged && modChanged) {
        resultBlocks.push({
          id,
          blockType: base.blockType,
          status: 'clean',
          baseContent: base.raw,
          vanillaContent: vanilla.raw,
          modContent: mod.raw,
          mergedContent: mod.raw,
          description: 'User mod custom changes preserved.',
        });
        autoMergedCount++;
      } else {
        if (vanilla.raw === mod.raw) {
          resultBlocks.push({
            id,
            blockType: base.blockType,
            status: 'clean',
            baseContent: base.raw,
            vanillaContent: vanilla.raw,
            modContent: mod.raw,
            mergedContent: mod.raw,
            description: 'Identical modifications in upstream and mod.',
          });
          autoMergedCount++;
        } else {
          // Property-level diffing
          const propConflicts: string[] = [];
          const mergedProps = new Map<string, string>(base.properties);

          const allPropKeys = new Set([
            ...base.properties.keys(),
            ...vanilla.properties.keys(),
            ...mod.properties.keys(),
          ]);

          for (const key of allPropKeys) {
            const bVal = base.properties.get(key);
            const vVal = vanilla.properties.get(key);
            const mVal = mod.properties.get(key);

            if (vVal !== bVal && mVal === bVal) {
              if (vVal !== undefined) mergedProps.set(key, vVal);
              else mergedProps.delete(key);
            } else if (mVal !== bVal && vVal === bVal) {
              if (mVal !== undefined) mergedProps.set(key, mVal);
              else mergedProps.delete(key);
            } else if (vVal !== bVal && mVal !== bVal) {
              if (vVal === mVal) {
                if (vVal !== undefined) mergedProps.set(key, vVal);
              } else {
                propConflicts.push(key);
              }
            }
          }

          if (propConflicts.length === 0) {
            let mergedBody = `\tid = ${id}\n`;
            for (const [k, v] of mergedProps) {
              mergedBody += `\t${k} = ${v}\n`;
            }
            const mergedRaw = `${base.blockType} = {\n${mergedBody}}`;

            resultBlocks.push({
              id,
              blockType: base.blockType,
              status: 'upstream_modified',
              baseContent: base.raw,
              vanillaContent: vanilla.raw,
              modContent: mod.raw,
              mergedContent: mergedRaw,
              description: 'Non-conflicting property updates auto-merged.',
            });
            autoMergedCount++;
          } else {
            conflictCount++;
            const conflictMerged = `# <<<<<<< USER MOD (${propConflicts.join(', ')})\n${mod.raw}\n# ======= UPSTREAM VANILLA\n${vanilla.raw}\n# >>>>>>> END CONFLICT`;
            resultBlocks.push({
              id,
              blockType: base.blockType,
              status: 'conflict',
              baseContent: base.raw,
              vanillaContent: vanilla.raw,
              modContent: mod.raw,
              mergedContent: conflictMerged,
              description: `Conflict on properties: [${propConflicts.join(', ')}]`,
            });
          }
        }
      }
      continue;
    }

    // Scenario 5: Mod modified, Upstream deleted -> Conflict
    if (base && !vanilla && mod) {
      if (base.raw !== mod.raw) {
        conflictCount++;
        resultBlocks.push({
          id,
          blockType: base.blockType,
          status: 'conflict',
          baseContent: base.raw,
          modContent: mod.raw,
          mergedContent: `# <<<<<<< USER MOD (MODIFIED)\n${mod.raw}\n# ======= UPSTREAM (DELETED)\n# Block deleted upstream\n# >>>>>>> END CONFLICT`,
          description: 'Conflict: Mod modified a block that was removed in upstream vanilla.',
        });
      }
    }
  }

  const mergedScript = resultBlocks
    .map(b => b.mergedContent || b.modContent || b.vanillaContent || '')
    .filter(Boolean)
    .join('\n\n');

  return {
    blocks: resultBlocks,
    totalBlocks: resultBlocks.length,
    conflictCount,
    autoMergedCount,
    mergedScript,
  };
}

// ============================================================================
// 2. Country Leader Parser & Modern Character Migrator
// ============================================================================

export interface ExtractedCountryLeader {
  name: string;
  desc?: string;
  picture: string;
  expire?: string;
  ideology: string;
  traits: string[];
  rawBlock: string;
}

export interface CharacterMigrationResult {
  migratedScript: string;
  migratedCount: number;
  extractedLeaders: ExtractedCountryLeader[];
}

/**
 * Extracts all `create_country_leader` blocks and migrates them to modern HOI4 character syntax.
 */
export function migrateCountryLeaders(
  script: string,
  defaultTag: string = 'MOD'
): CharacterMigrationResult {
  const extractedLeaders: ExtractedCountryLeader[] = [];
  let count = 0;

  const leaderBlockRegex = /create_country_leader\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  const migratedScript = script.replace(leaderBlockRegex, (match, body: string) => {
    count++;

    const nameMatch = body.match(/\bname\s*=\s*"([^"]+)"/) || body.match(/\bname\s*=\s*([a-zA-Z0-9_]+)/);
    const descMatch = body.match(/\bdesc\s*=\s*"([^"]+)"/) || body.match(/\bdesc\s*=\s*([a-zA-Z0-9_]+)/);
    const picMatch = body.match(/\bpicture\s*=\s*"([^"]+)"/) || body.match(/\bpicture\s*=\s*([a-zA-Z0-9_./\\]+)/);
    const expireMatch = body.match(/\bexpire\s*=\s*"([^"]+)"/) || body.match(/\bexpire\s*=\s*([0-9.]+)/);
    const ideoMatch = body.match(/\bideology\s*=\s*([a-zA-Z0-9_]+)/);

    const traits: string[] = [];
    const traitsMatch = body.match(/\btraits\s*=\s*\{([^}]*)\}/);
    if (traitsMatch) {
      const traitTokens = traitsMatch[1].trim().split(/\s+/);
      for (const t of traitTokens) {
        if (t && !t.startsWith('#')) traits.push(t);
      }
    }

    const name = nameMatch ? nameMatch[1] : 'Unknown Leader';
    const desc = descMatch ? descMatch[1] : undefined;
    const picture = picMatch ? picMatch[1].replace(/\\/g, '/') : 'gfx/leaders/leader_unknown.dds';
    const expire = expireMatch ? expireMatch[1] : '1965.1.1';
    const ideology = ideoMatch ? ideoMatch[1] : 'neutrality';

    let tag = defaultTag;
    const pathTagMatch = picture.match(/gfx\/leaders\/([A-Z]{3})\//i);
    if (pathTagMatch) {
      tag = pathTagMatch[1].toUpperCase();
    }

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const charId = `${tag}_${sanitizedName}`;

    extractedLeaders.push({
      name,
      desc,
      picture,
      expire,
      ideology,
      traits,
      rawBlock: match,
    });

    let modernBlock = `# [MIGRATED TO CHARACTER V1.11+]\ncharacters = {\n\t${charId} = {\n`;
    modernBlock += `\t\tname = "${name}"\n`;
    modernBlock += `\t\tportraits = {\n\t\tcivilian = {\n\t\t\tlarge = "${picture}"\n\t\t}\n\t}\n`;
    modernBlock += `\t\tcountry_leader = {\n`;
    if (desc) modernBlock += `\t\t\tdesc = "${desc}"\n`;
    modernBlock += `\t\t\tideology = ${ideology}\n`;
    modernBlock += `\t\t\texpire = "${expire}"\n`;
    if (traits.length > 0) {
      modernBlock += `\t\t\ttraits = { ${traits.join(' ')} }\n`;
    }
    modernBlock += `\t\t}\n\t}\n}`;

    return modernBlock;
  });

  return {
    migratedScript,
    migratedCount: count,
    extractedLeaders,
  };
}

// ============================================================================
// 3. Deprecated Trigger & Syntax Migrator
// ============================================================================

export interface DeprecationMigrationRule {
  id: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface SyntaxMigrationItem {
  ruleId: string;
  description: string;
  lineNumber: number;
  originalText: string;
  migratedText: string;
}

export interface SyntaxMigrationReport {
  migratedContent: string;
  totalMigrations: number;
  items: SyntaxMigrationItem[];
}

export const SYNTAX_MIGRATION_RULES: DeprecationMigrationRule[] = [
  {
    id: 'RULE_IS_IN_FACTION',
    pattern: /\bis_in_faction\s*=\s*yes\b/g,
    replacement: 'has_faction = yes',
    description: 'Modernize faction check: is_in_faction = yes is deprecated in 1.11+, replaced by has_faction = yes',
  },
  {
    id: 'RULE_IS_NOT_IN_FACTION',
    pattern: /\bis_in_faction\s*=\s*no\b/g,
    replacement: 'has_faction = no',
    description: 'Modernize faction check: is_in_faction = no replaced by has_faction = no',
  },
  {
    id: 'RULE_IS_PUPPET',
    pattern: /\bis_puppet\s*=\s*yes\b/g,
    replacement: 'is_subject = yes',
    description: 'Modernize puppet check: is_puppet replaced by is_subject in 1.11+ autonomy system',
  },
  {
    id: 'RULE_CAN_CREATE_FACTIONS',
    pattern: /\bcan_create_factions\s*=\s*yes\b/g,
    replacement: 'rule = { can_create_factions = yes }',
    description: 'Modernize faction creation rule syntax: wrapped in rule block',
  },
  {
    id: 'RULE_HAS_DLC_EXPANSION',
    pattern: /\bhas_dlc\s*=\s*"Man the Guns"/g,
    replacement: 'has_dlc = "Man the Guns"',
    description: 'Standardize DLC token check',
  },
];

export function migrateDeprecatedScript(
  script: string,
  countryTag: string = 'MOD'
): SyntaxMigrationReport {
  const leaderRes = migrateCountryLeaders(script, countryTag);
  let content = leaderRes.migratedScript;

  const items: SyntaxMigrationItem[] = [];
  for (const leader of leaderRes.extractedLeaders) {
    items.push({
      ruleId: 'RULE_MIGRATE_LEADER',
      description: `Migrated create_country_leader '${leader.name}' to characters block`,
      lineNumber: 1,
      originalText: leader.rawBlock.split('\n')[0] + ' ...',
      migratedText: `characters = { ... }`,
    });
  }

  const lines = content.split('\n');
  const migratedLines: string[] = [];

  lines.forEach((line, idx) => {
    let curLine = line;
    const lineNum = idx + 1;

    for (const rule of SYNTAX_MIGRATION_RULES) {
      if (rule.pattern.test(curLine)) {
        rule.pattern.lastIndex = 0;
        const originalText = curLine.trim();
        curLine = curLine.replace(rule.pattern, rule.replacement);
        items.push({
          ruleId: rule.id,
          description: rule.description,
          lineNumber: lineNum,
          originalText,
          migratedText: curLine.trim(),
        });
      }
    }
    migratedLines.push(curLine);
  });

  return {
    migratedContent: migratedLines.join('\n'),
    totalMigrations: items.length,
    items,
  };
}

// ============================================================================
// 4. Province ID Realignment Engine (Word-Boundary Safe)
// ============================================================================

export interface ProvinceDefinition {
  id: number;
  r: number;
  g: number;
  b: number;
  type: string;
  isCoastal: boolean;
  terrain: string;
  continent: number;
}

export interface ProvinceDiffResult {
  shiftedMap: Map<number, number>; // oldId -> newId
  addedProvinces: number[];
  removedProvinces: number[];
}

export interface RealignmentReport {
  modifiedScript: string;
  replacementsCount: number;
  remappedProvinces: Array<{ oldId: number; newId: number; occurrences: number }>;
}

export function parseDefinitionCsv(content: string): Map<string, ProvinceDefinition> {
  const map = new Map<string, ProvinceDefinition>();
  const lines = content.split('\n');

  for (const line of lines) {
    const parts = line.trim().split(';');
    if (parts.length >= 4) {
      const id = parseInt(parts[0], 10);
      const r = parseInt(parts[1], 10);
      const g = parseInt(parts[2], 10);
      const b = parseInt(parts[3], 10);
      if (!isNaN(id) && !isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const rgbKey = `${r},${g},${b}`;
        map.set(rgbKey, {
          id,
          r,
          g,
          b,
          type: parts[4] || 'land',
          isCoastal: parts[5] === 'true',
          terrain: parts[6] || 'unknown',
          continent: parseInt(parts[7] || '0', 10),
        });
      }
    }
  }

  return map;
}

export function computeProvinceDiff(oldCsv: string, newCsv: string): ProvinceDiffResult {
  const oldMap = parseDefinitionCsv(oldCsv);
  const newMap = parseDefinitionCsv(newCsv);

  const shiftedMap = new Map<number, number>();
  const removedProvinces: number[] = [];
  const addedProvinces: number[] = [];

  for (const [rgb, oldDef] of oldMap) {
    const newDef = newMap.get(rgb);
    if (newDef) {
      if (newDef.id !== oldDef.id) {
        shiftedMap.set(oldDef.id, newDef.id);
      }
    } else {
      removedProvinces.push(oldDef.id);
    }
  }

  for (const [rgb, newDef] of newMap) {
    if (!oldMap.has(rgb)) {
      addedProvinces.push(newDef.id);
    }
  }

  return { shiftedMap, addedProvinces, removedProvinces };
}

/**
 * Realigns province IDs in a script using word-boundary regex to prevent substring corruption.
 * Guarantees that replacing e.g. Province 1 with 2 will NEVER corrupt 10, 100, or 11804.
 */
export function realignModProvinces(
  script: string,
  shiftedMap: Map<number, number>
): RealignmentReport {
  let modifiedScript = script;
  let replacementsCount = 0;
  const remappedProvinces: Array<{ oldId: number; newId: number; occurrences: number }> = [];

  // Sort descending by numeric ID length to guarantee longest match priority
  const sortedEntries = Array.from(shiftedMap.entries()).sort(
    (a, b) => b[0].toString().length - a[0].toString().length
  );

  for (const [oldId, newId] of sortedEntries) {
    const regex = new RegExp(`\\b${oldId}\\b`, 'g');
    let occurrences = 0;

    modifiedScript = modifiedScript.replace(regex, () => {
      occurrences++;
      replacementsCount++;
      return newId.toString();
    });

    if (occurrences > 0) {
      remappedProvinces.push({ oldId, newId, occurrences });
    }
  }

  return {
    modifiedScript,
    replacementsCount,
    remappedProvinces,
  };
}

// ============================================================================
// 5. WYSIWYG .gui Layout Serializer & Minigame Geometry
// ============================================================================

export function serializeGuiElement(element: GuiElementDef, indentLevel: number = 0): string {
  const indent = '\t'.repeat(indentLevel);
  let out = `${indent}${element.type} = {\n`;
  out += `${indent}\tname = "${element.name}"\n`;
  out += `${indent}\tposition = { x = ${element.position.x} y = ${element.position.y} }\n`;
  out += `${indent}\tsize = { width = ${element.size.width} height = ${element.size.height} }\n`;

  if (element.orientation) out += `${indent}\torientation = ${element.orientation}\n`;
  if (element.spriteType) out += `${indent}\tspriteType = "${element.spriteType}"\n`;
  if (element.font) out += `${indent}\tfont = "${element.font}"\n`;
  if (element.text) out += `${indent}\ttext = "${element.text}"\n`;
  if (element.format) out += `${indent}\tformat = ${element.format}\n`;
  if (element.pdxTooltip) out += `${indent}\tpdx_tooltip = "${element.pdxTooltip}"\n`;
  if (element.clickSound) out += `${indent}\tclicksound = "${element.clickSound}"\n`;

  if (element.children && element.children.length > 0) {
    out += '\n';
    for (const child of element.children) {
      out += serializeGuiElement(child, indentLevel + 1) + '\n';
    }
  }

  out += `${indent}}`;
  return out;
}

export interface ParliamentSeatPoint {
  x: number;
  y: number;
  party: string;
}

export interface ParliamentCalculation {
  dots: ParliamentSeatPoint[];
  totalSeats: number;
  majorityThreshold: number;
  seatsByParty: Record<string, number>;
}

export function computeParliamentSeats(
  seatCounts: Record<string, number>,
  radius: number = 100,
  originX: number = 150,
  originY: number = 150
): ParliamentCalculation {
  const parties = Object.keys(seatCounts);
  const totalSeats = Object.values(seatCounts).reduce((sum, n) => sum + n, 0);
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  const dots: ParliamentSeatPoint[] = [];
  let currentPartyIdx = 0;
  let remainingInParty = seatCounts[parties[0]] || 0;

  for (let i = 1; i <= totalSeats; i++) {
    while (remainingInParty <= 0 && currentPartyIdx < parties.length - 1) {
      currentPartyIdx++;
      remainingInParty = seatCounts[parties[currentPartyIdx]] || 0;
    }

    const party = parties[currentPartyIdx] || 'neutral';
    remainingInParty--;

    const angle = Math.PI - (i * Math.PI) / (totalSeats + 1);
    const x = Math.round(originX + radius * Math.cos(angle));
    const y = Math.round(originY - radius * Math.sin(angle));

    dots.push({ x, y, party });
  }

  return {
    dots,
    totalSeats,
    majorityThreshold,
    seatsByParty: seatCounts,
  };
}

// ============================================================================
// 6. 32-Bit Uncompressed TGA Buffer Generator & Header Validator
// ============================================================================

export interface TgaInfo {
  width: number;
  height: number;
  bpp: number;
  imageType: number;
  hasAlpha: boolean;
  isUncompressedTrueColor: boolean;
  totalBytes: number;
}

export function createTgaBuffer(
  width: number,
  height: number,
  rgb: [number, number, number] = [200, 20, 20]
): Uint8Array {
  const headerSize = 18;
  const pixelBytes = width * height * 4;
  const buffer = new Uint8Array(headerSize + pixelBytes);

  buffer[0] = 0;
  buffer[1] = 0;
  buffer[2] = 2;
  buffer[8] = 0;
  buffer[9] = 0;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = width & 0xff;
  buffer[13] = (width >> 8) & 0xff;
  buffer[14] = height & 0xff;
  buffer[15] = (height >> 8) & 0xff;
  buffer[16] = 32;
  buffer[17] = 0x28;

  const [r, g, b] = rgb;
  let offset = headerSize;
  for (let i = 0; i < width * height; i++) {
    buffer[offset++] = b;
    buffer[offset++] = g;
    buffer[offset++] = r;
    buffer[offset++] = 255;
  }

  return buffer;
}

export function parseTgaHeader(buffer: Uint8Array): TgaInfo {
  if (buffer.length < 18) {
    throw new Error(`Buffer too small for TGA header: ${buffer.length} bytes (minimum 18 bytes required)`);
  }

  const imageType = buffer[2];
  const width = buffer[12] | (buffer[13] << 8);
  const height = buffer[14] | (buffer[15] << 8);
  const bpp = buffer[16];
  const descriptor = buffer[17];
  const alphaBits = descriptor & 0x0f;

  return {
    width,
    height,
    bpp,
    imageType,
    hasAlpha: alphaBits === 8 || bpp === 32,
    isUncompressedTrueColor: imageType === 2,
    totalBytes: buffer.length,
  };
}

export function validateFlagTga(
  buffer: Uint8Array,
  expectedKind: FlagResolution
): { valid: boolean; error?: string; info?: TgaInfo } {
  try {
    const info = parseTgaHeader(buffer);
    const expectedDimensions: Record<FlagResolution, [number, number]> = {
      standard: [82, 52],
      medium: [41, 26],
      small: [10, 7],
    };

    const [expW, expH] = expectedDimensions[expectedKind];

    if (info.width !== expW || info.height !== expH) {
      return {
        valid: false,
        error: `Invalid flag dimensions for ${expectedKind}: expected ${expW}x${expH}, got ${info.width}x${info.height}`,
        info,
      };
    }

    if (!info.isUncompressedTrueColor) {
      return {
        valid: false,
        error: `Invalid TGA image type: expected 2 (uncompressed true-color), got ${info.imageType}`,
        info,
      };
    }

    if (info.bpp !== 32) {
      return {
        valid: false,
        error: `Invalid bit depth: expected 32 bpp, got ${info.bpp} bpp`,
        info,
      };
    }

    return { valid: true, info };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export function batchGenerateFlagTgas(
  tag: string,
  ideologyColors?: Partial<Record<FlagIdeology, [number, number, number]>>
): FlagExportItem[] {
  const defaultColors: Record<FlagIdeology, [number, number, number]> = {
    democratic: [30, 90, 200],
    communism: [220, 20, 20],
    fascism: [139, 69, 19],
    neutrality: [120, 120, 120],
    ...ideologyColors,
  };

  const resolutions: Array<{ id: FlagResolution; width: number; height: number; folder: string }> = [
    { id: 'standard', width: 82, height: 52, folder: 'gfx/flags/' },
    { id: 'medium', width: 41, height: 26, folder: 'gfx/flags/medium/' },
    { id: 'small', width: 10, height: 7, folder: 'gfx/flags/small/' },
  ];

  const items: FlagExportItem[] = [];
  const ideologies: FlagIdeology[] = ['democratic', 'communism', 'fascism', 'neutrality'];

  for (const ideo of ideologies) {
    const rgb = defaultColors[ideo];
    for (const res of resolutions) {
      const buffer = createTgaBuffer(res.width, res.height, rgb);
      const path = `${res.folder}${tag}_${ideo}.tga`;
      items.push({
        tag,
        ideology: ideo,
        resolution: res.id,
        width: res.width,
        height: res.height,
        byteCount: buffer.length,
        path,
        buffer,
      });
    }
  }

  return items;
}

// ============================================================================
// 7. Mod Asset Scanner, Descriptor Validator & Packaging Engine
// ============================================================================

export interface ModAssetEntry {
  path: string;
  fileType: 'texture' | 'audio' | 'localization' | 'script' | 'other';
  sizeBytes: number;
  hash: string;
}

export interface OptimizerScanReport {
  unreferencedTextures: ModAssetEntry[];
  deadAudio: ModAssetEntry[];
  orphanedLocKeys: string[];
  duplicateAssets: ModAssetEntry[][];
  totalReclaimableBytes: number;
  issues: ModOptimizerIssue[];
}

export interface PackageReleaseReport {
  includedFiles: string[];
  excludedFiles: string[];
  totalSizeBytes: number;
}

/**
 * Scans mod assets against script content and loc keys.
 * Deduplicates counted paths so assets in both unreferenced and duplicate categories are only counted ONCE.
 */
export function scanModAssets(
  assets: ModAssetEntry[],
  scriptCorpus: string,
  locKeys: string[] = []
): OptimizerScanReport {
  const unreferencedTextures: ModAssetEntry[] = [];
  const deadAudio: ModAssetEntry[] = [];
  const duplicateMap = new Map<string, ModAssetEntry[]>();
  const issues: ModOptimizerIssue[] = [];
  const countedPaths = new Set<string>(); // Fix: Prevents double-counting reclaimable bytes
  let totalReclaimableBytes = 0;

  for (const asset of assets) {
    if (!duplicateMap.has(asset.hash)) duplicateMap.set(asset.hash, []);
    duplicateMap.get(asset.hash)!.push(asset);

    const fileName = asset.path.split('/').pop() || '';
    const baseName = fileName.replace(/\.[^.]+$/, '');

    if (asset.fileType === 'texture') {
      if (!scriptCorpus.includes(fileName) && !scriptCorpus.includes(baseName)) {
        unreferencedTextures.push(asset);
        if (!countedPaths.has(asset.path)) {
          totalReclaimableBytes += asset.sizeBytes;
          countedPaths.add(asset.path);
        }
        issues.push({
          id: `opt_tex_${issues.length + 1}`,
          category: 'texture',
          path: asset.path,
          details: 'Texture is never referenced in any .gfx or script file.',
          sizeBytes: asset.sizeBytes,
          selected: true,
        });
      }
    } else if (asset.fileType === 'audio') {
      if (!scriptCorpus.includes(fileName) && !scriptCorpus.includes(baseName)) {
        deadAudio.push(asset);
        if (!countedPaths.has(asset.path)) {
          totalReclaimableBytes += asset.sizeBytes;
          countedPaths.add(asset.path);
        }
        issues.push({
          id: `opt_audio_${issues.length + 1}`,
          category: 'audio',
          path: asset.path,
          details: 'Audio track not defined in sound scripts or events.',
          sizeBytes: asset.sizeBytes,
          selected: true,
        });
      }
    }
  }

  // Duplicate groups
  const duplicateAssets: ModAssetEntry[][] = [];
  for (const [, group] of duplicateMap) {
    if (group.length > 1) {
      duplicateAssets.push(group);
      for (let i = 1; i < group.length; i++) {
        if (!countedPaths.has(group[i].path)) {
          totalReclaimableBytes += group[i].sizeBytes;
          countedPaths.add(group[i].path);
        }
        issues.push({
          id: `opt_dup_${issues.length + 1}`,
          category: 'duplicate',
          path: group[i].path,
          details: `Identical binary duplicate of '${group[0].path}'.`,
          sizeBytes: group[i].sizeBytes,
          selected: true,
        });
      }
    }
  }

  // Orphaned loc keys
  const orphanedLocKeys: string[] = [];
  for (const key of locKeys) {
    if (!scriptCorpus.includes(key)) {
      orphanedLocKeys.push(key);
      issues.push({
        id: `opt_loc_${issues.length + 1}`,
        category: 'localization',
        path: `localisation/english.yml#${key}`,
        details: `Localization key '${key}' never invoked in focus trees or events.`,
        sizeBytes: 64,
        selected: false,
      });
    }
  }

  return {
    unreferencedTextures,
    deadAudio,
    orphanedLocKeys,
    duplicateAssets,
    totalReclaimableBytes,
    issues,
  };
}

export function validateModDescriptor(content: string): {
  valid: boolean;
  errors: string[];
  descriptor?: Partial<WorkshopMetadata>;
} {
  const errors: string[] = [];
  const nameMatch = content.match(/\bname\s*=\s*"([^"]+)"/);
  const supportedVersionMatch = content.match(/\bsupported_version\s*=\s*"([^"]+)"/);
  const versionMatch = content.match(/\bversion\s*=\s*"([^"]+)"/);
  const pictureMatch = content.match(/\bpicture\s*=\s*"([^"]+)"/);
  const remoteIdMatch = content.match(/\bremote_file_id\s*=\s*"([^"]+)"/);

  if (!nameMatch) errors.push("Missing mandatory field: 'name'");
  if (!supportedVersionMatch) errors.push("Missing mandatory field: 'supported_version'");
  if (!content.includes('tags=')) errors.push("Missing mandatory block: 'tags'");

  const tags: string[] = [];
  const tagsBlock = content.match(/\btags\s*=\s*\{([^}]*)\}/);
  if (tagsBlock) {
    const tagMatches = tagsBlock[1].match(/"([^"]+)"/g);
    if (tagMatches) {
      for (const t of tagMatches) tags.push(t.replace(/"/g, ''));
    }
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    descriptor: valid
      ? {
          name: nameMatch![1],
          supportedVersion: supportedVersionMatch![1],
          version: versionMatch ? versionMatch[1] : '1.0.0',
          picture: pictureMatch ? pictureMatch[1] : 'thumbnail.png',
          remoteFileId: remoteIdMatch ? remoteIdMatch[1] : undefined,
          tags,
        }
      : undefined,
  };
}

export function filterPackageReleaseFiles(
  files: Array<{ path: string; sizeBytes?: number } | string>,
  customIgnorePatterns: string[] = []
): PackageReleaseReport {
  const defaultIgnore = [
    '.git',
    '.agents',
    '.psd',
    '.blend',
    '.wav',
    'tests/',
    '.backup_purged/',
    'src/',
    'src-tauri/',
  ];
  const allIgnore = [...defaultIgnore, ...customIgnorePatterns];

  const includedFiles: string[] = [];
  const excludedFiles: string[] = [];
  let totalSizeBytes = 0;

  for (const item of files) {
    const path = typeof item === 'string' ? item : item.path;
    const size = typeof item === 'string' ? 1000 : (item.sizeBytes || 1000);

    const isExcluded = allIgnore.some(rule => path.includes(rule));
    if (isExcluded) {
      excludedFiles.push(path);
    } else {
      includedFiles.push(path);
      totalSizeBytes += size;
    }
  }

  return { includedFiles, excludedFiles, totalSizeBytes };
}

/**
 * Music station playback chance and volume calculation helpers.
 */
export function calculatePlaybackChance(
  baseFactor: number,
  modifiers: Array<{ factor: number; condition: (ctx: Record<string, any>) => boolean }>,
  ctx: Record<string, any>
): number {
  let chance = baseFactor;
  for (const mod of modifiers) {
    if (mod.condition(ctx)) {
      chance *= mod.factor;
    }
  }
  return chance;
}

export function calculateEffectiveVolume(baseVolume: number, isCombatDucking: boolean): number {
  return isCombatDucking ? baseVolume * 0.6 : baseVolume;
}

// ============================================================================
// 8. GFX Indexer & Reverse Lookup Engine
// ============================================================================

export interface GfxSprite {
  name: string;
  texturefile: string;
  tags: string[];
  noOfFrames?: number;
}

export class GfxTagIndexer {
  private spriteMap = new Map<string, GfxSprite>();
  private textureMap = new Map<string, string[]>();
  private tagIndex = new Map<string, Set<string>>();

  indexSprite(sprite: GfxSprite) {
    this.spriteMap.set(sprite.name, sprite);

    // Reverse texture index
    const existing = this.textureMap.get(sprite.texturefile) || [];
    existing.push(sprite.name);
    this.textureMap.set(sprite.texturefile, existing);

    // Tag index
    for (const tag of sprite.tags) {
      const lower = tag.toLowerCase();
      if (!this.tagIndex.has(lower)) {
        this.tagIndex.set(lower, new Set());
      }
      this.tagIndex.get(lower)!.add(sprite.name);
    }
  }

  getSprite(name: string): GfxSprite | undefined {
    return this.spriteMap.get(name);
  }

  getSpritesByTexture(texturePath: string): string[] {
    return this.textureMap.get(texturePath) || [];
  }

  searchByTag(queryTag: string): GfxSprite[] {
    const matchedNames = this.tagIndex.get(queryTag.toLowerCase());
    if (!matchedNames) return [];
    return Array.from(matchedNames).map(name => this.spriteMap.get(name)!);
  }

  getAllSprites(): GfxSprite[] {
    return Array.from(this.spriteMap.values());
  }

  parseGfxScript(content: string): { indexedCount: number; duplicates: string[] } {
    const duplicates: string[] = [];
    let indexedCount = 0;

    // Match each spriteType = { ... } block
    const spriteRegex = /spriteType\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = spriteRegex.exec(content)) !== null) {
      const body = match[1];
      const nameM = body.match(/name\s*=\s*"([^"]+)"/) || body.match(/name\s*=\s*([a-zA-Z0-9_]+)/);
      const texM = body.match(/texturefile\s*=\s*"([^"]+)"/) || body.match(/texturefile\s*=\s*([a-zA-Z0-9_./\\]+)/);
      const framesM = body.match(/noOfFrames\s*=\s*(\d+)/);

      if (nameM && texM) {
        const name = nameM[1];
        const texturefile = texM[1].replace(/\\/g, '/');
        const noOfFrames = framesM ? parseInt(framesM[1], 10) : undefined;

        if (this.spriteMap.has(name)) {
          duplicates.push(name);
        }

        // Auto-tag based on name and path
        const tags: string[] = [];
        if (name.startsWith('GFX_goal_') || name.startsWith('GFX_focus_')) tags.push('focus', 'goal');
        if (name.startsWith('GFX_idea_')) tags.push('idea', 'spirit');
        if (name.startsWith('GFX_trait_')) tags.push('trait');
        if (name.startsWith('GFX_portrait_')) tags.push('portrait', 'leader');
        if (texturefile.includes('flags/')) tags.push('flag');
        if (texturefile.includes('decisions/')) tags.push('decision');

        this.indexSprite({
          name,
          texturefile,
          tags,
          noOfFrames,
        });
        indexedCount++;
      }
    }

    return { indexedCount, duplicates };
  }
}

export function reverseLookupGfx(
  gfxName: string,
  files: Array<{ path: string; content: string }>
): Array<{ path: string; line: number; content: string; contextType: string }> {
  const token = gfxName.trim();
  const results: Array<{ path: string; line: number; content: string; contextType: string }> = [];
  if (!token) return results;

  for (const file of files) {
    const lines = file.content.split('\n');
    lines.forEach((line, idx) => {
      const stripped = line.split('#')[0];
      if (stripped.includes(token)) {
        let contextType = 'script';
        if (file.path.includes('national_focus')) contextType = 'focus_tree';
        else if (file.path.includes('events')) contextType = 'event';
        else if (file.path.includes('characters')) contextType = 'character';
        else if (file.path.includes('ideas')) contextType = 'idea';
        else if (file.path.includes('decisions')) contextType = 'decision';
        else if (file.path.includes('.gui')) contextType = 'gui_layout';

        results.push({
          path: file.path,
          line: idx + 1,
          content: line.trim(),
          contextType,
        });
      }
    });
  }
  return results;
}
