/** Searchable library of ready-made Paradox script snippets, in the spirit of a "how do I..." knowledge base. */

export interface Snippet {
  id: string;
  title: string;
  /** Where the snippet is used, e.g. focus completion_reward, event option, decision complete_effect. */
  context: string;
  tags: string[];
  code: string;
}

const N = String.fromCharCode(10);
const T = String.fromCharCode(9);
const block = (...lines: string[]) => lines.join(N);

export const SNIPPETS: Snippet[] = [
  { id: 'pp-gain', title: 'Gain 50 political power', context: 'completion_reward / option', tags: ['political power', 'pp', 'reward'], code: 'add_political_power = 50' },
  { id: 'stability-war-support', title: 'Add stability and war support', context: 'completion_reward / option', tags: ['stability', 'war support'], code: block('add_stability = 0.05', 'add_war_support = 0.05') },
  { id: 'add-idea', title: 'Add a national spirit', context: 'completion_reward', tags: ['idea', 'spirit', 'national spirit'], code: 'add_ideas = MY_idea' },
  { id: 'timed-idea', title: 'Add a national spirit for 180 days', context: 'completion_reward', tags: ['idea', 'timed', 'temporary'], code: 'add_timed_idea = { idea = MY_idea days = 180 }' },
  { id: 'fire-event', title: 'Fire an event after 3 days', context: 'completion_reward', tags: ['event', 'delay'], code: 'country_event = { id = my.1 days = 3 }' },
  { id: 'research-slot', title: 'Add a research slot', context: 'completion_reward', tags: ['research', 'slot'], code: 'add_research_slot = 1' },
  { id: 'tech-bonus', title: 'Research bonus for a category (one use)', context: 'completion_reward', tags: ['technology', 'bonus', 'research'], code: 'add_tech_bonus = { name = MY_bonus bonus = 0.5 uses = 1 category = industry }' },
  { id: 'build-factory', title: 'Build a civilian factory in a random owned state', context: 'completion_reward', tags: ['factory', 'building', 'construction'], code: block('random_owned_controlled_state = {', `${T}limit = { free_building_slots = { building = industrial_complex size > 0 include_locked = yes } }`, `${T}add_building_construction = { type = industrial_complex level = 1 instant_build = yes }`, '}') },
  { id: 'add-core', title: 'Add a core on a state', context: 'completion_reward', tags: ['core', 'state'], code: '123 = { add_core_of = ROOT }' },
  { id: 'transfer-state', title: 'Transfer a state to your country', context: 'completion_reward', tags: ['state', 'transfer', 'annex'], code: '123 = { set_state_owner_to = ROOT }' },
  { id: 'declare-war', title: 'Declare war', context: 'completion_reward / option', tags: ['war', 'declare'], code: 'declare_war_on = { target = POL type = annex_everything }' },
  { id: 'wargoal', title: 'Create a wargoal against a country', context: 'completion_reward', tags: ['war', 'wargoal', 'justify'], code: 'create_wargoal = { type = annex_everything target = POL }' },
  { id: 'recruit-char', title: 'Recruit a character', context: 'completion_reward / on_startup', tags: ['character', 'leader', 'advisor'], code: 'recruit_character = MY_character' },
  { id: 'add-advisor', title: 'Activate an advisor', context: 'completion_reward', tags: ['advisor', 'character'], code: 'activate_advisor = MY_character' },
  { id: 'set-tech', title: 'Grant technologies', context: 'history / completion_reward', tags: ['technology', 'set_technology'], code: block('set_technology = {', `${T}infantry_weapons = 1`, `${T}infantry_weapons1 = 1`, '}') },
  { id: 'division-template', title: 'Create a division template', context: 'history / on_startup', tags: ['division', 'template', 'oob'], code: block('division_template = {', `${T}name = "Infantry Division"`, `${T}regiments = {`, `${T}${T}infantry = { x = 0 y = 0 }`, `${T}${T}infantry = { x = 0 y = 1 }`, `${T}}`, `${T}support = {`, `${T}${T}engineer = { x = 0 y = 0 }`, `${T}}`, '}') },
  { id: 'country-flag', title: 'Set and check a country flag', context: 'effect / trigger', tags: ['flag', 'variable'], code: block('set_country_flag = my_flag', '# in a trigger:', 'has_country_flag = my_flag') },
  { id: 'variable', title: 'Set and add to a variable', context: 'effect', tags: ['variable', 'counter'], code: block('set_variable = { my_var = 0 }', 'add_to_variable = { my_var = 1 }') },
  { id: 'if-limit', title: 'Conditional effect (if / limit / else)', context: 'effect', tags: ['if', 'limit', 'conditional'], code: block('if = {', `${T}limit = { has_war = yes }`, `${T}add_stability = -0.02`, `${T}else = { add_stability = 0.02 }`, '}') },
  { id: 'every-neighbor', title: 'Loop over neighbouring countries', context: 'effect', tags: ['loop', 'neighbor', 'every'], code: block('every_neighbor_country = {', `${T}limit = { is_subject = no }`, `${T}add_opinion_modifier = { target = ROOT modifier = MY_modifier }`, '}') },
  { id: 'on-startup', title: 'Run something once when the game starts', context: 'on_actions', tags: ['on_actions', 'startup', 'init'], code: block('on_actions = {', `${T}on_startup = {`, `${T}${T}effect = {`, `${T}${T}${T}# runs once per game`, `${T}${T}}`, `${T}}`, '}') },
  { id: 'event-skeleton', title: 'Country event with two options', context: 'events', tags: ['event', 'option', 'skeleton'], code: block('add_namespace = my', '', 'country_event = {', `${T}id = my.1`, `${T}title = my.1.t`, `${T}desc = my.1.d`, `${T}picture = GFX_report_event_generic_read_write`, `${T}is_triggered_only = yes`, `${T}option = { name = my.1.a add_political_power = 25 }`, `${T}option = { name = my.1.b add_stability = 0.03 }`, '}') },
  { id: 'decision-skeleton', title: 'Decision with cost and cooldown', context: 'decisions', tags: ['decision', 'cost', 'cooldown'], code: block('MY_category = {', `${T}MY_decision = {`, `${T}${T}icon = generic_industry`, `${T}${T}cost = 50`, `${T}${T}days_remove = 30`, `${T}${T}available = { has_stability > 0.5 }`, `${T}${T}complete_effect = { add_political_power = 25 }`, `${T}}`, '}') },
  { id: 'dynamic-modifier', title: 'Add a dynamic modifier for 60 days', context: 'effect', tags: ['dynamic modifier', 'temporary'], code: 'add_dynamic_modifier = { modifier = MY_dynamic_modifier days = 60 }' },
  { id: 'cosmetic-tag', title: 'Change the country name with a cosmetic tag', context: 'effect', tags: ['name', 'cosmetic tag'], code: 'set_cosmetic_tag = MY_TAG' },
  { id: 'focus-skeleton', title: 'National focus', context: 'focus tree', tags: ['focus', 'skeleton'], code: block('focus = {', `${T}id = MY_focus`, `${T}icon = GFX_goal_generic_construct_civ_factory`, `${T}x = 0`, `${T}y = 0`, `${T}cost = 5`, `${T}completion_reward = {`, `${T}${T}add_political_power = 50`, `${T}}`, '}') },
  { id: 'scripted-loc', title: 'Scripted localisation (text that depends on government)', context: 'scripted_localisation', tags: ['localisation', 'dynamic text', 'defined_text'], code: block('defined_text = {', `${T}name = MY_GetName`, `${T}text = {`, `${T}${T}trigger = { has_government = democratic }`, `${T}${T}localization_key = MY_NAME_DEM`, `${T}}`, `${T}text = { localization_key = MY_NAME_DEFAULT }`, '}') },
];

export function searchSnippets(query: string, limit = 20): Snippet[] {
  const q = query.trim().toLowerCase();
  if (!q) return SNIPPETS.slice(0, limit);
  const words = q.split(/\s+/);
  const scored: Array<[number, Snippet]> = [];
  for (const s of SNIPPETS) {
    const hay = `${s.title} ${s.context} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (s.title.toLowerCase().includes(w)) score += 10;
      else if (s.tags.some((t) => t.includes(w))) score += 6;
      else if (hay.includes(w)) score += 2;
      else {
        score = -1;
        break;
      }
    }
    if (score > 0) scored.push([score, s]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map((s) => s[1]);
}
