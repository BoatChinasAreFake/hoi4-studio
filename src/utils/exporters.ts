import type {
  StrategicResourceDef,
  CustomBuildingDef,
  RaidMissionDef,
  RaidCategory,
  SpecialProjectDef,
  SpecialProjectType,
  SpecialProjectComplexity,
} from '../types/economy';
import type { ModularChassisDesign } from '../types/military';

/**
 * Script exporters for the economy / military studios, shaped after the vanilla HOI4 1.19.4 files they
 * target. Each one lists the vanilla file it follows; settings the game has no key for are kept as
 * comments rather than invented keys.
 */

const NL = String.fromCharCode(10);
const T = String.fromCharCode(9);
const join = (lines: string[]) => lines.join(NL) + NL;

// ---------------------------------------------------------------------------
// common/resources/*.txt  (vanilla: icon_frame, cic, convoys)
// ---------------------------------------------------------------------------

export function generateResourcesScript(resources: StrategicResourceDef[]): string {
  const out: string[] = ['resources = {', ''];
  resources.forEach((r, i) => {
    out.push(`${T}${r.id} = {`);
    out.push(`${T}${T}icon_frame = ${i + 1}`);
    // baseCicCost is "civilian factories per 8 units"; vanilla stores it per unit (0.125 = 1 / 8).
    out.push(`${T}${T}cic = ${+(r.baseCicCost / 8).toFixed(4)}`);
    out.push(`${T}${T}convoys = ${r.convoysRequiredPerUnit}`);
    out.push(`${T}}`, '');
  });
  out.push('}');
  return join(out);
}

// ---------------------------------------------------------------------------
// common/buildings/*.txt  (vanilla: bunker / arms_factory layout)
// ---------------------------------------------------------------------------

export function generateBuildingsScript(buildings: CustomBuildingDef[]): string {
  const out: string[] = ['buildings = {', ''];
  buildings.forEach((b, i) => {
    out.push(`${T}${b.id} = {`);
    out.push(`${T}${T}show_on_map = ${b.showOnMap ? 1 : 0}`);
    out.push(`${T}${T}base_cost = ${b.baseCost}`);
    if (b.perLevelExtraCost > 0) out.push(`${T}${T}per_level_extra_cost = ${b.perLevelExtraCost}`);
    out.push(`${T}${T}icon_frame = ${i + 1}`);
    out.push(`${T}${T}value = 1`);
    out.push(`${T}${T}infrastructure_construction_effect = yes`);
    out.push(`${T}${T}# damage factor ${b.damageFactor.toFixed(2)} has no vanilla key; set per-building damage in effects instead`);
    out.push(`${T}${T}level_cap = {`);
    out.push(`${T}${T}${T}${b.isProvincial ? 'province_max' : 'state_max'} = ${b.maxLevel}`);
    if (b.sharesSlots && !b.isProvincial) out.push(`${T}${T}${T}shares_slots = yes`);
    out.push(`${T}${T}}`);
    out.push(`${T}}`, '');
  });
  out.push('}');
  return join(out);
}

// ---------------------------------------------------------------------------
// common/raids/*.txt  (vanilla: land_infiltration_raids.txt / air_raids.txt layout)
// ---------------------------------------------------------------------------

const RAID_CATEGORY: Record<RaidCategory, string> = {
  air_raid: 'air_raids',
  commando_raid: 'naval_commando_raids',
  naval_raid: 'naval_commando_raids',
  nuclear_raid: 'nuclear_raids',
  paratrooper_raid: 'paratrooper_raids',
  infiltration_raid: 'land_infiltration_raids',
};

