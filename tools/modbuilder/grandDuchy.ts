/**
 * "Grand Duchy Rising" - an additive Luxembourg overhaul, assembled with HOI4 Studio's own generators.
 *
 * Design rule: the mod overrides NO vanilla file and touches NO map data. Everything is new,
 * GDR_/gdr.-prefixed content (focus tree, ideas, decisions, events, characters, scripted effects)
 * so nothing can collide with base-game files and the load screen has nothing fragile to choke on.
 *
 * Run: npx tsx tools/modbuilder/build.ts
 */
import { ClausewitzFocusParser } from '../../src/utils/clausewitzParser';
import { generateCharacterScript, formatLocalizationYaml } from '../../src/utils/politicsGenerators';
import { validateModDescriptor } from '../../src/utils/phase5Generators';
import { analyzeFocusTreeDeadlocks } from '../../src/utils/tarjanDeadlockSolver';
import type { FocusNodeData, FocusProject } from '../../src/types/focus';
import type { CharacterDef } from '../../src/types/politics';

export const MOD_ID = 'grand_duchy_rising';
export const MOD_NAME = 'Grand Duchy Rising';
export const TAG = 'LUX';
export const TREE_ID = 'GDR_luxembourg_focus';

export type ModFile = { path: string; content: string | Uint8Array };
export type LocEntry = { key: string; value: string };

// ---------------------------------------------------------------------------
// Focus tree
// ---------------------------------------------------------------------------

interface F {
  id: string;
  name: string;
  desc: string;
  icon: string;
  x: number;
  y: number;
  pre?: string[];
  any?: boolean; // prerequisites are OR'd
  excl?: string[];
  cost?: number;
  reward: string[];
  available?: string[];
  ai?: number;
}

const G = (n: string) => `GFX_goal_generic_${n}`;
const flag = (s: string) => `set_country_flag = GDR_${s}`;
const prog = 'GDR_gain_progress = yes';
/** Guarded capital-state construction: never blocks a focus if the state is full. */
const buildInCapital = (type: string) =>
  `capital_scope = { if = { limit = { free_building_slots = { building = ${type} size > 0 include_locked = yes } } add_building_construction = { type = ${type} level = 1 instant_build = yes } } }`;
const infraInCapital =
  'capital_scope = { if = { limit = { NOT = { infrastructure > 4 } } add_building_construction = { type = infrastructure level = 1 instant_build = yes } } }';
const evt = (n: number, days = 3) => `country_event = { id = gdr.${n} days = ${days} }`;

