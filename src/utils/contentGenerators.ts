/**
 * Generators for content types added from the reference tools: country extras (names per ideology and language,
 * starting technologies), order of battle (deployments, air wings, fleets, division name groups) and dynamic
 * content (dynamic modifiers, on_actions, scripted localisation). Layouts follow the vanilla 1.19.4 files
 * (history/units, common/units/names_divisions, common/dynamic_modifiers, common/scripted_localisation).
 */

import { formatLocalizationYaml } from './politicsGenerators';
import type { Hoi4Language } from '../types/politics';

const NL = String.fromCharCode(10);
const T = String.fromCharCode(9);
const join = (lines: string[]) => lines.join(NL) + NL;

// ---------------------------------------------------------------------------
// Country extras
// ---------------------------------------------------------------------------

export interface CountryNameSet {
  name: string;
  definite?: string;
  adjective: string;
}

export interface CountryNames {
  tag: string;
  /** Default names, used by `TAG`, `TAG_DEF`, `TAG_ADJ`. */
  base: CountryNameSet;
  /** Per-ideology overrides, e.g. { fascism: {...} } -> `TAG_fascism`, `TAG_fascism_DEF`, `TAG_fascism_ADJ`. */
  byIdeology?: Record<string, CountryNameSet>;
}

/** Localisation entries for a country's names; pass one CountryNames per language. */
export function countryNameEntries(names: CountryNames): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  const add = (prefix: string, set: CountryNameSet) => {
    out.push({ key: prefix, value: set.name });
    out.push({ key: `${prefix}_DEF`, value: set.definite ?? set.name });
    out.push({ key: `${prefix}_ADJ`, value: set.adjective });
  };
  add(names.tag, names.base);
  for (const [ideology, set] of Object.entries(names.byIdeology ?? {})) add(`${names.tag}_${ideology}`, set);
  return out;
}

export function countryNamesLocFiles(tag: string, byLanguage: Partial<Record<Hoi4Language, CountryNames>>): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  for (const [lang, names] of Object.entries(byLanguage) as [Hoi4Language, CountryNames][]) {
    files[`localisation/${lang}/${tag}_names_l_${lang}.yml`] = formatLocalizationYaml(lang, countryNameEntries(names));
  }
  return files;
}

/** history/countries snippet: starting technologies (set_technology) and recruited characters. */
export function countryHistoryExtras(extras: { technologies?: string[]; characters?: string[]; ideas?: string[] }): string {
  const lines: string[] = [];
  if (extras.technologies && extras.technologies.length > 0) {
    lines.push('set_technology = {', ...extras.technologies.map((t) => `${T}${t} = 1`), '}');
  }
  if (extras.ideas && extras.ideas.length > 0) lines.push(`add_ideas = { ${extras.ideas.join(' ')} }`);
  for (const c of extras.characters ?? []) lines.push(`recruit_character = ${c}`);
  return join(lines);
}

// ---------------------------------------------------------------------------
// Order of battle
// ---------------------------------------------------------------------------

export interface DivisionDeployment {
  template: string;
  location: number;
  count?: number;
  name?: string;
  startExperience?: number;
  startEquipment?: number;
}

/** `units = { division = { ... } }` block of history/units/<TAG>_<year>.txt. */
export function generateDeployments(deployments: DivisionDeployment[]): string {
  const out: string[] = ['units = {'];
  for (const d of deployments) {
    for (let i = 0; i < Math.max(1, d.count ?? 1); i++) {
      out.push(`${T}division = {`);
      if (d.name) out.push(`${T}${T}name = "${d.name}"`);
      out.push(`${T}${T}location = ${d.location}`);
      out.push(`${T}${T}division_template = "${d.template}"`);
      if (d.startExperience !== undefined) out.push(`${T}${T}start_experience_factor = ${d.startExperience}`);
      if (d.startEquipment !== undefined) out.push(`${T}${T}start_equipment_factor = ${d.startEquipment}`);
      out.push(`${T}}`);
    }
  }
  out.push('}');
  return join(out);
}

export interface AirWingDef {
  /** State id of the air base. */
  baseState: number;
  wings: { equipment: string; owner: string; amount: number; name?: string }[];
}

export function generateAirWings(bases: AirWingDef[]): string {
  const out: string[] = ['air_wings = {'];
  for (const b of bases) {
    out.push(`${T}${b.baseState} = {`);
    for (const w of b.wings) {
      out.push(`${T}${T}${w.equipment} = {`, `${T}${T}${T}owner = "${w.owner}"`, `${T}${T}${T}amount = ${w.amount}`);
      if (w.name) out.push(`${T}${T}${T}name = "${w.name}"`);
      out.push(`${T}${T}}`);
    }
    out.push(`${T}}`);
  }
  out.push('}');
  return join(out);
}

export interface FleetDef {
  name: string;
  navalBase: number;
  taskForces: {
    name: string;
    location: number;
    ships: { name: string; definition: string; equipment: string; owner: string; version?: string; experience?: number }[];
  }[];
}

