import { generateIdeologyScript, generateCharacterScript, formatLocalizationYaml } from '../../src/utils/politicsGenerators';
import { ClausewitzFocusParser } from '../../src/utils/clausewitzParser';
import { resizeRgba, encodeTga32, type Rgba } from '../../src/utils/imageAssets';
import { generateOobFile, countryHistoryExtras } from '../../src/utils/contentGenerators';
import { generateDivisionTemplateScript } from '../../src/utils/phase4Generators';
import type { World, State } from './worldgen';
import { makeRng } from './worldgen';
import type { OutFiles } from './mapfiles';
import type { IdeologyDefinition, CharacterDef } from '../../src/types/politics';
import type { FocusNodeData } from '../../src/types/focus';
import type { DivisionTemplateState, BattalionDef } from '../../src/types/military';

/** Countries, ideologies, history, characters, focus trees, flags and localisation for the Ashen Concord world. */

const T = String.fromCharCode(9);
const NL = String.fromCharCode(10);

export const MOD_ID = 'ashen_concord';
export const MOD_NAME = 'The Ashen Concord (Total Conversion)';

// ---------------------------------------------------------------------------
// Ideologies
// ---------------------------------------------------------------------------

export interface IdeoDef {
  id: string;
  name: string;
  desc: string;
  color: [number, number, number];
  subs: { id: string; name: string }[];
  party: string; // party name pattern, {adj} is replaced by the country adjective
}

export const IDEOLOGIES: IdeoDef[] = [
  { id: 'concordism', name: 'Concordism', desc: 'Rule by civic assemblies bound by a shared charter.', color: [60, 130, 210], party: '{adj} Concord Assembly',
    subs: [{ id: 'concord_civic', name: 'Civic Concordism' }, { id: 'concord_liberal', name: 'Liberal Concordism' }] },
  { id: 'syndicalism', name: 'Syndicalism', desc: 'Rule by federated labour guilds and workers councils.', color: [200, 60, 50], party: '{adj} Guild Federation',
    subs: [{ id: 'syndic_union', name: 'Union Syndicalism' }, { id: 'syndic_vanguard', name: 'Vanguard Syndicalism' }] },
  { id: 'dominionism', name: 'Dominionism', desc: 'Rule by a single directorate in the name of national destiny.', color: [120, 70, 40], party: '{adj} Directorate',
    subs: [{ id: 'dominion_directorate', name: 'Directorate Dominionism' }, { id: 'dominion_cult', name: 'Cult Dominionism' }] },
  { id: 'traditionalism', name: 'Traditionalism', desc: 'Rule by hereditary houses and ancient custom.', color: [190, 160, 60], party: '{adj} Royal House',
    subs: [{ id: 'trad_crown', name: 'Crown Traditionalism' }, { id: 'trad_council', name: 'Council Traditionalism' }] },
  { id: 'technocracy', name: 'Technocracy', desc: 'Rule by councils of engineers and planners.', color: [90, 170, 150], party: '{adj} Planning Council',
    subs: [{ id: 'techno_council', name: 'Council Technocracy' }, { id: 'techno_machine', name: 'Machine Technocracy' }] },
];