export const FOCUSES: F[] = [
  {
    id: 'GDR_sovereign_ambition', name: 'A Small State, A Large Resolve',
    desc: 'The Grand Duchy has survived every storm Europe has thrown at it. Now it must decide what it wants to become.',
    icon: G('national_unity'), x: 7, y: 0, cost: 5,
    reward: ['add_political_power = 75', 'add_stability = 0.05', prog, evt(2)],
  },
  // --- Industry branch ----------------------------------------------------
  {
    id: 'GDR_steel_charter', name: 'The Steel Charter',
    desc: 'Luxembourg\'s iron and steel are the backbone of its prosperity. A national charter will bind the great works to the national interest.',
    icon: G('production'), x: 2, y: 1, pre: ['GDR_sovereign_ambition'],
    reward: ['add_ideas = GDR_steel_charter_idea', prog, evt(3)],
  },
  {
    id: 'GDR_modernize_the_works', name: 'Modernize the Works',
    desc: 'Electric furnaces and continuous rolling mills will let the valley outproduce rivals ten times its size.',
    icon: G('construct_civ_factory'), x: 1, y: 2, pre: ['GDR_steel_charter'],
    reward: [buildInCapital('industrial_complex'), prog],
  },
  {
    id: 'GDR_rail_nexus', name: 'The Rail Nexus',
    desc: 'Every line between Paris, Brussels, Cologne and Strasbourg can be made to pass through the Duchy.',
    icon: G('construct_infrastructure'), x: 3, y: 2, pre: ['GDR_steel_charter'],
    reward: [infraInCapital, prog],
  },
  {
    id: 'GDR_research_college', name: 'The Metallurgical College',
    desc: 'A technical college in the capital will train the engineers the works so badly need.',
    icon: G('scientific_exchange'), x: 0, y: 3, pre: ['GDR_modernize_the_works'],
    reward: ['add_research_slot = 1', prog],
  },
  {
    id: 'GDR_ore_to_arms', name: 'From Ore to Arms',
    desc: 'Convert part of the steel output into weapons for the national defence.',
    icon: G('construct_mil_factory'), x: 2, y: 3, pre: ['GDR_modernize_the_works', 'GDR_rail_nexus'], any: true,
    reward: [
      buildInCapital('arms_factory'),
      'add_equipment_to_stockpile = { type = infantry_equipment_1 amount = 300 producer = LUX }',
      prog,
    ],
  },
  {
    id: 'GDR_cooperatives', name: 'Industrial Cooperatives',
    desc: 'Workers\' cooperatives share tools, patents and shipping, trimming waste across the valley.',
    icon: G('consumer_goods'), x: 4, y: 3, pre: ['GDR_rail_nexus'],
    reward: ['add_ideas = GDR_cooperatives_idea', prog],
  },
  {
    id: 'GDR_forge_of_europe', name: 'The Forge of Europe',
    desc: 'Our steel will be in the girders of every bridge and the hulls of every ship on the continent.',
    icon: G('soviet_construction'), x: 2, y: 4, pre: ['GDR_ore_to_arms', 'GDR_research_college', 'GDR_cooperatives'], any: true,
    reward: [
      'swap_ideas = { remove_idea = GDR_steel_charter_idea add_idea = GDR_forge_of_europe_idea }',
      'add_tech_bonus = { name = GDR_forge_bonus bonus = 0.5 uses = 1 category = industry }',
      prog,
    ],
  },
  // --- Military branch ----------------------------------------------------
  {
    id: 'GDR_guard_the_gap', name: 'Guard the Gap',
    desc: 'The Ardennes are said to be impassable to armour. We should make certain they are.',
    icon: G('defence'), x: 7, y: 1, pre: ['GDR_sovereign_ambition'],
    reward: ['army_experience = 15', prog, evt(4)],
  },
  {
    id: 'GDR_ardennes_line', name: 'The Ardennes Line',
    desc: 'Concrete, wire and demolition charges at every bridge and road cut.',
    icon: G('fortify_city'), x: 6, y: 2, pre: ['GDR_guard_the_gap'],
    reward: ['add_ideas = GDR_ardennes_garrisons', prog],
  },
  {
    id: 'GDR_citizen_reserve', name: 'The Citizen Reserve',
    desc: 'Every able citizen will know where to stand and what to carry on the day it matters.',
    icon: G('position_armies'), x: 8, y: 2, pre: ['GDR_guard_the_gap'],
    reward: ['add_ideas = GDR_citizen_reserve_idea', prog],
  },
  {
    id: 'GDR_border_garrisons', name: 'Border Garrisons',
    desc: 'Permanent garrisons in the frontier towns, supplied from the capital by rail.',
    icon: G('army_artillery'), x: 6, y: 3, pre: ['GDR_ardennes_line'],
    reward: ['add_war_support = 0.05', 'add_equipment_to_stockpile = { type = infantry_equipment_1 amount = 200 producer = LUX }', prog],
  },
  {
    id: 'GDR_mobile_reserve', name: 'A Mobile Reserve',
    desc: 'Trucks and bicycles for a small force that can reach any point of the frontier in a day.',
    icon: G('army_motorized'), x: 8, y: 3, pre: ['GDR_citizen_reserve'],
    reward: ['army_experience = 15', 'add_war_support = 0.03', prog],
  },
  {
    id: 'GDR_field_manual', name: 'The Field Manual',
    desc: 'Lessons from every border incident and exercise, written down for every officer.',
    icon: G('army_doctrines'), x: 7, y: 4, pre: ['GDR_border_garrisons', 'GDR_mobile_reserve'], any: true,
    reward: ['army_experience = 25', 'add_tech_bonus = { name = GDR_field_bonus bonus = 0.5 uses = 1 category = industry }', prog],
  },
  // --- Finance & diplomacy branch ----------------------------------------
  {
    id: 'GDR_open_ledger', name: 'The Open Ledger',
    desc: 'A discreet, trustworthy and well-connected financial centre is the Duchy\'s other great export.',
    icon: G('trade'), x: 12, y: 1, pre: ['GDR_sovereign_ambition'],
    reward: ['add_political_power = 50', prog, evt(5)],
  },
  {
    id: 'GDR_financial_hub', name: 'A Financial Hub',
    desc: 'Banks, insurers and shipping agents will gather where law is stable and tax is light.',
    icon: G('positive_trade_relations'), x: 11, y: 2, pre: ['GDR_open_ledger'],
    reward: ['add_ideas = GDR_financial_hub_idea', prog],
  },
  {
    id: 'GDR_diplomatic_quarter', name: 'The Diplomatic Quarter',
    desc: 'Host every conference worth hosting. A neutral capital makes an excellent meeting room.',
    icon: G('improve_relations'), x: 13, y: 2, pre: ['GDR_open_ledger'],
    reward: ['add_political_power = 75', 'add_stability = 0.03', prog],
  },
  {
    id: 'GDR_trade_treaties', name: 'Trade Treaties',
    desc: 'Preferential agreements with all four neighbours, and with their rivals.',
    icon: G('military_deal'), x: 11, y: 3, pre: ['GDR_financial_hub'],
    reward: ['add_stability = 0.03', 'add_political_power = 50', prog],
  },
  {
    id: 'GDR_national_festival', name: 'The National Festival',
    desc: 'Folk music, fireworks and free beer on the Grand Duchess\'s birthday. Morale is a national resource too.',
    icon: G('propaganda'), x: 13, y: 3, pre: ['GDR_diplomatic_quarter'],
    reward: ['add_stability = 0.05', 'add_war_support = 0.03', prog],
  },
  {
    id: 'GDR_international_bank', name: 'The International Bank',
    desc: 'A bank of banks, trusted by those who trust nobody else.',
    icon: G('major_alliance'), x: 12, y: 4, pre: ['GDR_trade_treaties', 'GDR_national_festival'], any: true,
    reward: ['add_political_power = 100', 'add_research_slot = 1', prog],
  },
  // --- The choice (mutually exclusive) -----------------------------------
  {
    id: 'GDR_armed_neutrality', name: 'Armed Neutrality',
    desc: 'We will not be anyone\'s road. Let it be known that the price of crossing us is paid in full.',
    icon: G('neutrality_focus'), x: 4, y: 5, pre: ['GDR_field_manual'],
    excl: ['GDR_benelux_pact', 'GDR_western_alignment'],
    reward: [flag('path_neutral'), 'add_ideas = GDR_armed_neutrality_idea', 'add_stability = 0.05', prog, evt(6)],
  },
  {
    id: 'GDR_benelux_pact', name: 'The Benelux Pact',
    desc: 'Three small nations are stronger when they stand and trade together.',
    icon: G('alliance'), x: 7, y: 5, pre: ['GDR_field_manual', 'GDR_international_bank'], any: true,
    excl: ['GDR_armed_neutrality', 'GDR_western_alignment'],
    reward: [flag('path_benelux'), 'add_ideas = GDR_benelux_idea', 'add_political_power = 75', prog, evt(7)],
  },
  {
    id: 'GDR_western_alignment', name: 'Western Alignment',
    desc: 'Neutrality has failed before. The Duchy\'s future lies with the great democracies, if they will have it.',
    icon: G('support_democracy'), x: 10, y: 5, pre: ['GDR_international_bank'],
    excl: ['GDR_armed_neutrality', 'GDR_benelux_pact'],
    reward: [flag('path_western'), 'add_ideas = GDR_western_idea', 'add_war_support = 0.05', prog, evt(8)],
  },
  // --- Armed neutrality chain --------------------------------------------
  {
    id: 'GDR_total_defense', name: 'Total Defence Doctrine',
    desc: 'Every road, bridge and cellar is part of the defence.',
    icon: G('fortify_city'), x: 4, y: 6, pre: ['GDR_armed_neutrality'],
    reward: ['add_ideas = GDR_total_defense_idea', 'army_experience = 25', prog],
  },
  {
    id: 'GDR_hardened_borders', name: 'Hardened Borders',
    desc: 'Layered strongpoints on every approach.',
    icon: G('defence'), x: 3, y: 7, pre: ['GDR_total_defense'],
    reward: ['add_war_support = 0.05', 'add_stability = 0.03', prog],
  },
  {
    id: 'GDR_neutral_arsenal', name: 'The Neutral Arsenal',
    desc: 'Weapons made at home, for use at home, and sold to whoever pays.',
    icon: G('small_arms'), x: 5, y: 7, pre: ['GDR_total_defense'],
    reward: [
      'add_equipment_to_stockpile = { type = infantry_equipment_1 amount = 600 producer = LUX }',
      'add_tech_bonus = { name = GDR_arsenal_bonus bonus = 1.0 uses = 1 category = industry }',
      prog,
    ],
  },
  {
    id: 'GDR_unbreakable_duchy', name: 'The Unbreakable Duchy',
    desc: 'No one has ever walked through Luxembourg without regretting it.',
    icon: G('major_war'), x: 4, y: 8, pre: ['GDR_hardened_borders', 'GDR_neutral_arsenal'], any: true,
    reward: [flag('path_complete'), 'add_ideas = GDR_unbreakable_idea', 'add_war_support = 0.05', prog],
  },
  // --- Benelux chain -----------------------------------------------------
  {
    id: 'GDR_customs_union', name: 'The Customs Union',
    desc: 'No more tariff walls between the three capitals.',
    icon: G('trade'), x: 7, y: 6, pre: ['GDR_benelux_pact'],
    reward: ['add_political_power = 75', 'add_stability = 0.03', prog],
  },
  {
    id: 'GDR_joint_command', name: 'The Joint Command',
    desc: 'Staff talks between Brussels, The Hague and Luxembourg.',
    icon: G('position_armies'), x: 6, y: 7, pre: ['GDR_customs_union'],
    reward: ['army_experience = 25', 'add_war_support = 0.03', prog],
  },
  {
    id: 'GDR_common_market', name: 'The Common Market',
    desc: 'One market, one rulebook, one set of weights and measures.',
    icon: G('production2'), x: 8, y: 7, pre: ['GDR_customs_union'],
    reward: ['add_ideas = GDR_common_market_idea', prog],
  },
  {
    id: 'GDR_lowlands_federation', name: 'The Lowlands Federation',
    desc: 'The seed of something new at the heart of Europe.',
    icon: G('major_alliance'), x: 7, y: 8, pre: ['GDR_joint_command', 'GDR_common_market'], any: true,
    reward: [flag('path_complete'), 'add_ideas = GDR_lowlands_idea', 'add_political_power = 100', prog],
  },
  // --- Western chain -----------------------------------------------------
  {
    id: 'GDR_guarantee_request', name: 'Request a Guarantee',
    desc: 'We will ask London and Paris plainly what they will do if the frontier is crossed.',
    icon: G('political_pressure'), x: 10, y: 6, pre: ['GDR_western_alignment'],
    reward: ['add_political_power = 75', 'add_stability = 0.03', prog],
  },
  {
    id: 'GDR_allied_liaison', name: 'Allied Liaison Staff',
    desc: 'Officers of all three armies, in one office, with one map.',
    icon: G('intelligence_exchange'), x: 9, y: 7, pre: ['GDR_guarantee_request'],
    reward: ['army_experience = 25', 'add_tech_bonus = { name = GDR_liaison_bonus bonus = 0.5 uses = 1 category = industry }', prog],
  },
  {
    id: 'GDR_lend_lease_prep', name: 'Prepare for Allied Supply',
    desc: 'Depots, rail sidings and warehouses ready to receive allied matériel.',
    icon: G('allies_build_infantry'), x: 11, y: 7, pre: ['GDR_guarantee_request'],
    reward: ['add_equipment_to_stockpile = { type = infantry_equipment_1 amount = 500 producer = LUX }', prog],
  },
  {
    id: 'GDR_arsenal_of_the_west', name: 'Arsenal of the West',
    desc: 'The great works will turn out whatever the democracies need.',
    icon: G('production'), x: 10, y: 8, pre: ['GDR_allied_liaison', 'GDR_lend_lease_prep'], any: true,
    reward: [flag('path_complete'), 'add_ideas = GDR_arsenal_west_idea', 'add_research_slot = 1', prog],
  },
  // --- Capstone ----------------------------------------------------------
  {
    id: 'GDR_grand_duchy_rising', name: 'The Grand Duchy Rises',
    desc: 'A small country that decided to matter, and did.',
    icon: G('national_unity'), x: 7, y: 9, pre: ['GDR_unbreakable_duchy', 'GDR_lowlands_federation', 'GDR_arsenal_of_the_west'], any: true,
    cost: 10,
    reward: ['add_stability = 0.1', 'add_war_support = 0.1', 'add_political_power = 200', evt(9)],
  },
];

