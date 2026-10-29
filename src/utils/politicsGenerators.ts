import type {
  SuperEventDef,
  CountryWizardConfig,
  CountryWizardResult,
  GeneratedFile,
  CharacterDef,
  BopDefinition,
  FactionDef,
  IdeologyDefinition,
  AutonomyLevel,
  ScriptedDiploAction,
  TimedActivity,
  Hoi4Language,
} from '../types/politics';

/**
 * Marker prepended to generators whose syntax was reconstructed from memory of vanilla files
 * rather than checked against them (no game install was available). Remove once verified.
 */
export const UNVERIFIED_SYNTAX_NOTE = (dir: string, confidence: 'medium' | 'low') =>
  `# UNVERIFIED (${confidence} confidence): syntax written from memory of vanilla ${dir}; compare with the vanilla files and check error.log.`;

// ==========================================
// 1. Super Event Scaffolder & Code Generator
// ==========================================

export function validateSuperEventPayload(def: SuperEventDef): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!def.id || !/^[a-zA-Z0-9_]+$/.test(def.id)) {
    errors.push('Super Event ID must be alphanumeric with underscores.');
  }
  if (!def.titleText.trim()) errors.push('Title text is required.');
  if (!def.quoteText.trim()) errors.push('Quote text is required.');
  if (!def.buttonText.trim()) errors.push('Dismiss button text is required.');
  if (!def.soundEffect.trim()) errors.push('Sound effect identifier is required.');
  return { valid: errors.length === 0, errors };
}

export function generateSuperEventFiles(def: SuperEventDef): Record<string, string> {
  const cleanId = def.id.toLowerCase().replace(/^super_event_/, '');
  const prefix = `super_event_${cleanId}`;

  // 1. interface/superevents_<name>.gui
  const gui = `guiTypes = {
    containerWindowType = {
        name = "${prefix}_window"
        position = { x = 0 y = 0 }
        size = { width = 580 height = 660 }
        orientation = center
        origo = center
        moveable = no
        
        iconType = {
            name = "Background"
            spriteType = "GFX_${prefix}_frame_${def.frameSkin}"
            position = { x = 0 y = 0 }
        }
        iconType = {
            name = "Image"
            spriteType = "${def.bannerSprite || `GFX_${prefix}_image`}"
            position = { x = 18 y = 18 }
        }
        instantTextBoxType = {
            name = "Title"
            position = { x = 40 y = 370 }
            font = "hoi_24header"
            text = "${def.titleLocKey || `${prefix.toUpperCase()}_TITLE`}"
            maxWidth = 500
            format = center
        }
        instantTextBoxType = {
            name = "Quote"
            position = { x = 40 y = 430 }
            font = "hoi_18mbs"
            text = "${def.quoteLocKey || `${prefix.toUpperCase()}_QUOTE`}"
            maxWidth = 500
            format = center
        }
        buttonType = {
            name = "Option"
            position = { x = 140 y = 580 }
            shortcut = "RETURN"
            buttonFont = "hoi_20b"
            buttonText = "${def.buttonLocKey || `${prefix.toUpperCase()}_BTN`}"
            spriteType = "GFX_${prefix}_button"
        }
    }
}
`;

  // 2. common/scripted_guis/superevents_<name>_scripted_gui.txt
  const scriptedGui = `scripted_gui = {
    ${prefix}_window = {
        context_type = player_context
        window_name = "${prefix}_window"
        parent_window_token = top_bar
        visible = {
            has_global_flag = ${prefix}_active
        }
        effects = {
            Option_click = {
                clr_global_flag = ${prefix}_active
            }
        }
    }
}
`;

  // 3. sound/superevents_<name>.asset
  // Vanilla pairs a `sound` (the file) with a `soundeffect` (what scripts play); see sound/*.asset.
  const soundName = def.soundEffect || `${prefix}_sound`;
  const asset = `# NOTE: the audio file below is NOT generated; supply sound/superevents/${cleanId}.ogg yourself.
sound = {
    name = "${soundName}"
    file = "superevents/${cleanId}.ogg"
}

soundeffect = {
    name = "${soundName}"
    sounds = {
        sound = "${soundName}"
    }
    falloff = "falloff_100"
    is3d = no
    volume = 1.0
}
`;

  // 4. events/SuperEvents_<name>.txt
  const eventScript = `# Super Event Scaffolding for ${prefix}
add_namespace = superevent_${cleanId}

country_event = {
    id = superevent_${cleanId}.1
    title = ${def.titleLocKey || `${prefix.toUpperCase()}_TITLE`}
    desc = ${def.quoteLocKey || `${prefix.toUpperCase()}_QUOTE`}
    picture = ${def.bannerSprite || `GFX_${prefix}_image`}
    is_triggered_only = yes
    fire_only_once = ${def.fireOnlyOnce ? 'yes' : 'no'}
    hidden = no

    immediate = {
        set_global_flag = ${prefix}_active
        sound_effect = ${def.soundEffect || `${prefix}_sound`}
    }

    option = {
        name = ${def.buttonLocKey || `${prefix.toUpperCase()}_BTN`}
        ${def.effect ? def.effect : `custom_effect_tooltip = ${prefix}_tt`}
    }
}
`;

  return {
    [`interface/superevents_${cleanId}.gui`]: gui,
    [`common/scripted_guis/superevents_${cleanId}_scripted_gui.txt`]: scriptedGui,
    [`sound/superevents_${cleanId}.asset`]: asset,
    [`events/SuperEvents_${cleanId}.txt`]: eventScript,
  };
}

