import type { DoctrineNodeDef, DoctrineCategory, MilitaryHqDef, HqLevel } from '../types/military';
import type { MarketSubsidiesConfig } from '../types/economy';

/**
 * Exporters for doctrines, army headquarters and international-market contracts, shaped after the vanilla
 * documentation: common/doctrines/_documentation.md (+ grand_doctrines, subdoctrines, tracks),
 * history/general/taog_hq_template.txt, and the effects add_equipment_subsidy / create_purchase_contract /
 * give_market_access in documentation/effects_documentation.md.
 */

const NL = String.fromCharCode(10);
const T = String.fromCharCode(9);
const join = (lines: string[]) => lines.join(NL) + NL;

// ---------------------------------------------------------------------------
// Doctrines
// ---------------------------------------------------------------------------

/** Vanilla folder ids (common/doctrines/folders) for the app's categories. */
export const DOCTRINE_FOLDER: Record<DoctrineCategory, string> = {
  land: 'land',
  naval: 'naval',
  air: 'air',
  special_forces: 'special_forces',
};

const XP_TYPE: Record<DoctrineCategory, 'army' | 'navy' | 'air'> = { land: 'army', naval: 'navy', air: 'air', special_forces: 'army' };

export interface DoctrineTrackDef {
  id: string;
  /** Localisation key of the track name. */
  nameKey: string;
  /** Subunit categories whose manpower feeds mastery, e.g. category_all_infantry. */
  categories: string[];
  multiplier?: number;
  background?: string;
  icon?: string;
  iconFrame?: string;
}

export interface SubdoctrineDef {
  id: string;
  trackId: string;
  name: string;
  description: string;
  xpCost: number;
  modifiers: Record<string, number | string>;
  /** One entry per reward, unlocked in order as mastery grows. */
  rewards: Record<string, number | string>[];
  xor?: string[];
  icon?: string;
}

export interface GrandDoctrineDef {
  id: string;
  folder: string;
  name: string;
  description: string;
  xpCost: number;
  xpType: 'army' | 'navy' | 'air';
  modifiers: Record<string, number | string>;
  icon?: string;
  trackIds: string[];
}

export interface DoctrineSet {
  grand: GrandDoctrineDef;
  tracks: DoctrineTrackDef[];
  subdoctrines: SubdoctrineDef[];
}

const modifierLines = (mods: Record<string, number | string>, indent: number) =>
  Object.entries(mods).map(([k, v]) => `${T.repeat(indent)}${k} = ${v}`);

export function generateGrandDoctrine(g: GrandDoctrineDef): string {
  return join([
    `${g.id} = {`,
    `${T}folder = ${g.folder}`,
    `${T}name = ${g.id.toUpperCase()}`,
    `${T}description = ${g.id.toUpperCase()}_DESC`,
    `${T}icon = ${g.icon ?? 'GFX_mobile_warfare_medium'}`,
    `${T}available = { always = yes }`,
    `${T}visible = { always = yes }`,
    `${T}xp_cost = ${g.xpCost}`,
    `${T}xp_type = ${g.xpType}`,
    `${T}ai_will_do = { }`,
    `${T}tracks = {`,
    ...g.trackIds.map((t) => `${T}${T}${t}`),
    `${T}}`,
    `${T}# One (empty) milestone per track, in track order.`,
    `${T}milestones = {`,
    ...g.trackIds.map(() => `${T}${T}{ }`),
    `${T}}`,
    ...modifierLines(g.modifiers, 1),
    '}',
  ]);
}

export function generateDoctrineTracks(tracks: DoctrineTrackDef[]): string {
  const out: string[] = [];
  for (const t of tracks) {
    out.push(
      `${t.id} = {`,
      `${T}name = ${t.nameKey}`,
      `${T}background = "${t.background ?? 'GFX_grand_battleplan_bg'}"`,
      `${T}icon = "${t.icon ?? 'GFX_doctrine_milestone_infantry_land'}"`,
      `${T}icon_frame = "${t.iconFrame ?? 'GFX_doctrine_decor_land'}"`,
      `${T}mastery = {`,
      `${T}${T}multiplier = ${t.multiplier ?? 1}`,
      `${T}${T}categories = {`,
      ...t.categories.map((c) => `${T}${T}${T}${c}`),
      `${T}${T}}`,
      `${T}}`,
      '}',
      ''
    );
  }
  return join(out);
}