function toNode(f: F): FocusNodeData {
  return {
    id: f.id, name: f.name, symbol: '★', icon: f.icon, cost: f.cost ?? 5, x: f.x, y: f.y,
    prerequisites: (f.pre ?? []).map((p) => [p]),
    prereqMode: f.any ? 'any' : 'all',
    mutually_exclusive: f.excl ?? [],
    description: f.desc,
    reward: f.reward.join('\n'),
    available: f.available?.join('\n'),
    ai: f.ai ?? 10,
  };
}

export function buildFocusProject(): FocusProject {
  return { version: 1, treeId: TREE_ID, tag: TAG, title: MOD_NAME, nodes: FOCUSES.map(toNode) };
}

export function analyzeTree() {
  return analyzeFocusTreeDeadlocks(buildFocusProject().nodes);
}

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

interface Idea { id: string; name: string; desc: string; picture: string; mods: Record<string, number>; }

export const IDEAS: Idea[] = [
  { id: 'GDR_steel_charter_idea', name: 'The Steel Charter', desc: 'The great works are bound to the national interest.', picture: 'generic_production_bonus', mods: { industrial_capacity_factory: 0.1, production_speed_buildings_factor: 0.1 } },
  { id: 'GDR_forge_of_europe_idea', name: 'The Forge of Europe', desc: 'Luxembourg steel is in everything.', picture: 'generic_production_bonus', mods: { industrial_capacity_factory: 0.15, production_speed_buildings_factor: 0.15, research_speed_factor: 0.05 } },
  { id: 'GDR_cooperatives_idea', name: 'Industrial Cooperatives', desc: 'Shared tools, shared patents, less waste.', picture: 'generic_production_bonus', mods: { production_factory_efficiency_gain_factor: 0.1, consumer_goods_factor: -0.05 } },
  { id: 'GDR_ardennes_garrisons', name: 'Ardennes Garrisons', desc: 'Permanent garrisons guard every pass.', picture: 'generic_fortification_bonus', mods: { army_core_defence_factor: 0.1 } },
  { id: 'GDR_citizen_reserve_idea', name: 'The Citizen Reserve', desc: 'Every citizen knows where to stand.', picture: 'generic_manpower_bonus', mods: { conscription_factor: 0.1, training_time_factor: -0.1 } },
  { id: 'GDR_financial_hub_idea', name: 'A Financial Hub', desc: 'Money flows through the capital.', picture: 'generic_intel_bonus', mods: { political_power_gain: 0.1, stability_factor: 0.05 } },
  { id: 'GDR_armed_neutrality_idea', name: 'Armed Neutrality', desc: 'Nobody\'s road.', picture: 'generic_fortification_bonus', mods: { army_core_defence_factor: 0.1, justify_war_goal_when_in_war_time: 0.1 } },
  { id: 'GDR_total_defense_idea', name: 'Total Defence', desc: 'Every road, bridge and cellar is part of the defence.', picture: 'generic_fortification_bonus', mods: { army_core_defence_factor: 0.1, army_defence_factor: 0.05 } },
  { id: 'GDR_unbreakable_idea', name: 'The Unbreakable Duchy', desc: 'Regretted by all who tried.', picture: 'generic_fortification_bonus', mods: { army_core_defence_factor: 0.15, stability_factor: 0.05, war_support_factor: 0.1 } },
  { id: 'GDR_benelux_idea', name: 'The Benelux Pact', desc: 'Three small nations standing together.', picture: 'generic_intel_bonus', mods: { political_power_gain: 0.1, research_speed_factor: 0.05 } },
  { id: 'GDR_common_market_idea', name: 'The Common Market', desc: 'One market, one rulebook.', picture: 'generic_production_bonus', mods: { industrial_capacity_factory: 0.1, consumer_goods_factor: -0.05 } },
  { id: 'GDR_lowlands_idea', name: 'The Lowlands Federation', desc: 'The seed of something new.', picture: 'generic_intel_bonus', mods: { stability_factor: 0.1, political_power_gain: 0.1, research_speed_factor: 0.1 } },
  { id: 'GDR_western_idea', name: 'Western Alignment', desc: 'The future lies with the democracies.', picture: 'generic_intel_bonus', mods: { war_support_factor: 0.05, experience_gain_army_factor: 0.1 } },
  { id: 'GDR_arsenal_west_idea', name: 'Arsenal of the West', desc: 'The works turn out what the democracies need.', picture: 'generic_production_bonus', mods: { industrial_capacity_factory: 0.15, production_speed_buildings_factor: 0.1 } },
  // timed ideas used by decisions
  { id: 'GDR_savings_idea', name: 'National Savings Drive', desc: 'Thrift is a civic virtue.', picture: 'generic_intel_bonus', mods: { stability_factor: 0.05, consumer_goods_factor: -0.03 } },
  { id: 'GDR_drills_idea', name: 'Reserve Drills', desc: 'Weekend soldiers, weekday engineers.', picture: 'generic_manpower_bonus', mods: { training_time_factor: -0.15 } },
  { id: 'GDR_mobilized_idea', name: 'Reserves Mobilised', desc: 'The citizen reserve is under arms.', picture: 'generic_manpower_bonus', mods: { conscription_factor: 0.15, war_support_factor: 0.05, stability_factor: -0.03 } },
];