export function generateFleets(fleets: FleetDef[]): string {
  const out: string[] = [];
  const ind = (n: number) => T.repeat(n);
  for (const f of fleets) {
    out.push('fleet = {', `${ind(1)}name = "${f.name}"`, `${ind(1)}naval_base = ${f.navalBase}`);
    for (const tf of f.taskForces) {
      out.push(`${ind(1)}task_force = {`, `${ind(2)}name = "${tf.name}"`, `${ind(2)}location = ${tf.location}`);
      for (const s of tf.ships) {
        out.push(`${ind(2)}ship = {`, `${ind(3)}name = "${s.name}"`, `${ind(3)}definition = ${s.definition}`);
        if (s.experience !== undefined) out.push(`${ind(3)}start_experience_factor = ${s.experience}`);
        out.push(`${ind(3)}equipment = {`, `${ind(4)}${s.equipment} = {`, `${ind(5)}amount = 1`, `${ind(5)}owner = ${s.owner}`);
        if (s.version) out.push(`${ind(5)}version_name = "${s.version}"`);
        out.push(`${ind(4)}}`, `${ind(3)}}`, `${ind(2)}}`);
      }
      out.push(`${ind(1)}}`);
    }
    out.push('}');
  }
  return join(out);
}

/** A whole history/units file: templates + deployments + optional air wings and fleets. */
export function generateOobFile(parts: { templates?: string[]; deployments?: DivisionDeployment[]; air?: AirWingDef[]; fleets?: FleetDef[] }): string {
  const sections: string[] = [];
  for (const t of parts.templates ?? []) sections.push(t.trimEnd());
  sections.push(generateDeployments(parts.deployments ?? []).trimEnd());
  if (parts.air && parts.air.length > 0) sections.push(generateAirWings(parts.air).trimEnd());
  if (parts.fleets && parts.fleets.length > 0) sections.push(generateFleets(parts.fleets).trimEnd());
  return sections.join(NL + NL) + NL;
}

export interface DivisionNameGroup {
  id: string;
  name: string;
  countries: string[];
  divisionTypes: string[];
  fallback: string;
  /** Ordered names by number: { 1: "1st Guard" } */
  ordered: Record<number, string>;
}

/** common/units/names_divisions/<TAG>_names_divisions.txt */
export function generateDivisionNameGroups(groups: DivisionNameGroup[]): string {
  const out: string[] = [];
  for (const g of groups) {
    out.push(`${g.id} = {`, `${T}name = "${g.name}"`, '');
    out.push(`${T}for_countries = { ${g.countries.join(' ')} }`, '');
    out.push(`${T}can_use = { always = yes }`, '');
    out.push(`${T}division_types = { ${g.divisionTypes.map((d) => `"${d}"`).join(' ')} }`, '');
    out.push(`${T}fallback_name = "${g.fallback}"`, '');
    out.push(`${T}ordered = {`);
    for (const [n, name] of Object.entries(g.ordered).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      out.push(`${T}${T}${n} = { "${name}" }`);
    }
    out.push(`${T}}`, '}', '');
  }
  return join(out);
}

// ---------------------------------------------------------------------------
// Dynamic content
// ---------------------------------------------------------------------------

export interface DynamicModifierDef {
  id: string;
  icon?: string;
  enable?: string;
  removeTrigger?: string;
  /** Stat -> number, or a variable name for values that follow the situation. */
  modifier: Record<string, number | string>;
}

export function generateDynamicModifiers(mods: DynamicModifierDef[]): string {
  const out: string[] = [];
  for (const m of mods) {
    out.push(`${m.id} = {`);
    if (m.icon) out.push(`${T}icon = "${m.icon}"`);
    if (m.enable) out.push(`${T}enable = { ${m.enable} }`);
    if (m.removeTrigger) out.push(`${T}remove_trigger = { ${m.removeTrigger} }`);
    for (const [stat, value] of Object.entries(m.modifier)) out.push(`${T}${stat} = ${value}`);
    out.push('}', '');
  }
  return join(out);
}

export interface OnActionDef {
  /** e.g. on_startup, on_daily_LUX, on_war */
  hook: string;
  /** Optional limit trigger wrapped in an if. */
  limit?: string;
  effect: string;
}

export function generateOnActions(actions: OnActionDef[]): string {
  const out: string[] = ['on_actions = {'];
  for (const a of actions) {
    out.push(`${T}${a.hook} = {`, `${T}${T}effect = {`);
    if (a.limit) out.push(`${T}${T}${T}if = {`, `${T}${T}${T}${T}limit = { ${a.limit} }`, `${T}${T}${T}${T}${a.effect}`, `${T}${T}${T}}`);
    else out.push(`${T}${T}${T}${a.effect}`);
    out.push(`${T}${T}}`, `${T}}`);
  }
  out.push('}');
  return join(out);
}

export interface ScriptedLocDef {
  name: string;
  options: { trigger?: string; key: string }[];
}

export function generateScriptedLocalisation(defs: ScriptedLocDef[]): string {
  const out: string[] = [];
  for (const d of defs) {
    out.push('defined_text = {', `${T}name = ${d.name}`);
    for (const o of d.options) {
      out.push(`${T}text = {`);
      if (o.trigger) out.push(`${T}${T}trigger = { ${o.trigger} }`);
      out.push(`${T}${T}localization_key = ${o.key}`, `${T}}`);
    }
    out.push('}', '');
  }
  return join(out);
}