// ==========================================
// 2. TGA Flag Buffer Generator (32-bit BGRA)
// ==========================================

export function createTgaBuffer(
  width: number,
  height: number,
  rgb: [number, number, number] = [200, 20, 20]
): Uint8Array {
  const headerSize = 18;
  const pixelBytes = width * height * 4;
  const buffer = new Uint8Array(headerSize + pixelBytes);

  buffer[0] = 0; // ID length
  buffer[1] = 0; // Color map type (none)
  buffer[2] = 2; // Image type: 2 = uncompressed true-color
  buffer[8] = 0;
  buffer[9] = 0;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = width & 0xff;
  buffer[13] = (width >> 8) & 0xff;
  buffer[14] = height & 0xff;
  buffer[15] = (height >> 8) & 0xff;
  buffer[16] = 32; // 32 bits per pixel
  buffer[17] = 0x28; // 8 alpha bits

  const [r, g, b] = rgb;
  let offset = headerSize;
  for (let i = 0; i < width * height; i++) {
    buffer[offset++] = b; // Blue
    buffer[offset++] = g; // Green
    buffer[offset++] = r; // Red
    buffer[offset++] = 255; // Alpha
  }

  return buffer;
}

// ==========================================
// 3. UTF-8 BOM Enforcing Utilities
// ==========================================

export const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

export function hasUtf8Bom(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

export function prependUtf8Bom(text: string): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const result = new Uint8Array(3 + textBytes.length);
  result.set(UTF8_BOM, 0);
  result.set(textBytes, 3);
  return result;
}

export function stripUtf8Bom(bytes: Uint8Array): { hasBom: boolean; text: string } {
  const hasBom = hasUtf8Bom(bytes);
  const decoder = new TextDecoder('utf-8');
  if (hasBom) {
    return {
      hasBom: true,
      text: decoder.decode(bytes.subarray(3)),
    };
  }
  return {
    hasBom: false,
    text: decoder.decode(bytes),
  };
}