function ideasScript(): string {
  const body = IDEAS.map((i) => {
    const mods = Object.entries(i.mods).map(([k, v]) => `\t\t\t\t${k} = ${v}`).join('\n');
    return `\t\t${i.id} = {\n\t\t\tallowed = { always = no }\n\t\t\tremoval_cost = -1\n\t\t\tpicture = ${i.picture}\n\t\t\tmodifier = {\n${mods}\n\t\t\t}\n\t\t}`;
  }).join('\n\n');
  return `ideas = {\n\tcountry = {\n${body}\n\t}\n}\n`;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

const noPortrait = undefined as unknown as CharacterDef['portraits'];

export const CHARACTERS: CharacterDef[] = [
  { token: 'GDR_general_marie_thill', name: 'Marie Thill', gender: 'female', portraits: noPortrait, corpsCommander: { skill: 3, attack: 2, defense: 4, planning: 3, logistics: 3, traits: [] } },
  { token: 'GDR_general_paul_hoffmann', name: 'Paul Hoffmann', gender: 'male', portraits: noPortrait, corpsCommander: { skill: 2, attack: 3, defense: 2, planning: 2, logistics: 2, traits: [] } },
  { token: 'GDR_adv_jean_schmit', name: 'Jean Schmit', gender: 'male', portraits: noPortrait, advisor: { allowedTag: 'LUX', slot: 'industrial_concern', ideaToken: 'GDR_adv_jean_schmit', ledger: 'civilian', cost: 100, traits: [], aiWillDo: 1 } },
  { token: 'GDR_adv_anne_weber', name: 'Anne Weber', gender: 'female', portraits: noPortrait, advisor: { allowedTag: 'LUX', slot: 'political_advisor', ideaToken: 'GDR_adv_anne_weber', ledger: 'civilian', cost: 100, traits: [], aiWillDo: 1 } },
  { token: 'GDR_adv_marc_kieffer', name: 'Marc Kieffer', gender: 'male', portraits: noPortrait, advisor: { allowedTag: 'LUX', slot: 'high_command', ideaToken: 'GDR_adv_marc_kieffer', ledger: 'army', cost: 100, traits: [], aiWillDo: 1 } },
];

function charactersScript(): string {
  return generateCharacterScript(CHARACTERS) + '\n';
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

interface Decision { id: string; name: string; desc: string; cost: number; days: number; available: string[]; effect: string[]; }

export const DECISIONS: Decision[] = [
  { id: 'GDR_expand_steelworks', name: 'Expand the Steelworks', desc: 'Add another furnace line in the capital valley.', cost: 60, days: 120,
    available: ['capital_scope = { free_building_slots = { building = industrial_complex size > 0 include_locked = yes } }'],
    effect: [buildInCapital('industrial_complex'), prog] },
  { id: 'GDR_extend_railways', name: 'Extend the Railways', desc: 'More sidings, more junctions, more throughput.', cost: 40, days: 90,
    available: ['capital_scope = { NOT = { infrastructure > 4 } }'],
    effect: [infraInCapital, prog] },
  { id: 'GDR_savings_drive', name: 'National Savings Drive', desc: 'Ask the nation to tighten its belt for a season.', cost: 35, days: 150,
    available: ['has_stability > 0.4'],
    effect: ['add_timed_idea = { idea = GDR_savings_idea days = 120 }', prog] },
  { id: 'GDR_reserve_drills', name: 'Reserve Drills', desc: 'Call the citizen reserve out for field exercises.', cost: 30, days: 120,
    available: ['has_war_support > 0.3'],
    effect: ['add_timed_idea = { idea = GDR_drills_idea days = 90 }', 'army_experience = 10', prog] },
  { id: 'GDR_research_grant', name: 'Fund the College', desc: 'A national grant for the metallurgical college.', cost: 75, days: 240,
    available: ['check_variable = { GDR_progress > 3 }'],
    effect: ['add_tech_bonus = { name = GDR_grant_bonus bonus = 0.5 uses = 1 category = industry }', prog] },
  { id: 'GDR_diplomatic_gala', name: 'Host a Diplomatic Gala', desc: 'Invite every ambassador to a very good dinner.', cost: 40, days: 180,
    available: ['has_stability > 0.5'],
    effect: ['add_stability = 0.03', 'add_war_support = 0.02', prog] },
  { id: 'GDR_mobilize_reserves', name: 'Mobilise the Reserves', desc: 'The frontier is in danger. Call out the citizen reserve.', cost: 50, days: 365,
    available: ['has_war = yes'],
    effect: ['add_timed_idea = { idea = GDR_mobilized_idea days = 180 }', 'army_experience = 15'] },
];

function decisionsScript(): string {
  const body = DECISIONS.map((d) => {
    const avail = d.available.map((l) => `\t\t\t${l}`).join('\n');
    const eff = d.effect.map((l) => `\t\t\t${l}`).join('\n');
    return `\t${d.id} = {\n\t\ticon = generic_industry\n\t\tcost = ${d.cost}\n\t\tdays_re_enable = ${d.days}\n\t\tavailable = {\n${avail}\n\t\t}\n\t\tcomplete_effect = {\n${eff}\n\t\t}\n\t\tai_will_do = { factor = 1 }\n\t}`;
  }).join('\n\n');
  return `GDR_grand_duchy_projects = {\n${body}\n}\n`;
}

const DECISION_CATEGORY = `GDR_grand_duchy_projects = {
\ticon = generic_industry
\tallowed = { original_tag = LUX }
\tvisible = { original_tag = LUX }
}
`;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

interface Ev { n: number; title: string; desc: string; opts: { name: string; effects: string[] }[]; mtth?: boolean; trigger?: string[]; }

export const EVENTS: Ev[] = [
  { n: 1, title: 'Winds Over the Valley', desc: 'Europe is restless, and the Grand Duchy is small. Ministers argue over what a small country can do. Whatever it is, it must start soon.',
    opts: [{ name: 'We will make our own future.', effects: ['add_political_power = 25'] }] },
  { n: 2, title: 'The Ministers Convene', desc: 'The cabinet has met to draw up the national programme. Industry, defence and finance all demand to go first.',
    opts: [
      { name: 'Industry first.', effects: ['add_political_power = 25'] },
      { name: 'Defence first.', effects: ['army_experience = 10'] },
      { name: 'Finance first.', effects: ['add_stability = 0.02'] },
    ] },
  { n: 3, title: 'The Steel Accord', desc: 'Union leaders and furnace owners have agreed a charter after a week of talks. Neither is happy; both will sign.',
    opts: [
      { name: 'A fair settlement.', effects: ['add_stability = 0.03'] },
      { name: 'Weighted towards the owners.', effects: ['add_political_power = 40', 'add_stability = -0.02'] },
    ] },
  { n: 4, title: 'Incident at the Frontier', desc: 'A foreign patrol strayed across the border last night. No shots were fired, but the whole garrison has taken note.',
    opts: [
      { name: 'Protest, firmly.', effects: ['add_political_power = 20'] },
      { name: 'Reinforce the frontier.', effects: ['army_experience = 10', 'add_war_support = 0.02'] },
    ] },
  { n: 5, title: 'The Banks Open Their Doors', desc: 'Foreign bankers are queuing outside the ministry of finance. Discretion, they say, is worth a premium.',
    opts: [
      { name: 'Welcome them.', effects: ['add_political_power = 50'] },
      { name: 'Regulate first.', effects: ['add_stability = 0.03'] },
    ] },
  { n: 6, title: 'The Neutral Fortress', desc: 'The Chamber has voted for armed neutrality. Every neighbour has been informed, politely and in writing.',
    opts: [{ name: 'Let them read it twice.', effects: ['add_war_support = 0.03'] }] },
  { n: 7, title: 'Three Capitals, One Table', desc: 'Delegates from Brussels and The Hague have arrived by train. The agenda is long and the coffee is excellent.',
    opts: [{ name: 'To a lasting partnership.', effects: ['add_political_power = 50', 'add_stability = 0.02'] }] },
  { n: 8, title: 'A Letter to London and Paris', desc: 'Our envoys have delivered the request. The replies will say a great deal about whom we can trust.',
    opts: [{ name: 'We shall see.', effects: ['add_political_power = 30', 'army_experience = 10'] }] },
  { n: 9, title: 'The Grand Duchy Rises', desc: 'Whatever else history says, the Grand Duchy decided what it wanted to be, and then became it.',
    opts: [{ name: 'A small country with a large name.', effects: ['add_political_power = 100', 'add_stability = 0.05'] }] },
  { n: 10, title: 'Steelworkers Walk Out', desc: 'Pay disputes at the great works have escalated into a walkout. Furnaces are cooling by the hour.',
    mtth: true, trigger: ['original_tag = LUX', 'has_country_flag = GDR_started', 'NOT = { has_country_flag = GDR_path_complete }'],
    opts: [
      { name: 'Grant a pay rise.', effects: ['add_stability = 0.02', 'add_political_power = -25'] },
      { name: 'Hold firm.', effects: ['add_stability = -0.03', 'add_political_power = 25'] },
    ] },
  { n: 11, title: 'A Cultural Festival at the Castle', desc: 'The country\'s musicians and brewers have filled the capital. For one weekend nobody mentions the border.',
    mtth: true, trigger: ['original_tag = LUX', 'has_country_flag = GDR_started', 'has_stability > 0.5'],
    opts: [{ name: 'Raise a glass.', effects: ['add_stability = 0.02', 'add_war_support = 0.01'] }] },
];

function eventsScript(): string {
  const body = EVENTS.map((e) => {
    const opts = e.opts.map((o, i) => {
      const letter = String.fromCharCode(97 + i);
      const eff = o.effects.map((l) => `\t\t${l}`).join('\n');
      return `\toption = {\n\t\tname = gdr.${e.n}.${letter}\n\t\tai_chance = { base = 1 }\n${eff}\n\t}`;
    }).join('\n');
    const trig = e.trigger
      ? `\ttrigger = {\n${e.trigger.map((l) => `\t\t${l}`).join('\n')}\n\t}\n\tmean_time_to_happen = { months = 30 }\n`
      : '\tis_triggered_only = yes\n';
    return `country_event = {\n\tid = gdr.${e.n}\n\ttitle = gdr.${e.n}.t\n\tdesc = gdr.${e.n}.d\n\tpicture = GFX_report_event_generic_read_write\n${trig}${opts}\n}`;
  }).join('\n\n');
  return `add_namespace = gdr\n\n${body}\n`;
}

// ---------------------------------------------------------------------------
// Scripted effects / triggers / on_actions
// ---------------------------------------------------------------------------

const SCRIPTED_EFFECTS = `# Grand Duchy Rising - scripted effects
GDR_gain_progress = {
\tadd_to_variable = { GDR_progress = 1 }
\tset_country_flag = GDR_started
}

GDR_grant_stability_and_support = {
\tadd_stability = 0.02
\tadd_war_support = 0.02
}
`;

const SCRIPTED_TRIGGERS = `# Grand Duchy Rising - scripted triggers
GDR_has_chosen_path = {
\tOR = {
\t\thas_country_flag = GDR_path_neutral
\t\thas_country_flag = GDR_path_benelux
\t\thas_country_flag = GDR_path_western
\t}
}

GDR_is_luxembourg = {
\toriginal_tag = LUX
}
`;

const ON_ACTIONS = `on_actions = {
\ton_startup = {
\t\teffect = {
\t\t\tif = {
\t\t\t\tlimit = { country_exists = LUX }
\t\t\t\tLUX = {
\t\t\t\t\tset_variable = { GDR_progress = 0 }
\t\t\t\t\trecruit_character = GDR_general_marie_thill
\t\t\t\t\trecruit_character = GDR_general_paul_hoffmann
\t\t\t\t\tcountry_event = { id = gdr.1 days = 2 }
\t\t\t\t}
\t\t\t}
\t\t}
\t}
}
`;

// ---------------------------------------------------------------------------
// Localisation
// ---------------------------------------------------------------------------

function esc(s: string) { return s.replace(/\r?\n/g, '\\n'); }

function locEntries(): LocEntry[] {
  const out: LocEntry[] = [];
  const add = (key: string, value: string) => out.push({ key, value: esc(value) });
  for (const f of FOCUSES) { add(f.id, f.name); add(`${f.id}_desc`, f.desc); }
  for (const i of IDEAS) { add(i.id, i.name); add(`${i.id}_desc`, i.desc); }
  for (const d of DECISIONS) { add(d.id, d.name); add(`${d.id}_desc`, d.desc); }
  add('GDR_grand_duchy_projects', 'Grand Duchy Projects');
  add('GDR_grand_duchy_projects_desc', 'National projects that carry the Grand Duchy toward its ambitions.');
  for (const e of EVENTS) {
    add(`gdr.${e.n}.t`, e.title); add(`gdr.${e.n}.d`, e.desc);
    e.opts.forEach((o, i) => add(`gdr.${e.n}.${String.fromCharCode(97 + i)}`, o.name));
  }
  const seen = new Set<string>();
  for (const c of CHARACTERS) {
    for (const key of [c.token, c.advisor?.ideaToken]) {
      if (key && !seen.has(key)) { seen.add(key); add(key, c.name); }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Minimal valid PNG for thumbnail.png (no deps)
// ---------------------------------------------------------------------------

import { deflateSync } from 'node:zlib';

function crc32(buf: Uint8Array): number {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function makePng(w: number, h: number, rgb: [number, number, number]): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2;
  const row = new Uint8Array(1 + w * 3);
  for (let x = 0; x < w; x++) row.set(rgb, 1 + x * 3);
  const raw = new Uint8Array(row.length * h);
  for (let y = 0; y < h; y++) raw.set(row, y * row.length);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(deflateSync(raw))), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------

export const descriptorBody = (withPath: boolean) =>
  `version="1.0.0"
tags={
\t"Gameplay"
\t"Events"
\t"National Focuses"
}
name="${MOD_NAME}"
picture="thumbnail.png"
supported_version="1.*"
${withPath ? `path="mod/${MOD_ID}"\n` : ''}`;

export function buildMod(): { files: ModFile[]; launcher: ModFile } {
  const project = buildFocusProject();
  const analysis = analyzeTree();
  if (analysis.hasCycles) throw new Error(`Focus tree has prerequisite cycles: ${JSON.stringify(analysis.cycles)}`);
  if (analysis.unreachableFocuses.length) throw new Error(`Unreachable focuses: ${analysis.unreachableFocuses.join(', ')}`);
  if (analysis.hasMutualExclusionDeadlocks) throw new Error(`Mutual exclusion deadlocks: ${JSON.stringify(analysis.mutualExclusions)}`);

  const files: ModFile[] = [];
  const t = (path: string, content: string | Uint8Array) => files.push({ path, content });

  t('descriptor.mod', descriptorBody(false));
  t('thumbnail.png', makePng(512, 512, [34, 86, 160]));

  let focusScript = ClausewitzFocusParser.generateScript(project);
  // Make this tree beat any vanilla/generic tree for Luxembourg.
  focusScript = focusScript.replace('add = 10', 'add = 1000');
  t('common/national_focus/GDR_luxembourg.txt', focusScript);

  t('common/ideas/GDR_ideas.txt', ideasScript());
  t('common/characters/GDR_characters.txt', charactersScript());
  t('common/decisions/categories/GDR_categories.txt', DECISION_CATEGORY);
  t('common/decisions/GDR_decisions.txt', decisionsScript());
  t('common/scripted_effects/GDR_effects.txt', SCRIPTED_EFFECTS);
  t('common/scripted_triggers/GDR_triggers.txt', SCRIPTED_TRIGGERS);
  t('common/on_actions/GDR_on_actions.txt', ON_ACTIONS);
  t('events/GDR_events.txt', eventsScript());

  t('localisation/english/GDR_l_english.yml', formatLocalizationYaml('english', locEntries()));

  const val = validateModDescriptor(descriptorBody(false));
  if (!val.valid) throw new Error(`descriptor invalid: ${val.errors.join(', ')}`);

  return { files, launcher: { path: `${MOD_ID}.mod`, content: descriptorBody(true) } };
}