export function ideologyScript(): string {
  const defs: IdeologyDefinition[] = IDEOLOGIES.map((i) => ({
    name: i.id,
    group: 'custom',
    color: i.color,
    subTypes: i.subs.map((s) => s.id),
    rules: { can_force_government: i.id !== 'concordism', can_puppet: i.id !== 'concordism', can_send_volunteers: true, can_be_spymaster: true, can_declare_war_on_same_ideology: i.id === 'dominionism' },
    warImpactOnWorldTension: i.id === 'dominionism' ? 0.5 : 0.25,
    dynamicFactionNames: [1, 2, 3].map((n) => `FACTION_NAME_${i.id.toUpperCase()}_${n}`),
  }));
  return generateIdeologyScript(defs);
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

export interface CountryDef {
  tag: string;
  name: string;
  adj: string;
  color: [number, number, number];
  ideology: string; // ruling group
  leader: string;
  syllables: string[];
}

export const COUNTRIES: CountryDef[] = [
  { tag: 'AUR', name: 'Aurelian Concordat', adj: 'Aurelian', color: [66, 120, 200], ideology: 'concordism', leader: 'Mara Veldt', syllables: ['aur', 'vel', 'ton', 'mar', 'sol'] },
  { tag: 'VRD', name: 'Verdane Technate', adj: 'Verdane', color: [60, 160, 110], ideology: 'technocracy', leader: 'Ilan Voss', syllables: ['ver', 'dan', 'gro', 'lyn', 'thas'] },
  { tag: 'KRS', name: 'Karst Guild Federation', adj: 'Karstic', color: [190, 55, 50], ideology: 'syndicalism', leader: 'Brannoc Hale', syllables: ['kar', 'ston', 'bre', 'fal', 'ock'] },
  { tag: 'OST', name: 'Kingdom of Ostrin', adj: 'Ostrin', color: [200, 170, 70], ideology: 'traditionalism', leader: 'Edric Rowan', syllables: ['ost', 'rin', 'hal', 'wyn', 'dor'] },
  { tag: 'HAL', name: 'Halcyon League', adj: 'Halcyon', color: [110, 190, 210], ideology: 'concordism', leader: 'Sela Quillon', syllables: ['hal', 'cy', 'on', 'pel', 'ris'] },
  { tag: 'DSK', name: 'Duskmoor Directorate', adj: 'Duskmoor', color: [120, 70, 60], ideology: 'dominionism', leader: 'Voren Skadi', syllables: ['dusk', 'moor', 'gar', 'nox', 'ul'] },
  { tag: 'SLV', name: 'Silvermere Crown', adj: 'Silvermere', color: [170, 175, 195], ideology: 'traditionalism', leader: 'Anwen Marsh', syllables: ['sil', 'ver', 'mere', 'lan', 'ish'] },
  { tag: 'IRV', name: 'Ironvale Council', adj: 'Ironvale', color: [100, 100, 110], ideology: 'dominionism', leader: 'Torgan Reiss', syllables: ['iron', 'vale', 'bar', 'zek', 'hold'] },
];

const SUFFIX = ['ia', 'mark', 'vale', 'ford', 'haven', 'reach', 'holm', 'gate', 'moor', 'wick'];

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function nameStates(world: World): void {
  const rng = makeRng(31);
  const used = new Set<string>();
  for (const st of world.states) {
    const c = COUNTRIES[st.owner];
    let name = '';
    for (let tries = 0; tries < 30; tries++) {
      name = cap(rng.pick(c.syllables)) + rng.pick(SUFFIX);
      if (!used.has(name)) break;
      name += ' ' + ['North', 'South', 'East', 'West', 'Upper', 'Lower'][rng.int(6)];
      if (!used.has(name)) break;
    }
    used.add(name);
    st.name = name;
  }
}

const RESOURCE_NAMES = ['steel', 'aluminium', 'tungsten', 'chromium', 'rubber', 'oil'];

function stateFile(world: World, st: State): string {
  const P = (id: number) => world.provinces[id - 1];
  const rng = makeRng(st.id * 97);
  const area = st.provinces.reduce((a, m) => a + P(m).area, 0);
  const manpower = Math.round((area / 12) * (0.6 + rng.next()) / 1000) * 1000 + 40000;
  const category = manpower > 700000 ? 'large_city' : manpower > 450000 ? 'city' : manpower > 250000 ? 'large_town' : manpower > 120000 ? 'town' : 'rural';
  const lines: string[] = ['state = {', `${T}id = ${st.id}`, `${T}name = "STATE_${st.id}"`, `${T}manpower = ${manpower}`, `${T}state_category = ${category}`, ''];
  const res = RESOURCE_NAMES.filter(() => rng.next() < 0.28).slice(0, 3);
  if (res.length > 0) lines.push(`${T}resources = {`, ...res.map((r) => `${T}${T}${r} = ${5 + rng.int(40)}`), `${T}}`, '');
  const isCapital = world.countryCapitalStates[st.owner] === st.id;
  lines.push(`${T}history = {`, `${T}${T}owner = ${COUNTRIES[st.owner].tag}`, `${T}${T}add_core_of = ${COUNTRIES[st.owner].tag}`);
  lines.push(`${T}${T}victory_points = { ${st.capitalProvince} ${isCapital ? 20 : 3 + rng.int(5)} }`);
  lines.push(`${T}${T}buildings = {`, `${T}${T}${T}infrastructure = ${2 + rng.int(3)}`);
  if (isCapital) lines.push(`${T}${T}${T}industrial_complex = 4`, `${T}${T}${T}arms_factory = 3`, `${T}${T}${T}air_base = 2`);
  else if (rng.next() < 0.5) lines.push(`${T}${T}${T}industrial_complex = ${1 + rng.int(2)}`, `${T}${T}${T}arms_factory = ${rng.int(2)}`);
  lines.push(`${T}${T}}`, `${T}}`, '');
  lines.push(`${T}provinces = {`, `${T}${T}${st.provinces.slice().sort((a, b) => a - b).join(' ')} `, `${T}}`, '', `${T}local_supplies = 0.0`, '}', '');
  return lines.join(NL);
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

function flagImage(c: CountryDef, ideo: IdeoDef, variant: number): Rgba {
  const W = 164, H = 104;
  const data = new Uint8Array(W * H * 4);
  const [r, g, b] = c.color;
  const [ir, ig, ib] = ideo.color;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col: [number, number, number];
    const band = Math.floor((y / H) * 3);
    if (variant % 3 === 0) col = band === 1 ? [ir, ig, ib] : [r, g, b];
    else if (variant % 3 === 1) col = x < W / 3 ? [ir, ig, ib] : [r, g, b];
    else col = Math.abs(x - W / 2) + Math.abs(y - H / 2) < H / 2.3 ? [ir, ig, ib] : [r, g, b];
    data.set([col[0], col[1], col[2], 255], (y * W + x) * 4);
  }
  return { width: W, height: H, data };
}

/** A country with no states that exists only so vanilla files listing tags (AI design blocks) have a valid tag to name. */
export const DUMMY_TAG = 'ZZZ';

function flagFiles(): OutFiles {
  const files: OutFiles = {};
  const sizes: Array<[string, number, number]> = [['gfx/flags/', 82, 52], ['gfx/flags/medium/', 41, 26], ['gfx/flags/small/', 10, 7]];
  COUNTRIES.forEach((c, ci) => {
    const base = IDEOLOGIES.find((i) => i.id === c.ideology)!;
    const variants: Array<[string, IdeoDef]> = [['', base], ...IDEOLOGIES.map((i): [string, IdeoDef] => [`_${i.id}`, i])];
    for (const [suffix, ideo] of variants) {
      const img = flagImage(c, ideo, ci);
      for (const [dir, w, h] of sizes) files[`${dir}${c.tag}${suffix}.tga`] = encodeTga32(resizeRgba(img, w, h));
    }
  });
  // the hidden dummy tag needs the same flag set as any country
  const dummy = { ...COUNTRIES[0], tag: DUMMY_TAG };
  for (const [suffix, ideo] of [['', IDEOLOGIES[0]] as [string, IdeoDef], ...IDEOLOGIES.map((i): [string, IdeoDef] => [`_${i.id}`, i])]) {
    const img = flagImage(dummy, ideo, 0);
    for (const [dir, w, h] of sizes) files[`${dir}${DUMMY_TAG}${suffix}.tga`] = encodeTga32(resizeRgba(img, w, h));
  }
  return files;
}

// ---------------------------------------------------------------------------
// Focus trees
// ---------------------------------------------------------------------------

function focusTree(c: CountryDef, ci: number, world: World): string {
  const t = c.tag;
  const mine = world.states.filter((s) => s.owner === ci);
  const coastal = mine.some((s) => s.coastal);
  const node = (id: string, name: string, icon: string, x: number, y: number, pre: string[], reward: string[], extra: Partial<FocusNodeData> = {}): FocusNodeData => ({
    id: `${t}_${id}`, name, symbol: '★', icon, cost: 5, x, y,
    prerequisites: pre.map((p) => [`${t}_${p}`]), prereqMode: 'all', mutually_exclusive: [],
    description: `${name} for ${c.name}.`, reward: reward.join(NL), ai: 10, ...extra,
  });
  const nodes: FocusNodeData[] = [
    node('national_charter', 'National Charter', 'GFX_goal_generic_national_unity', 3, 0, [], ['add_political_power = 75', `add_stability = 0.05`]),
    node('industrial_drive', 'Industrial Drive', 'GFX_goal_generic_construct_civ_factory', 1, 1, ['national_charter'], [`random_owned_controlled_state = { limit = { free_building_slots = { building = industrial_complex size > 0 include_locked = yes } } add_building_construction = { type = industrial_complex level = 1 instant_build = yes } }`]),
    node('war_college', 'War College', 'GFX_goal_generic_army_doctrines', 3, 1, ['national_charter'], ['army_experience = 25', 'add_war_support = 0.05']),
    node('scientific_bureau', 'Scientific Bureau', 'GFX_goal_generic_scientific_exchange', 5, 1, ['national_charter'], ['add_research_slot = 1']),
    node('arms_production', 'Arms Production', 'GFX_goal_generic_construct_mil_factory', 1, 2, ['industrial_drive'], [`random_owned_controlled_state = { limit = { free_building_slots = { building = arms_factory size > 0 include_locked = yes } } add_building_construction = { type = arms_factory level = 1 instant_build = yes } }`]),
    node('border_forts', 'Border Fortifications', 'GFX_goal_generic_defence', 3, 2, ['war_college'], ['add_ideas = ' + t + '_hardened_borders']),
    coastal ? node('maritime_charter', 'Maritime Charter', 'GFX_goal_generic_navy_doctrines_tactics', 5, 2, ['scientific_bureau'], ['add_political_power = 50']) : node('highland_survey', 'Highland Survey', 'GFX_goal_generic_scientific_exchange', 5, 2, ['scientific_bureau'], ['add_political_power = 50']),
    node('regional_leadership', 'Regional Leadership', 'GFX_goal_generic_political_pressure', 3, 3, ['arms_production', 'border_forts'], ['add_stability = 0.05', 'add_war_support = 0.05'], { prereqMode: 'all' }),
  ];
  return ClausewitzFocusParser.generateScript({ version: 1, treeId: `${t}_focus`, tag: t, title: `${c.name} focus tree`, nodes } as never) + NL;
}

// ---------------------------------------------------------------------------
// The mod
// ---------------------------------------------------------------------------

const REPLACE_PATHS = [
  // history is entirely vanilla-world content
  'history/states', 'history/countries', 'history/units', 'history/general',
  // the world definition
  'common/bookmarks', 'common/characters', 'common/countries', 'common/country_tags', 'common/country_tag_aliases', 'common/ideologies',
  'common/national_focus', 'common/decisions', 'common/on_actions', 'common/names',
  // AI and organisation data keyed to vanilla tags
  'common/ai_strategy', 'common/ai_strategy_plans', 'common/ai_faction_theaters', 'common/ai_areas', 'common/ai_focuses', 'common/ai_templates',
  'common/military_industrial_organization', 'common/intelligence_agencies', 'common/scripted_localisation', 'common/scripted_guis',
  'common/units/names_divisions', 'common/units/names_ships', 'common/factions/goals',
  // The whole vanilla map folder goes: a mixed map (our provinces with vanilla buildings, unit stacks, textures sized
  // for another map) is what the game rejects.
  // replace_path is not recursive, so map subfolders holding per-region files are listed too (map/terrain keeps the
  // vanilla textures, which are not tied to province ids).
  // like other total conversions: ideas and leader traits are all written for vanilla tags, so the mod ships its own
  'common/ideas', 'common/country_leader',
  'gfx/flags', 'gfx/flags/medium', 'gfx/flags/small',
  'common/military_industrial_organization/organizations', 'common/decisions/categories', 'common/raids', 'common/technology_sharing',
  // script libraries written against vanilla tags and ideologies; nothing that remains refers to them
  'common/scripted_effects', 'common/scripted_triggers', 'common/peace_conference/ai_peace', 'common/peace_conference/cost_modifiers',
  'map', 'map/strategicregions', 'map/supplyareas', 'events', 'tutorial', 'common/units/names', 'common/units/names_railway_guns', 'common/units/codenames_operatives',
];

export function descriptorBody(withPath: boolean): string {
  return [
    'version="0.1.0"',
    'tags={', `${T}"Total Conversion"`, `${T}"Alternative History"`, `${T}"Map"`, `${T}"Ideologies"`, '}',
    `name="${MOD_NAME}"`,
    'supported_version="1.19.*"',
    ...REPLACE_PATHS.filter((p) => !(process.env.OVERHAUL_KEEP ?? '').split(',').some((k) => k === '*' || k === p)).map((p) => `replace_path="${p}"`),
    ...(withPath ? [`path="mod/${MOD_ID}"`] : []),
    '',
  ].join(NL);
}

const SKILLS = (n: number) => ({ skill: 2 + (n % 3), attack: 2, defense: 3, planning: 2, logistics: 2, traits: [] as string[] });

export function renderContent(world: World): OutFiles {
  nameStates(world);
  const files: OutFiles = {};
  const P = (id: number) => world.provinces[id - 1];

  files['common/ideologies/ashen_ideologies.txt'] = ideologyScript();

  // ---- country definitions
  files['common/country_tags/ashen_countries.txt'] = [...COUNTRIES.map((c) => `${c.tag} = "countries/${c.name}.txt"`), `${DUMMY_TAG} = "countries/Unclaimed.txt"`].join(NL) + NL;
  files['common/countries/Unclaimed.txt'] = ['graphical_culture = western_european_gfx', 'graphical_culture_2d = western_european_2d', 'color = { 90 90 90 }', ''].join(NL);
  const colors: string[] = [];
  COUNTRIES.forEach((c) => {
    files[`common/countries/${c.name}.txt`] = ['graphical_culture = western_european_gfx', 'graphical_culture_2d = western_european_2d', `color = { ${c.color.join(' ')} }`, ''].join(NL);
    colors.push(`${c.tag} = {`, `${T}color = rgb { ${c.color.join(' ')} }`, `${T}color_ui = rgb { ${c.color.join(' ')} }`, '}');
  });
  colors.push(`${DUMMY_TAG} = {`, `${T}color = rgb { 90 90 90 }`, `${T}color_ui = rgb { 90 90 90 }`, '}');
  files['common/countries/colors.txt'] = colors.join(NL) + NL;

  files[`history/countries/${DUMMY_TAG} - Unclaimed.txt`] = [`capital = ${world.countryCapitalStates[0]}`, 'set_politics = {', `${T}ruling_party = ${IDEOLOGIES[0].id}`, `${T}last_election = "1932.1.1"`, `${T}election_frequency = 48`, `${T}elections_allowed = no`, '}', 'set_popularities = {', ...IDEOLOGIES.map((i, k) => `${T}${i.id} = ${k === 0 ? 100 - 5 * (IDEOLOGIES.length - 1) : 5}`), '}', ''].join(NL);

  // ---- states
  for (const st of world.states) files[`history/states/${st.id}-${st.name.replace(/ /g, '_')}.txt`] = stateFile(world, st);

  // ---- per-country files
  const chars: Record<string, CharacterDef[]> = {};
  const loc: { key: string; value: string }[] = [];
  const L = (key: string, value: string) => loc.push({ key, value });
  const ideaBlocks: string[] = [];
  const template = (name: string, grid: string[], support: string[]): string => generateDivisionTemplateScript({
    name,
    grid: [grid.map((id) => ({ id }) as unknown as BattalionDef), [null, null, null], [null, null, null], [null, null, null], [null, null, null]].map((col, i) => (i === 0 ? [...col, null, null].slice(0, 5) : [null, null, null, null, null])) as never,
    supportCompanies: support.map((id) => ({ id }) as unknown as BattalionDef),
    regimentalAttachments: [],
  } as unknown as DivisionTemplateState);

  COUNTRIES.forEach((c, ci) => {
    const rng = makeRng(ci * 13 + 5);
    const mine = world.states.filter((s) => s.owner === ci);
    const capState = world.states[world.countryCapitalStates[ci] - 1];
    const ideo = IDEOLOGIES.find((i) => i.id === c.ideology)!;
    const sub = ideo.subs[ci % ideo.subs.length];
    const leaderId = `${c.tag}_leader`;
    const advisorId = `${c.tag}_advisor`;
    const generalId = `${c.tag}_general`;

    chars[c.tag] = [
      { token: leaderId, name: c.leader, gender: ci % 2 ? 'male' : 'female', portraits: undefined as never, countryLeader: { ideology: sub.id, traits: [], expire: '1965.1.1', id: -1 } },
      { token: advisorId, name: `${c.adj} Planner ${ci + 1}`, gender: 'male', portraits: undefined as never, advisor: { allowedTag: c.tag, slot: 'political_advisor', ideaToken: advisorId, ledger: 'civilian', cost: 100, traits: [], aiWillDo: 1 } },
      { token: generalId, name: `General ${c.adj} ${ci + 1}`, gender: 'male', portraits: undefined as never, corpsCommander: SKILLS(ci) },
    ];
    L(leaderId, c.leader); L(advisorId, `${c.adj} Planner ${ci + 1}`); L(generalId, `General ${c.adj} ${ci + 1}`);

    // country spirits
    ideaBlocks.push(`${T}${T}${c.tag}_hardened_borders = {`, `${T}${T}${T}picture = generic_fortify_the_borders`, `${T}${T}${T}allowed = { always = no }`, `${T}${T}${T}removal_cost = -1`, `${T}${T}${T}modifier = { army_core_defence_factor = 0.1 }`, `${T}${T}}`,
      `${T}${T}${c.tag}_national_resolve = {`, `${T}${T}${T}picture = generic_manpower_bonus`, `${T}${T}${T}allowed = { always = no }`, `${T}${T}${T}removal_cost = -1`, `${T}${T}${T}modifier = { stability_factor = 0.05 war_support_factor = 0.05 }`, `${T}${T}}`);
    L(`${c.tag}_hardened_borders`, 'Hardened Borders'); L(`${c.tag}_hardened_borders_desc`, `${c.adj} garrisons guard every pass.`);
    L(`${c.tag}_national_resolve`, 'National Resolve'); L(`${c.tag}_national_resolve_desc`, `The ${c.adj} people are prepared for hard years.`);

    // history
    const popularity: Record<string, number> = {};
    IDEOLOGIES.forEach((i) => (popularity[i.id] = i.id === c.ideology ? 55 : 5));
    const total = Object.values(popularity).reduce((a, b) => a + b, 0);
    popularity[c.ideology] += 100 - total;
    const unitStates = mine.slice(0, 5);
    const history = [
      `capital = ${capState.id}`,
      `oob = "${c.tag}_1936"`,
      '',
      '# Starting stats',
      'set_research_slots = 3',
      'set_stability = 0.6',
      'set_war_support = 0.5',
      'set_convoys = 80',
      '',
      'set_politics = {',
      `${T}ruling_party = ${c.ideology}`,
      `${T}last_election = "1932.1.1"`,
      `${T}election_frequency = 48`,
      `${T}elections_allowed = ${c.ideology === 'concordism' || c.ideology === 'technocracy' ? 'yes' : 'no'}`,
      '}',
      'set_popularities = {',
      ...IDEOLOGIES.map((i) => `${T}${i.id} = ${popularity[i.id]}`),
      '}',
      '',
      countryHistoryExtras({
        technologies: ['infantry_weapons', 'infantry_weapons1', 'gw_artillery', 'tech_support', 'tech_engineers', 'tech_recon', 'basic_train', 'fuel_silos'],
        ideas: [`${c.tag}_hardened_borders`, `${c.tag}_national_resolve`],
        characters: [leaderId, advisorId, generalId],
      }).trimEnd(),
      '',
      `add_equipment_to_stockpile = { type = infantry_equipment_1 amount = 4000 producer = ${c.tag} }`,
      `add_equipment_to_stockpile = { type = support_equipment_1 amount = 400 producer = ${c.tag} }`,
      `add_equipment_to_stockpile = { type = artillery_equipment_1 amount = 300 producer = ${c.tag} }`,
      '',
    ].join(NL);
    files[`history/countries/${c.tag} - ${c.name}.txt`] = history;

    // order of battle
    const tpl = template(`${c.adj} Line Division`, ['infantry', 'infantry', 'infantry'], ['engineer']);
    files[`history/units/${c.tag}_1936.txt`] = generateOobFile({
      templates: [tpl],
      deployments: unitStates.map((s, i) => ({ template: `${c.adj} Line Division`, location: s.capitalProvince, count: i === 0 ? 3 : 1, name: i === 0 ? undefined : undefined, startExperience: 0.1, startEquipment: 0.8 })),
    }) + 'instant_effect = { }' + NL;

    files[`common/national_focus/${c.tag}_focus.txt`] = focusTree(c, ci, world);
    if (ci === 0) {
      // Replacing common/national_focus drops the vanilla default tree, search filters and title bar style, all of
      // which the game requires: without a default tree it crashes while loading.
      files['common/national_focus/00_ashen_defaults.txt'] = [
        'search_filter_prios = {', '\tFOCUS_FILTER_POLITICAL = 1010', '\tFOCUS_FILTER_RESEARCH = 522', '\tFOCUS_FILTER_INDUSTRY = 509',
        '\tFOCUS_FILTER_ARMY_XP = 103', '}', '',
        'style = {', '\tname = default_style', '\tdefault = yes', '\tunavailable = GFX_focus_unavailable', '\tcompleted = GFX_focus_completed',
        '\tavailable = GFX_focus_can_start', '\tcurrent = GFX_focus_current', '}', '',
        'focus_tree = {', '\tid = generic_focus', '\tcountry = { factor = 1 }', '\tdefault = yes', '\treset_on_civilwar = no',
        '\tfocus = {', '\t\tid = generic_industrial_effort', '\t\ticon = GFX_goal_generic_construct_civ_factory', '\t\tx = 0', '\t\ty = 0', '\t\tcost = 10',
        '\t\tsearch_filters = { FOCUS_FILTER_INDUSTRY }', '\t\tavailable_if_capitulated = yes',
        '\t\tcompletion_reward = { add_political_power = 50 }', '\t}', '}', '',
      ].join(NL);
    }

    // country name loc per ideology
    L(c.tag, c.name); L(`${c.tag}_DEF`, `the ${c.name}`); L(`${c.tag}_ADJ`, c.adj);
    for (const i of IDEOLOGIES) {
      L(`${c.tag}_${i.id}`, c.name); L(`${c.tag}_${i.id}_DEF`, `the ${c.name}`); L(`${c.tag}_${i.id}_ADJ`, c.adj);
      const party = i.party.replace('{adj}', c.adj);
      L(`${c.tag}_${i.id}_party`, party); L(`${c.tag}_${i.id}_party_long`, party);
    }
  });

  // characters / ideas
  for (const [tag, list] of Object.entries(chars)) files[`common/characters/${tag}.txt`] = generateCharacterScript(list) + NL;
  // portraits: vanilla's are grouped by vanilla tag; this keeps the generic army and navy pools
  const pool = (names: string[]) => names.map((n) => `${T}${T}${T}"${n}"`);
  const grp = (kind: string, g: string[]) => [`${T}${kind} = {`, `${T}${T}male = {`, ...pool(g), `${T}${T}}`, `${T}}`];
  const army = ['GFX_Portrait_Europe_Generic_land_1', 'GFX_Portrait_Europe_Generic_land_2', 'GFX_Portrait_Europe_Generic_land_3', 'GFX_Portrait_Europe_Generic_land_4', 'GFX_Portrait_Europe_Generic_land_5'];
  const navy = ['GFX_Portrait_Europe_Generic_navy_1', 'GFX_Portrait_Europe_Generic_navy_2', 'GFX_Portrait_Europe_Generic_navy_3'];
  files['portraits/00_portraits.txt'] = [
    'default = {',
    `${T}operative = {`, `${T}${T}male = {`, `${T}${T}${T}"GFX_portrait_operative_unknown"`, `${T}${T}}`, `${T}${T}female = {`, `${T}${T}${T}"GFX_portrait_operative_unknown"`, `${T}${T}}`, `${T}}`,
    `${T}male = {`, `${T}${T}"GFX_portrait_unknown"`, `${T}}`, `${T}female = {`, `${T}${T}"GFX_portrait_unknown_female"`, `${T}}`,
    '}', '',
    'continent = {', `${T}name = ashen_main`, ...grp('army', army), ...grp('navy', navy),
    '}', '',
  ].join(NL);
  files['common/units/names_railway_guns/ashen_railway_gun_names.txt'] = ['ASH_RG_GENERIC = {', `${T}for_countries = { ${COUNTRIES.map((c) => c.tag).join(' ')} }`, '', `${T}type = railway_gun`, `${T}fallback_name = "%d Rail Battery"`, '}', ''].join(NL);
  // vanilla's country groups list vanilla tags, which is where most "not in the tag list" errors come from
  files['common/script_constants/country_groups.txt'] = ['country_groups = {', `${T}schema = {`, `${T}${T}any_key = yes`, `${T}${T}array = country`, `${T}}`, '', `${T}ashen_continent = {`, ...COUNTRIES.map((c) => `${T}${T}${c.tag}`), `${T}}`, '', `${T}islamic_world = {`, `${T}${T}${COUNTRIES[0].tag}`, `${T}}`, '}', ''].join(NL);
  // scripted_triggers and scripted_effects are replaced, but generic vanilla files that stay still call a few of them by name
  const stubTriggers = ['anti_submarine_strategy_required_trigger', 'can_unlock_second_track_of_sf_doctrine', 'CHI_greater_game_states', 'CHI_northern_mandate_states', 'CHI_southern_mandate_states', 'is_available_to_collaboration_government', 'is_chinese_warlord', 'is_controlled_by_ROOT_or_ally', 'is_literally_china', 'is_raj_or_raj_inheritor', 'NOR_AAT', 'PHI_SEA', 'WTT_is_chinese_country'];
  const stubEffects = ['FIN_nokia_tires_after_tech_effect', 'GER_amerika_bomber_focke_wulf_completion_MIO_effects', 'GER_amerika_bomber_focke_wulf_completion_SP_effects', 'ITA_add_basic_light_flamethrower_template', 'play_warning_to_japan_effect', 'SP_create_variant_based_on_country_armored_engineer', 'SP_create_variant_based_on_country_armored_maintenance', 'SP_create_variant_based_on_country_armored_signal', 'SP_create_variant_based_on_country_assault_engineer', 'SP_create_variant_based_on_country_improved_small_airframe_rocket_engine', 'SP_create_variant_of_habakkuk_for_production_line'];
  files['common/scripted_triggers/00_ashen_stubs.txt'] = stubTriggers.map((n) => `${n} = {${NL}${T}always = no${NL}}`).join(NL) + NL;
  files['common/scripted_effects/00_ashen_stubs.txt'] = stubEffects.map((n) => `${n} = {${NL}${T}# vanilla effect for content this mod removes${NL}}`).join(NL) + NL;
  // The engine needs a default idea in each law category; written fresh since vanilla's are tied to vanilla tags.
  const law = (name: string, mods: string[], extra: string[] = []) =>
    [`${T}${T}${name} = {`, `${T}${T}${T}cost = 150`, `${T}${T}${T}removal_cost = -1`, ...extra.map((e) => `${T}${T}${T}${e}`), `${T}${T}${T}modifier = {`, ...mods.map((m) => `${T}${T}${T}${T}${m}`), `${T}${T}${T}}`, `${T}${T}${T}cancel_if_invalid = no`, `${T}${T}}`];
  files['common/ideas/00_ashen_laws.txt'] = [
    'ideas = {',
    `${T}economy = {`, `${T}${T}law = yes`, `${T}${T}use_list_view = yes`,
    ...law('civilian_economy', ['consumer_goods_expected_value = 0.35', 'production_speed_industrial_complex_factor = -0.3', 'production_speed_arms_factory_factor = -0.3', 'max_fuel_factor = -0.25'], ['default = yes']),
    ...law('partial_economic_mobilisation', ['consumer_goods_expected_value = 0.25', 'production_speed_arms_factory_factor = -0.1', 'conversion_cost_civ_to_mil_factor = -0.1']),
    ...law('war_economy', ['consumer_goods_expected_value = 0.15', 'production_speed_arms_factory_factor = 0.1', 'conversion_cost_civ_to_mil_factor = -0.3']),
    `${T}}`,
    `${T}trade_laws = {`, `${T}${T}law = yes`, `${T}${T}use_list_view = yes`,
    ...law('export_focus', ['min_export = 0.5', 'industrial_capacity_factory = 0.1', 'research_speed_factor = 0.05'], ['default = yes']),
    ...law('limited_exports', ['min_export = 0.2', 'industrial_capacity_factory = 0.05']),
    ...law('closed_economy', ['min_export = 0.1', 'production_speed_buildings_factor = 0.1']),
    `${T}}`,
    `${T}mobilization_laws = {`, `${T}${T}law = yes`, `${T}${T}use_list_view = yes`,
    ...law('volunteer_only', ['conscription = 0.015'], ['default = yes', 'level = 6']),
    ...law('limited_conscription', ['conscription = 0.025'], ['level = 5']),
    ...law('extensive_conscription', ['conscription = 0.05'], ['level = 4']),
    `${T}}`,
    '}', '',
  ].join(NL);
  files['common/ideas/ashen_ideas.txt'] = ['ideas = {', `${T}country = {`, ...ideaBlocks, `${T}}`, '}', ''].join(NL);

  // ---- bookmark
  const bm = [
    'bookmarks = {', `${T}bookmark = {`, `${T}${T}name = "ASHEN_NAME"`, `${T}${T}desc = "ASHEN_DESC"`, `${T}${T}date = 1936.1.1.12`, `${T}${T}picture = "GFX_select_date_1936"`,
    `${T}${T}default_country = "${COUNTRIES[0].tag}"`, `${T}${T}default = yes`, `${T}${T}filters = { }`,
  ];
  COUNTRIES.forEach((c, ci) => {
    const mine = world.states.filter((s) => s.owner === ci);
    void mine;
    bm.push(`${T}${T}"${c.tag}" = {`, `${T}${T}${T}history = "${c.tag}_BOOKMARK_DESC"`, `${T}${T}${T}ideology = ${c.ideology}`,
      `${T}${T}${T}ideas = {`, `${T}${T}${T}${T}${c.tag}_hardened_borders`, `${T}${T}${T}${T}${c.tag}_national_resolve`, `${T}${T}${T}}`,
      `${T}${T}${T}focuses = {`, `${T}${T}${T}${T}${c.tag}_national_charter`, `${T}${T}${T}${T}${c.tag}_industrial_drive`, `${T}${T}${T}${T}${c.tag}_war_college`, `${T}${T}${T}}`, `${T}${T}}`);
    L(`${c.tag}_BOOKMARK_DESC`, `${c.name}: a ${IDEOLOGIES.find((i) => i.id === c.ideology)!.name.toLowerCase()} power with ${mine.length} states.`);
  });
  bm.push(`${T}}`, '}', '');
  files['common/bookmarks/ashen_concord.txt'] = bm.join(NL);
  L('ASHEN_NAME', 'The Ashen Concord'); L('ASHEN_DESC', 'Eight nations share one continent and one uneasy peace. The ash has not yet settled.');

  // ---- a small event and on_actions so the world starts with a message
  files['events/ashen_events.txt'] = ['add_namespace = ashen', '', 'country_event = {', `${T}id = ashen.1`, `${T}title = ashen.1.t`, `${T}desc = ashen.1.d`, `${T}picture = GFX_report_event_generic_read_write`, `${T}is_triggered_only = yes`, `${T}option = {`, `${T}${T}name = ashen.1.a`, `${T}${T}add_political_power = 25`, `${T}}`, '}', ''].join(NL);
  L('ashen.1.t', 'The Ash Settles'); L('ashen.1.d', 'The old treaties have lapsed and every capital is drawing its own conclusions.'); L('ashen.1.a', 'We will see.');
  files['common/on_actions/ashen_on_actions.txt'] = ['on_actions = {', `${T}on_startup = {`, `${T}${T}effect = {`, `${T}${T}${T}every_country = {`, `${T}${T}${T}${T}country_event = { id = ashen.1 days = 2 }`, `${T}${T}${T}}`, `${T}${T}}`, `${T}}`, '}', ''].join(NL);

  // ---- ideology, state, region and supply loc
  for (const i of IDEOLOGIES) {
    L(i.id, i.name); L(`${i.id}_desc`, i.desc);
    for (const s of i.subs) { L(s.id, s.name); L(`${s.id}_desc`, `${s.name}: a branch of ${i.name}.`); }
    [1, 2, 3].forEach((n) => L(`FACTION_NAME_${i.id.toUpperCase()}_${n}`, `${i.name} Pact ${n}`));
  }
  for (const st of world.states) { L(`STATE_${st.id}`, st.name); L(`VICTORY_POINTS_${st.capitalProvince}`, st.name); }
  for (let r = 1; r <= world.landRegions.length + world.seaRegions.length; r++) L(`STRATEGICREGION_${r}`, r <= world.landRegions.length ? `Region ${r}` : `Sea ${r - world.landRegions.length}`);
  for (let a = 1; a <= world.supplyAreas.length; a++) L(`SUPPLYAREA_${a}`, `Supply Area ${a}`);
  L('ashen_main', 'The Ashen Continent');
  for (const p of world.provinces) if (!P(p.id).isSea) L(`PROV${p.id}`, world.states[p.stateId - 1].name + ' ' + p.id);

  // loc has its own file per language
  files['localisation/english/ashen_l_english.yml'] = formatLocalizationYaml('english', loc);

  // ---- flags
  Object.assign(files, flagFiles());
  return files;
}

export function launcherBody(): string {
  return descriptorBody(true);
}