export function generateRaidScript(raid: RaidMissionDef): string {
  const prep = raid.prepPhases.reduce((sum, p) => sum + p.durationDays, 0) || 30;
  const success = Math.min(0.95, Math.max(0.05, 1 - raid.detectionRisk / 100));
  const damage = raid.successEffect.damageBuildingType
    ? [
        `${T}${T}${T}${T}var:target_state = {`,
        `${T}${T}${T}${T}${T}hidden_effect = {`,
        `${T}${T}${T}${T}${T}${T}damage_building = {`,
        `${T}${T}${T}${T}${T}${T}${T}type = ${raid.successEffect.damageBuildingType}`,
        `${T}${T}${T}${T}${T}${T}${T}damage = ${raid.successEffect.damageBuildingLevel ?? 1}`,
        `${T}${T}${T}${T}${T}${T}}`,
        `${T}${T}${T}${T}${T}}`,
        `${T}${T}${T}${T}}`,
      ]
    : [];
  const equipment = Object.entries(raid.requiredEquipment).map(([k, v]) => `${T}${T}${T}${k} = ${v}`);
  return join([
    'types = {',
    '',
    `${T}${raid.id} = {`,
    `${T}${T}category = ${RAID_CATEGORY[raid.category]}`,
    `${T}${T}days_to_prepare = ${prep}`,
    `${T}${T}days_re_enable = 60`,
    `${T}${T}command_power = ${raid.commandPower}`,
    `${T}${T}allowed = { has_dlc = "Gotterdammerung" }`,
    `${T}${T}target_icon = GFX_facility_icon`,
    `${T}${T}launch_sound = raid_launch_air`,
    `${T}${T}starting_point = {`,
    `${T}${T}${T}types = { air_base }`,
    `${T}${T}}`,
    `${T}${T}unit_requirements = {`,
    `${T}${T}${T}equipment = {`,
    `${T}${T}${T}${T}type = { tactical_bomber }`,
    `${T}${T}${T}${T}amount = { min = 10 }`,
    `${T}${T}${T}}`,
    `${T}${T}}`,
    `${T}${T}arrow = {`,
    `${T}${T}${T}type = ${raid.arrowType === 'ballistic' || raid.arrowType === 'line' ? raid.arrowType : raid.arrowType}`,
    `${T}${T}}`,
    `${T}${T}target_type = {`,
    `${T}${T}${T}province = any`,
    `${T}${T}}`,
    ...(equipment.length > 0 ? [`${T}${T}essential_equipment = {`, ...equipment, `${T}${T}}`] : []),
    `${T}${T}success_factors = {`,
    `${T}${T}${T}success = {`,
    `${T}${T}${T}${T}base = ${success.toFixed(2)}`,
    `${T}${T}${T}}`,
    `${T}${T}}`,
    `${T}${T}success_levels = {`,
    `${T}${T}${T}failure = {`,
    `${T}${T}${T}${T}actor_effects = {`,
    `${T}${T}${T}${T}${T}raid_add_unit_experience = 0.1`,
    `${T}${T}${T}${T}}`,
    `${T}${T}${T}}`,
    `${T}${T}${T}success = {`,
    `${T}${T}${T}${T}victim_effects = {`,
    ...damage,
    `${T}${T}${T}${T}}`,
    `${T}${T}${T}${T}actor_effects = {`,
    `${T}${T}${T}${T}${T}raid_add_unit_experience = 0.2`,
    `${T}${T}${T}${T}}`,
    `${T}${T}${T}}`,
    `${T}${T}}`,
    `${T}}`,
    '}',
  ]);
}

export function generateRaidCategoryScript(raids: RaidMissionDef[]): string {
  const cats = Array.from(new Set(raids.map((r) => RAID_CATEGORY[r.category])));
  return join([
    '# Categories already exist in vanilla (common/raids/categories); only add ids that are missing there.',
    'categories = {',
    ...cats.flatMap((c) => [`${T}# ${c}`]),
    '}',
  ]);
}

// ---------------------------------------------------------------------------
// common/special_projects/projects/*.txt  (vanilla: sp_air_bouncing_bomb layout)
// ---------------------------------------------------------------------------

const SPECIALIZATION: Record<SpecialProjectType, string> = {
  nuclear: 'specialization_nuclear',
  land_cruiser: 'specialization_land',
  jet_propulsion: 'specialization_air',
  stealth_submarine: 'specialization_naval',
  electronics: 'specialization_land',
  artillery: 'specialization_land',
  rocket: 'specialization_air',
};
const COMPLEXITY: Record<SpecialProjectComplexity, string> = {
  simple: 'sp_complexity.small',
  medium: 'sp_complexity.medium',
  complex: 'sp_complexity.large',
  insane: 'sp_complexity.insane',
};