export function validateLocalizationEncoding(bytes: Uint8Array): { valid: boolean; error?: string } {
  if (bytes.length < 3) {
    return {
      valid: false,
      error: `File is too small (${bytes.length} bytes) to contain mandatory UTF-8 BOM [0xEF, 0xBB, 0xBF].`,
    };
  }
  if (!hasUtf8Bom(bytes)) {
    const hexHead = Array.from(bytes.subarray(0, Math.min(3, bytes.length)))
      .map((b) => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(', ');
    return {
      valid: false,
      error: `Missing mandatory UTF-8 BOM prefix [0xEF, 0xBB, 0xBF]. Found header bytes: [${hexHead}]. Paradox engine will fail to load or corrupt localisation characters.`,
    };
  }
  return { valid: true };
}

// ==========================================
// 4. Country Creation Wizard (10 Files / 7 Dirs)
// ==========================================

export function scaffoldCountryFiles(config: CountryWizardConfig): CountryWizardResult {
  const {
    tag,
    name,
    adjective,
    color,
    graphicalCulture,
    capitalProvinceId,
    stateId,
    stateName,
    stateProvinces,
    rulingParty,
    leaderName,
    leaderIdeology,
  } = config;

  const files: GeneratedFile[] = [];

  // 1. common/countries/<name>.txt
  const countryCommon = [
    `graphical_culture = ${graphicalCulture}`,
    `graphical_culture_2d = ${graphicalCulture}_2d`,
    `color = { ${color[0]} ${color[1]} ${color[2]} }`,
    '',
  ].join('\n');
  files.push({
    path: `common/countries/${name}.txt`,
    content: countryCommon,
    isBinary: false,
  });

  // 2. common/country_tags/<tag>.txt
  const tagContent = `${tag} = "countries/${name}.txt"\n`;
  files.push({
    path: `common/country_tags/${tag}.txt`,
    content: tagContent,
    isBinary: false,
  });

  // 3. history/countries/<tag> - <name>.txt
  const leaderId = `${tag}_${leaderName.replace(/\s+/g, '_').toLowerCase()}`;
  const countryHistory = [
    // `capital` takes a STATE id, not a province id.
    `capital = ${stateId}`,
    `set_research_slots = 3`,
    `set_convoys = 10`,
    `set_politics = {`,
    `\truling_party = ${rulingParty}`,
    `\tlast_election = "1936.1.1"`,
    `\telection_frequency = 48`,
    `\telections_allowed = ${rulingParty === 'democratic' ? 'yes' : 'no'}`,
    `}`,
    `set_popularities = {`,
    `\t${rulingParty} = 100`,
    `}`,
    `recruit_character = ${leaderId}`,
    '',
  ].join('\n');
  files.push({
    path: `history/countries/${tag} - ${name}.txt`,
    content: countryHistory,
    isBinary: false,
  });

  // 4. history/states/<stateId>-<stateName>.txt
  const stateHistory = [
    `state = {`,
    `\tid = ${stateId}`,
    `\tname = "STATE_${stateId}"`,
    `\tmanpower = 500000`,
    `\tstate_category = town`,
    `\thistory = {`,
    `\t\towner = ${tag}`,
    `\t\tadd_core_of = ${tag}`,
    `\t\tvictory_points = { ${capitalProvinceId} 10 }`,
    `\t\tbuildings = {`,
    `\t\t\tinfrastructure = 2`,
    `\t\t\tindustrial_complex = 1`,
    `\t\t\tarms_factory = 1`,
    `\t\t}`,
    `\t}`,
    `\tprovinces = { ${stateProvinces.join(' ')} }`,
    `\tlocal_supplies = 0.0`,
    `}`,
    '',
  ].join('\n');
  files.push({
    path: `history/states/${stateId}-${stateName}.txt`,
    content: stateHistory,
    isBinary: false,
  });

  // 5. gfx/flags/<tag>.tga (82x52)
  const standardFlag = createTgaBuffer(82, 52, color);
  files.push({
    path: `gfx/flags/${tag}.tga`,
    content: standardFlag,
    isBinary: true,
  });

  // 6. gfx/flags/medium/<tag>.tga (41x26)
  const mediumFlag = createTgaBuffer(41, 26, color);
  files.push({
    path: `gfx/flags/medium/${tag}.tga`,
    content: mediumFlag,
    isBinary: true,
  });

  // 7. gfx/flags/small/<tag>.tga (10x7)
  const smallFlag = createTgaBuffer(10, 7, color);
  files.push({
    path: `gfx/flags/small/${tag}.tga`,
    content: smallFlag,
    isBinary: true,
  });

  // 8. common/characters/<tag>.txt
  const characterContent = [
    `characters = {`,
    `\t${leaderId} = {`,
    `\t\tname = "${leaderName}"`,
    `\t\tportraits = {`,
    `\t\t\tcivilian = {`,
    `\t\t\t\tlarge = "${config.leaderPortrait || `GFX_portrait_${tag}_leader`}"`,
    `\t\t\t}`,
    `\t\t}`,
    `\t\tcountry_leader = {`,
    `\t\t\tideology = ${leaderIdeology}`,
    `\t\t\texpire = "1965.1.1"`,
    `\t\t\tid = -1`,
    `\t\t}`,
    `\t}`,
    `}`,
    '',
  ].join('\n');
  files.push({
    path: `common/characters/${tag}.txt`,
    content: characterContent,
    isBinary: false,
  });

  // 9. common/ideas/<tag>.txt
  const ideaContent = [
    `ideas = {`,
    `\tcountry = {`,
    `\t\t${tag}_national_spirit = {`,
    `\t\t\tpicture = generic_intel_bonus`,
    `\t\t\tallowed = { always = yes }`,
    `\t\t\tmodifier = {`,
    `\t\t\t\tpolitical_power_gain = 0.15`,
    `\t\t\t}`,
    `\t\t}`,
    `\t}`,
    `}`,
    '',
  ].join('\n');
  files.push({
    path: `common/ideas/${tag}.txt`,
    content: ideaContent,
    isBinary: false,
  });

  // 10. localisation/english/<tag>_l_english.yml (with mandatory UTF-8 BOM)
  const locYaml = [
    `l_english:`,
    ` ${tag}:0 "${name}"`,
    ` ${tag}_DEF:0 "The ${name}"`,
    ` ${tag}_ADJ:0 "${adjective}"`,
    ` STATE_${stateId}:0 "${stateName}"`,
    ` ${leaderId}:0 "${leaderName}"`,
    '',
  ].join('\n');
  const locBytes = prependUtf8Bom(locYaml);
  files.push({
    path: `localisation/english/${tag}_l_english.yml`,
    content: locBytes,
    isBinary: true,
  });

  const dirSet = new Set<string>();
  for (const f of files) {
    const parts = f.path.split('/');
    parts.pop();
    dirSet.add(parts.join('/'));
  }

  return {
    tag,
    files,
    directories: Array.from(dirSet),
  };
}

// ==========================================
// 5. Character Clausewitz Script Generator
// ==========================================

export function generateCharacterScript(characters: CharacterDef[]): string {
  const lines: string[] = ['characters = {'];

  for (const char of characters) {
    lines.push(`\t${char.token} = {`);
    lines.push(`\t\tname = "${char.name}"`);
    lines.push(`\t\tgender = ${char.gender || 'male'}`);

    // Portraits
    if (char.portraits) {
      lines.push(`\t\tportraits = {`);
      if (char.portraits.civilianLarge || char.portraits.civilianSmall) {
        lines.push(`\t\t\tcivilian = {`);
        if (char.portraits.civilianLarge) lines.push(`\t\t\t\tlarge = "${char.portraits.civilianLarge}"`);
        if (char.portraits.civilianSmall) lines.push(`\t\t\t\tsmall = "${char.portraits.civilianSmall}"`);
        lines.push(`\t\t\t}`);
      }
      if (char.portraits.armyLarge || char.portraits.armySmall) {
        lines.push(`\t\t\tarmy = {`);
        if (char.portraits.armyLarge) lines.push(`\t\t\t\tlarge = "${char.portraits.armyLarge}"`);
        if (char.portraits.armySmall) lines.push(`\t\t\t\tsmall = "${char.portraits.armySmall}"`);
        lines.push(`\t\t\t}`);
      }
      lines.push(`\t\t}`);
    }

    // Role: country_leader
    if (char.countryLeader) {
      lines.push(`\t\tcountry_leader = {`);
      lines.push(`\t\t\tideology = ${char.countryLeader.ideology}`);
      if (char.countryLeader.expire) lines.push(`\t\t\texpire = "${char.countryLeader.expire}"`);
      if (char.countryLeader.traits.length > 0) {
        lines.push(`\t\t\ttraits = { ${char.countryLeader.traits.join(' ')} }`);
      }
      lines.push(`\t\t\tid = ${char.countryLeader.id ?? -1}`);
      lines.push(`\t\t}`);
    }

    // Role: advisor
    if (char.advisor) {
      lines.push(`\t\tadvisor = {`);
      if (char.advisor.allowedTag) lines.push(`\t\t\tallowed = { original_tag = ${char.advisor.allowedTag} }`);
      lines.push(`\t\t\tslot = ${char.advisor.slot}`);
      if (char.advisor.ideaToken) lines.push(`\t\t\tidea_token = ${char.advisor.ideaToken}`);
      if (char.advisor.ledger) lines.push(`\t\t\tledger = ${char.advisor.ledger}`);
      if (char.advisor.cost !== undefined) lines.push(`\t\t\tcost = ${char.advisor.cost}`);
      if (char.advisor.traits.length > 0) {
        lines.push(`\t\t\ttraits = { ${char.advisor.traits.join(' ')} }`);
      }
      if (char.advisor.aiWillDo !== undefined) {
        lines.push(`\t\t\tai_will_do = { factor = ${char.advisor.aiWillDo.toFixed(1)} }`);
      }
      lines.push(`\t\t}`);
    }

    // Role: corps_commander
    if (char.corpsCommander) {
      lines.push(`\t\tcorps_commander = {`);
      lines.push(`\t\t\tskill = ${char.corpsCommander.skill}`);
      lines.push(`\t\t\tattack_skill = ${char.corpsCommander.attack}`);
      lines.push(`\t\t\tdefense_skill = ${char.corpsCommander.defense}`);
      lines.push(`\t\t\tplanning_skill = ${char.corpsCommander.planning}`);
      lines.push(`\t\t\tlogistics_skill = ${char.corpsCommander.logistics}`);
      if (char.corpsCommander.traits.length > 0) {
        lines.push(`\t\t\ttraits = { ${char.corpsCommander.traits.join(' ')} }`);
      }
      lines.push(`\t\t}`);
    }

    // Role: navy_leader (with Ship Captains)
    if (char.navyLeader) {
      lines.push(`\t\tnavy_leader = {`);
      lines.push(`\t\t\tskill = ${char.navyLeader.skill}`);
      lines.push(`\t\t\tattack_skill = ${char.navyLeader.attack}`);
      lines.push(`\t\t\tdefense_skill = ${char.navyLeader.defense}`);
      lines.push(`\t\t\tmaneuvering_skill = ${char.navyLeader.maneuvering}`);
      lines.push(`\t\t\tcoordination_skill = ${char.navyLeader.coordination}`);
      if (char.navyLeader.traits.length > 0) {
        lines.push(`\t\t\ttraits = { ${char.navyLeader.traits.join(' ')} }`);
      }
      lines.push(`\t\t}`);
    }

    // Role: scientist (Götterdämmerung)
    if (char.scientist) {
      lines.push(`\t\tscientist = {`);
      if (char.scientist.traits.length > 0) {
        lines.push(`\t\t\ttraits = { ${char.scientist.traits.join(' ')} }`);
      }
      if (Object.keys(char.scientist.specializations).length > 0) {
        lines.push(`\t\t\tskills = {`);
        for (const [spec, lvl] of Object.entries(char.scientist.specializations)) {
          lines.push(`\t\t\t\t${spec} = ${lvl}`);
        }
        lines.push(`\t\t\t}`);
      }
      lines.push(`\t\t}`);
    }

    lines.push(`\t}`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ==========================================
// 6. Balance of Power (BoP) Generator & Calculator
// ==========================================

export function generateBopScript(bop: BopDefinition): string {
  // common/bop/*.txt. Layout (initial_value / left_side / right_side / range / side = { range }) matches
  // my recollection of vanilla; key names inside ranges are UNVERIFIED (medium confidence).
  const lines: string[] = [UNVERIFIED_SYNTAX_NOTE('common/bop/', 'medium'), `${bop.token} = {`];
  lines.push(`\tinitial_value = ${bop.initialValue.toFixed(2)}`);
  lines.push(`\tleft_side = ${bop.leftSide}`);
  lines.push(`\tright_side = ${bop.rightSide}`);
  if (bop.decisionCategory) {
    lines.push(`\tdecision_category = ${bop.decisionCategory}`);
  }

  // Neutral Range Bracket
  if (bop.neutralRange) {
    lines.push(`\trange = {`);
    lines.push(`\t\tid = ${bop.neutralRange.id}`);
    lines.push(`\t\tmin = ${bop.neutralRange.min.toFixed(2)}`);
    lines.push(`\t\tmax = ${bop.neutralRange.max.toFixed(2)}`);
    if (Object.keys(bop.neutralRange.modifiers).length > 0) {
      lines.push(`\t\tmodifier = {`);
      for (const [k, v] of Object.entries(bop.neutralRange.modifiers)) {
        lines.push(`\t\t\t${k} = ${v}`);
      }
      lines.push(`\t\t}`);
    }
    lines.push(`\t}`);
  }

  // Left & Right Sides
  for (const side of bop.sides) {
    lines.push(`\tside = {`);
    lines.push(`\t\tid = ${side.id}`);
    if (side.icon) lines.push(`\t\ticon = ${side.icon}`);
    for (const r of side.ranges) {
      lines.push(`\t\trange = {`);
      lines.push(`\t\t\tid = ${r.id}`);
      lines.push(`\t\t\tmin = ${r.min.toFixed(2)}`);
      lines.push(`\t\t\tmax = ${r.max.toFixed(2)}`);
      if (Object.keys(r.modifiers).length > 0) {
        lines.push(`\t\t\tmodifier = {`);
        for (const [k, v] of Object.entries(r.modifiers)) {
          lines.push(`\t\t\t\t${k} = ${v}`);
        }
        lines.push(`\t\t\t}`);
      }
      if (r.onActivate) {
        lines.push(`\t\t\ton_activate = { ${r.onActivate} }`);
      }
      if (r.onDeactivate) {
        lines.push(`\t\t\ton_deactivate = { ${r.onDeactivate} }`);
      }
      lines.push(`\t\t}`);
    }
    lines.push(`\t}`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function getActiveBopModifiers(
  bop: BopDefinition,
  currentValue: number
): { activeRangeId?: string; modifiers: Record<string, number | string>; activeSideId?: string } {
  // Check neutral range first
  if (bop.neutralRange && currentValue >= bop.neutralRange.min && currentValue <= bop.neutralRange.max) {
    return {
      activeRangeId: bop.neutralRange.id,
      modifiers: bop.neutralRange.modifiers,
      activeSideId: 'neutral',
    };
  }

  // Check sides
  for (const side of bop.sides) {
    for (const r of side.ranges) {
      if (currentValue >= r.min && currentValue <= r.max) {
        return {
          activeRangeId: r.id,
          modifiers: r.modifiers,
          activeSideId: side.id,
        };
      }
    }
  }

  return { modifiers: {} };
}

// ==========================================
// 7. Faction Studio (NCNS) Code Generator
// ==========================================

export function generateFactionScript(faction: FactionDef): { rulesScript: string; goalsScript: string } {
  // Schema follows common/factions/rules/*.txt (`type = member_rules`, `trigger`) and
  // common/factions/_documentation.md (faction goals). The vanilla files have no keys for veto,
  // tension thresholds or member lists, so those settings are kept as comments instead of invented keys.
  const slug = faction.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const r = faction.rules;
  const rulesLines = [
    `# Faction rule for ${faction.name}`,
    UNVERIFIED_SYNTAX_NOTE('common/factions/rules/', 'medium'),
    `# Not expressible as vanilla keys (set via the matching rule types if needed): leader veto peace = ${r.leaderVetoPeace}, puppets may join = ${r.canPuppetJoin}, tension threshold = ${r.worldTensionThreshold}, offensive wars = ${r.offensiveWarAllowed}, mutual defence = ${r.mutualDefenseTrigger}`,
    `# Intended members: ${faction.memberTags.join(' ')}`,
    `${slug}_leader_only = {`,
    `\ttype = member_rules`,
    `\ttrigger = {`,
    `\t\tis_faction_leader = yes`,
    `\t}`,
    `}`,
  ];

  const goalLines = [
    `# Faction Goals for ${faction.name}`,
    UNVERIFIED_SYNTAX_NOTE('common/factions/goals/', 'medium'),
  ];
  for (const g of faction.goals) {
    goalLines.push(`faction_goal_${g.id} = {`);
    goalLines.push(`\t# Define these localisation keys: ${g.id}_goal_name = "${g.name}", ${g.id}_goal_desc = "${g.description}"`);
    goalLines.push(`\tname = ${g.id}_goal_name`);
    goalLines.push(`\tdescription = ${g.id}_goal_desc`);
    goalLines.push(`\tcategory = short_term`);
    goalLines.push(`\tvisible = { always = yes }`);
    goalLines.push(`\tcompleted = { always = no }`);
    if (Object.keys(g.rewardModifier).length > 0) {
      goalLines.push(`\t# Intended reward (apply via complete_effect): ${Object.entries(g.rewardModifier).map(([k, v]) => `${k} = ${v}`).join(', ')}`);
    }
    goalLines.push(`\tcomplete_effect = { }`);
    goalLines.push(`}`);
  }

  return {
    rulesScript: rulesLines.join('\n'),
    goalsScript: goalLines.join('\n'),
  };
}

// ==========================================
// 8. Ideology Studio Code Generator
// ==========================================

/** common/ideologies/*.txt. Structure follows vanilla 00_ideologies.txt (UNVERIFIED, medium confidence). */
export function generateIdeologyScript(ideologies: IdeologyDefinition[]): string {
  const lines = [UNVERIFIED_SYNTAX_NOTE('common/ideologies/00_ideologies.txt', 'medium'), 'ideologies = {'];

  for (const ideo of ideologies) {
    lines.push(`\t${ideo.name} = {`);
    lines.push(`\t\ttypes = {`);
    for (const st of ideo.subTypes) {
      lines.push(`\t\t\t${st} = {`);
      lines.push(`\t\t\t\tcan_be_randomly_selected = no`);
      lines.push(`\t\t\t}`);
    }
    lines.push(`\t\t}`);
    lines.push(`\t\t# Entries are localisation keys, e.g. FACTION_NAME_${ideo.name.toUpperCase()}_1`);
    lines.push(`\t\tdynamic_faction_names = {`);
    for (const fn of ideo.dynamicFactionNames) {
      lines.push(`\t\t\t"${fn}"`);
    }
    lines.push(`\t\t}`);
    lines.push(`\t\tcolor = { ${ideo.color[0]} ${ideo.color[1]} ${ideo.color[2]} }`);
    lines.push(`\t\trules = {`);
    for (const [rk, rv] of Object.entries(ideo.rules)) {
      lines.push(`\t\t\t${rk} = ${rv ? 'yes' : 'no'}`);
    }
    lines.push(`\t\t}`);
    lines.push(`\t\tcan_host_government_in_exile = ${ideo.canHostGovernmentInExile === false ? 'no' : 'yes'}`);
    lines.push(`\t\twar_impact_on_world_tension = ${ideo.warImpactOnWorldTension.toFixed(2)}`);
    lines.push(`\t\tfaction_impact_on_world_tension = ${(ideo.factionImpactOnWorldTension ?? 0.1).toFixed(2)}`);
    lines.push(`\t}`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ==========================================
// 9. Autonomy Progression Code Generator
// ==========================================

/**
 * common/autonomous_states/*.txt. Vanilla wraps every level in `autonomy_state = { id = ... }`
 * (the previous `autonomy_<id> = { }` form was not a valid top-level key). UNVERIFIED, medium confidence.
 */
export function generateAutonomyScript(levels: AutonomyLevel[]): string {
  const lines = [
    '# Autonomy Progression Levels (common/autonomous_states/)',
    UNVERIFIED_SYNTAX_NOTE('common/autonomous_states/00_autonomous_states.txt', 'medium'),
  ];

  for (const lvl of levels) {
    const id = lvl.id.startsWith('autonomy_') ? lvl.id : `autonomy_${lvl.id}`;
    lines.push(`autonomy_state = {`);
    lines.push(`\tid = ${id}`);
    lines.push(`\tdefault = no`);
    lines.push(`\tis_puppet = yes`);
    lines.push(`\tmin_freedom_level = ${lvl.minFreedomLevel.toFixed(2)}`);
    lines.push(`\tmanpower_influence = ${lvl.manpowerInfluence.toFixed(2)}`);
    lines.push(`\trule = {`);
    for (const [rk, rv] of Object.entries(lvl.rules)) {
      lines.push(`\t\t${rk} = ${rv ? 'yes' : 'no'}`);
    }
    lines.push(`\t}`);
    if (Object.keys(lvl.modifiers).length > 0) {
      lines.push(`\tmodifier = {`);
      for (const [mk, mv] of Object.entries(lvl.modifiers)) {
        lines.push(`\t\t${mk} = ${mv}`);
      }
      lines.push(`\t}`);
    }
    lines.push(`}\n`);
  }

  return lines.join('\n');
}

// ==========================================
// 10. Scripted Diplo Actions & Timed Activities
// ==========================================

export function generateDiploActionScript(action: ScriptedDiploAction): string {
  // common/scripted_diplomatic_actions/*.txt. Vanilla groups AI acceptance under a named sub-block
  // and has a `selectable` trigger. UNVERIFIED, low-to-medium confidence.
  return `# Scripted Diplomatic Action: ${action.name}
${UNVERIFIED_SYNTAX_NOTE('common/scripted_diplomatic_actions/', 'low')}
scripted_diplomatic_actions = {
    ${action.id} = {
        allowed = {
            ${action.allowedTrigger || 'always = yes'}
        }
        visible = {
            ${action.visibleTrigger || 'always = yes'}
        }
        selectable = {
            always = yes
        }
        requires_acceptance = ${action.requiresAcceptance ? 'yes' : 'no'}
        cost = ${action.costPP}
        command_power = ${action.costCP}

        ai_acceptance = {
            ${action.id}_acceptance = {
                ${action.aiAcceptanceFormula || 'base = 50'}
            }
        }

        on_sent_effect = {
            ${action.onSentEffect || ''}
        }
        complete_effect = {
            ${action.completeEffect || ''}
        }
        reject_effect = {
            ${action.rejectEffect || ''}
        }
    }
}
`;
}

export function generateTimedActivityScript(act: TimedActivity): string {
  // Vanilla common/timed_activities/00_stage_coup.txt only defines `equipment_need = { <equipment> = <amount> }`.
  // Duration and expiry effects are not part of the schema, so they are kept as comments.
  const costLines = Object.entries(act.equipmentCost)
    .map(([k, v]) => `\t\t${k} = ${v}`)
    .join('\n');

  return `# Timed National Activity: ${act.name}
# Vanilla only supports equipment_need here. Not expressible: duration = ${act.durationDays} days, cancel trigger, on-expire effect.
${UNVERIFIED_SYNTAX_NOTE('common/timed_activities/', 'medium')}
${act.id} = {
\tequipment_need = {
${costLines}
\t}
}
`;
}

// ==========================================
// 11. Symbol Refactoring Engine & Diff Generator
// ==========================================

function isIdentChar(c: string): boolean {
  return /[a-zA-Z0-9_]/.test(c);
}

export function refactorSymbolInContent(
  text: string,
  oldSym: string,
  newSym: string
): { newContent: string; count: number } {
  if (!oldSym || oldSym === newSym) return { newContent: text, count: 0 };

  let count = 0;
  let result = '';
  let i = 0;
  const len = oldSym.length;

  while (i < text.length) {
    if (text.slice(i, i + len) === oldSym) {
      const leftOk = i === 0 || !isIdentChar(text[i - 1]);
      const rightOk = i + len === text.length || !isIdentChar(text[i + len]);
      if (leftOk && rightOk) {
        result += newSym;
        count++;
        i += len;
        continue;
      }
    }
    result += text[i];
    i++;
  }

  return { newContent: result, count };
}

export function generateUnifiedDiff(filePath: string, oldText: string, newText: string): string {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  let diff = `--- a/${filePath}\n+++ b/${filePath}\n`;
  let hasChange = false;

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let idx = 0; idx < maxLen; idx++) {
    const oLine = oldLines[idx];
    const nLine = newLines[idx];

    if (oLine !== nLine) {
      hasChange = true;
      diff += `@@ -${idx + 1},1 +${idx + 1},1 @@\n`;
      if (oLine !== undefined) diff += `-${oLine}\n`;
      if (nLine !== undefined) diff += `+${nLine}\n`;
    }
  }

  return hasChange ? diff : '';
}

// ==========================================
// 12. Multi-Language Localization Matrix
// ==========================================

export const ALL_HOI4_LANGUAGES: { key: Hoi4Language; label: string }[] = [
  { key: 'english', label: 'English' },
  { key: 'braz_por', label: 'Portuguese (Brazil)' },
  { key: 'french', label: 'French' },
  { key: 'german', label: 'German' },
  { key: 'japanese', label: 'Japanese' },
  { key: 'korean', label: 'Korean' },
  { key: 'polish', label: 'Polish' },
  { key: 'russian', label: 'Russian' },
  { key: 'simp_chinese', label: 'Simplified Chinese' },
  { key: 'spanish', label: 'Spanish' },
];

export function formatLocalizationYaml(
  lang: Hoi4Language,
  entries: { key: string; value: string }[]
): Uint8Array {
  const lines = [`l_${lang}:`];
  for (const entry of entries) {
    lines.push(` ${entry.key}:0 "${entry.value}"`);
  }
  lines.push('');
  return prependUtf8Bom(lines.join('\n'));
}