export function generateSubdoctrines(subs: SubdoctrineDef[], xpType: 'army' | 'navy' | 'air'): string {
  const out: string[] = [];
  for (const s of subs) {
    out.push(
      `${s.id} = {`,
      `${T}track = ${s.trackId}`,
      `${T}name = ${s.id.toUpperCase()}`,
      `${T}description = ${s.id.toUpperCase()}_DESC`,
      `${T}icon = ${s.icon ?? 'GFX_doctrine_armored_cavalry_medium'}`,
      `${T}available = { always = yes }`,
      `${T}visible = { always = yes }`,
      `${T}xp_cost = ${s.xpCost}`,
      `${T}xp_type = ${xpType}`,
      `${T}ai_will_do = { }`,
      ...modifierLines(s.modifiers, 1),
      `${T}rewards = {`
    );
    // Rewards are named blocks (key = <id>_reward_N for localisation), not anonymous ones.
    s.rewards.forEach((r, i) => out.push(`${T}${T}reward_${i + 1} = {`, ...modifierLines(r, 3), `${T}${T}}`));
    out.push(`${T}}`);
    if (s.xor && s.xor.length > 0) out.push(`${T}xor = { ${s.xor.join(' ')} }`);
    out.push('}', '');
  }
  return join(out);
}

/** Localisation entries for a doctrine set (names, descriptions, track names and reward text keys). */
export function doctrineLocEntries(set: DoctrineSet, names: Record<string, string>): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [
    { key: set.grand.id.toUpperCase(), value: set.grand.name },
    { key: `${set.grand.id.toUpperCase()}_DESC`, value: set.grand.description },
  ];
  for (const t of set.tracks) out.push({ key: t.nameKey, value: names[t.id] ?? t.id });
  for (const s of set.subdoctrines) {
    out.push({ key: s.id.toUpperCase(), value: s.name }, { key: `${s.id.toUpperCase()}_DESC`, value: s.description });
    // Reward keys are <subdoctrine>_<index> / _desc per the doctrine documentation; one pair per reward.
    s.rewards.forEach((_, i) => {
      out.push({ key: `${s.id}_reward_${i + 1}`, value: `${s.name} reward ${i + 1}` }, { key: `${s.id}_reward_${i + 1}_desc`, value: `Unlocked as mastery grows.` });
    });
  }
  return out;
}

/**
 * Build a doctrine set from the studio's node list: branches become tracks, level 1 nodes become subdoctrines and
 * deeper nodes of the same branch become that subdoctrine's rewards.
 */
export function doctrineSetFromNodes(nodes: DoctrineNodeDef[], grandId: string, grandName: string): DoctrineSet {
  if (nodes.length === 0) throw new Error('No doctrine nodes to export.');
  const category = nodes[0].category;
  const byBranch = new Map<string, DoctrineNodeDef[]>();
  for (const n of nodes) byBranch.set(n.branch, [...(byBranch.get(n.branch) ?? []), n]);
  const tracks: DoctrineTrackDef[] = [];
  const subdoctrines: SubdoctrineDef[] = [];
  for (const [branch, list] of byBranch) {
    const ordered = [...list].sort((a, b) => a.level - b.level);
    const root = ordered[0];
    tracks.push({ id: `${grandId}_${branch}`, nameKey: `${grandId.toUpperCase()}_${branch.toUpperCase()}_TRACK`, categories: ['category_all_infantry'] });
    subdoctrines.push({
      id: root.id,
      trackId: `${grandId}_${branch}`,
      name: root.name,
      description: root.description,
      xpCost: root.costXp,
      modifiers: root.statModifiers,
      rewards: ordered.slice(1).map((n) => n.statModifiers),
      xor: root.mutuallyExclusiveWith,
    });
  }
  return {
    grand: {
      id: grandId,
      folder: DOCTRINE_FOLDER[category],
      name: grandName,
      description: `${grandName}.`,
      xpCost: 100,
      xpType: XP_TYPE[category],
      modifiers: {},
      trackIds: tracks.map((t) => t.id),
    },
    tracks,
    subdoctrines,
  };
}

export function doctrineFiles(set: DoctrineSet): Record<string, string> {
  const folder = set.grand.folder === 'naval' ? 'sea' : set.grand.folder;
  return {
    [`common/doctrines/grand_doctrines/${set.grand.id}_grand_doctrines.txt`]: generateGrandDoctrine(set.grand),
    [`common/doctrines/tracks/${set.grand.id}_tracks.txt`]: generateDoctrineTracks(set.tracks),
    [`common/doctrines/subdoctrines/${folder}/${set.grand.id}_subdoctrines.txt`]: generateSubdoctrines(set.subdoctrines, set.grand.xpType),
  };
}