function prototypeTime(days: number): string {
  if (days <= 45) return 'sp_time.prototype.short';
  if (days <= 60) return 'sp_time.prototype.medium';
  if (days <= 100) return 'sp_time.prototype.long';
  return 'sp_time.prototype.very_long';
}

export function generateSpecialProjectScript(p: SpecialProjectDef): string {
  const spec = SPECIALIZATION[p.projectType];
  const resources = Object.entries(p.prototypeCostResources).map(([k, v]) => `${T}${T}${T}${k} = ${v}`);
  return join([
    `${p.id} = {`,
    `${T}specialization = ${spec}`,
    `${T}allowed = {`,
    `${T}${T}has_dlc = "Gotterdammerung"`,
    `${T}}`,
    `${T}breakthrough_cost = {`,
    `${T}${T}${spec} = 1`,
    `${T}}`,
    `${T}resource_cost = {`,
    `${T}${T}resources = {`,
    ...resources,
    `${T}${T}}`,
    `${T}}`,
    `${T}prototype_time = ${prototypeTime(p.prototypeTimeDays)}`,
    `${T}complexity = ${COMPLEXITY[p.complexity]}`,
    `${T}project_output = {`,
    `${T}${T}country_effects = {`,
    ...(p.rewardOutput.enableEquipment ? [`${T}${T}${T}# unlocks equipment: ${p.rewardOutput.enableEquipment}`] : []),
    `${T}${T}${T}custom_effect_tooltip = ${p.id}_completion_tt`,
    `${T}${T}}`,
    `${T}}`,
    '}',
  ]);
}

// ---------------------------------------------------------------------------
// create_equipment_variant effect (documentation/effects_documentation.md)
// ---------------------------------------------------------------------------

export function generateEquipmentVariantScript(design: ModularChassisDesign): string {
  const modules = Object.entries(design.slots).map(([slot, mod]) => `${T}${T}${slot} = ${mod}`);
  return join([
    'create_equipment_variant = {',
    `${T}name = "${design.name}"`,
    `${T}type = ${design.chassisType}`,
    `${T}parent_version = 0`,
    `${T}allow_without_tech = yes`,
    `${T}modules = {`,
    ...modules,
    `${T}}`,
    '}',
  ]);
}

// ---------------------------------------------------------------------------
// music/*.txt + music/*.asset  (vanilla: music_station header, music = { song chance })
// ---------------------------------------------------------------------------

export interface MusicTrackDef {
  song: string;
  assetFile: string;
  chanceFactor: number;
  modifiers: { factor: number; conditions: Record<string, string | number> }[];
}

export function generateMusicStationScript(stationId: string, tracks: MusicTrackDef[]): string {
  const out: string[] = [`music_station = "${stationId}"`, ''];
  for (const t of tracks) {
    out.push('music = {', `${T}song = "${t.song}"`, `${T}chance = {`);
    out.push(`${T}${T}modifier = {`, `${T}${T}${T}factor = ${t.chanceFactor}`, `${T}${T}}`);
    for (const m of t.modifiers) {
      out.push(`${T}${T}modifier = {`, `${T}${T}${T}factor = ${m.factor}`);
      for (const [k, v] of Object.entries(m.conditions)) out.push(`${T}${T}${T}${k} = ${v}`);
      out.push(`${T}${T}}`);
    }
    out.push(`${T}}`, '}', '');
  }
  return join(out);
}

export function generateMusicAssetScript(tracks: MusicTrackDef[]): string {
  const out: string[] = ['# The .ogg files are not generated; place them next to this file in music/.', ''];
  for (const t of tracks) {
    out.push('music = {', `${T}name = "${t.song}"`, `${T}file = "${t.assetFile.split('/').pop()}"`, `${T}volume = 0.65`, '}', '');
  }
  return join(out);
}