// ---------------------------------------------------------------------------
// Army headquarters: a division_template with is_army_hq (history/general/taog_hq_template.txt)
// ---------------------------------------------------------------------------

const HQ_LAYOUT: Record<HqLevel, { regiment: string; count: number; support: string[] }> = {
  corps_hq: { regiment: 'hq_infantry', count: 2, support: ['hq_support_company'] },
  army_hq: { regiment: 'hq_infantry', count: 3, support: ['hq_support_company', 'hq_naval_liaison', 'hq_air_liaison'] },
  army_group_hq: { regiment: 'hq_motorized', count: 4, support: ['hq_support_company', 'hq_naval_liaison', 'hq_air_liaison'] },
  theater_command: { regiment: 'hq_motorized', count: 5, support: ['hq_support_company', 'hq_naval_liaison', 'hq_air_liaison'] },
};

export function generateHqTemplate(hq: MilitaryHqDef, templateCounter = 121): string {
  const layout = HQ_LAYOUT[hq.level];
  return join([
    `# The game has no keys for aura radius, supply or planning bonuses on an HQ template; those come from the units in it.`,
    `# Intended: aura ${hq.auraRadiusProvinces} provinces, commander "${hq.assignedCommanderName}", base location province ${hq.locationProvinceId}.`,
    'division_template = {',
    `${T}name = "${hq.name}"`,
    `${T}template_counter = ${templateCounter}`,
    `${T}is_army_hq = yes`,
    '',
    `${T}regiments = {`,
    ...Array.from({ length: layout.count }, (_, y) => `${T}${T}${layout.regiment} = { x = 0 y = ${y} }`),
    `${T}}`,
    '',
    `${T}support = {`,
    ...layout.support.map((s, y) => `${T}${T}${s} = { x = 0 y = ${y} }`),
    `${T}}`,
    '}',
  ]);
}

// ---------------------------------------------------------------------------
// International market: effects (no vanilla file format exists for subsidies or contracts)
// ---------------------------------------------------------------------------

const EQUIPMENT_ARCHETYPE: Record<string, string> = {
  infantry: 'infantry_equipment',
  armor: 'armor_equipment',
  air: 'fighter_equipment',
  naval: 'ship_hull_light',
  support: 'support_equipment',
};

/** A scripted effect that applies every subsidy and opens market access between the listed countries. */
export function generateMarketEffect(effectName: string, config: MarketSubsidiesConfig): string {
  const out: string[] = [`${effectName} = {`];
  const pairs = new Set<string>();
  for (const s of config.bilateralSubsidies) {
    const archetype = EQUIPMENT_ARCHETYPE[s.equipmentCategory] ?? s.equipmentCategory;
    // cic is the subsidy size; discount % of the exchange ratio gives a readable amount.
    const cic = Math.max(1, Math.round((s.discountPercent / 100) * config.civFactoryExchangeRatio * 10));
    out.push(
      `${T}${s.buyerTag} = {`,
      `${T}${T}add_equipment_subsidy = {`,
      `${T}${T}${T}cic = ${cic}`,
      `${T}${T}${T}equipment_type = ${archetype}`,
      `${T}${T}${T}seller_tags = { ${s.sellerTag} }`,
      `${T}${T}}`,
      `${T}}`
    );
    const key = [s.buyerTag, s.sellerTag].sort().join('-');
    if (!pairs.has(key)) {
      pairs.add(key);
      out.push(`${T}${s.buyerTag} = { give_market_access = ${s.sellerTag} }`);
    }
  }
  out.push('}');
  return join(out);
}

export function generatePurchaseContract(contract: { seller: string; buyer: string; civilianFactories: number; equipment: Record<string, number> }): string {
  return join([
    'create_purchase_contract = {',
    `${T}seller = ${contract.seller}`,
    `${T}buyer = ${contract.buyer}`,
    `${T}civilian_factories = ${contract.civilianFactories}`,
    ...Object.entries(contract.equipment).flatMap(([type, amount]) => [`${T}equipment = {`, `${T}${T}type = ${type}`, `${T}${T}amount = ${amount}`, `${T}}`]),
    '}',
  ]);
}
