/**
 * Builds the Ashen Concord total-conversion mod: a generated map and world with custom countries, ideologies,
 * characters, focus trees and flags, written by the suite's own generators.
 *
 *   npm run overhaul:build [-- <output folder>]
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { sanitizeVanillaScript, remapIdeologies, redirectTags } from './sanitize';
import { dirname, join } from 'node:path';
import { findGameDir } from '../modbuilder/vanilla';
import { generateWorld } from './worldgen';
import { renderMapFiles } from './mapfiles';
import { renderContent, descriptorBody, launcherBody, MOD_ID, COUNTRIES, DUMMY_TAG } from './content';

const outRoot = process.argv[2] ?? join('mods');
const modDir = join(outRoot, MOD_ID);

const world = generateWorld({ width: 1024, height: 512, seed: 1950, landProvinces: 200, seaProvinces: 90, statesTarget: 46, countries: COUNTRIES.length });
const files: Record<string, Uint8Array | string> = { ...renderMapFiles(world), ...renderContent(world), 'descriptor.mod': descriptorBody(false) };

// replace_path cannot be used where the game needs part of a folder (economy laws, generic modifiers), so the vanilla
// files written for vanilla tags and ideologies are shadowed by empty files of the same name instead.
const gameDir = findGameDir();
if (gameDir) {
  const shadow: Array<[string, RegExp]> = [
    ['common/dynamic_modifiers', /^0_/],
    ['common/bop', /^$/],
    ['common/operations', /^$/],
    ['common/focus_inlay_windows', /^$/],
    ['common/factions/templates', /^$/],
    ['common/ai_navy/goals', /^$/],
    ['common/unit_medals', /^$/],
    ['common/abilities', /^generic/],
    ['common/unit_leader', /^00_/],
    ['common/ai_equipment', /^generic_/],

  ];
  for (const [folder, keep] of shadow) {
    for (const name of readdirSync(join(gameDir, folder))) if (name.endsWith('.txt') && !keep.test(name)) files[`${folder}/${name}`] = '# intentionally empty: vanilla content for tags and ideologies this mod removes\n';
  }
  // generic vanilla files that stay: the lines that name vanilla tags and focuses are cut out of a copy
  const keepSanitized = [
    'common/autonomous_states/dominion.txt', 'common/occupation_laws/occupation_laws.txt',
    'common/unit_leader/00_traits.txt', 'common/scorers/country/generic_platonic_scorers.txt', 'common/technologies/NSB_armor.txt', 'common/technologies/MTG_naval.txt', 'common/technologies/support.txt', 'common/abilities/generic_leader_abilities.txt', 'common/factions/rules/joining_rules.txt', 'common/factions/rules/dismissal_rules.txt',
  ];
  keepSanitized.push('common/technologies/infantry.txt', 'common/technologies/naval.txt', 'common/technologies/industry.txt', 'common/technologies/electronic_mechanical_engineering.txt',
    'common/special_projects/projects/land_projects.txt', 'common/special_projects/projects/naval_projects.txt',
    'common/doctrines/subdoctrines/land/infantry_subdoctrines.txt',
    'common/military_industrial_organization/policies/_general_policies.txt', 'common/scorers/country/ai_decryption_scorer.txt',
    'common/continuous_focus/generic.txt', ...readdirSync(join(gameDir, 'common/autonomous_states')).filter((n) => n.endsWith('.txt')).map((n) => `common/autonomous_states/${n}`));
  const noSan = (process.env.OVERHAUL_NOSAN ?? '').split(',').filter(Boolean);
  for (const rel of keepSanitized) {
    if (noSan.some((x) => rel.includes(x))) continue;
    const src = join(gameDir, rel);
    if (!existsSync(src)) continue;
    const raw = readFileSync(src, 'utf8');
    // most parsers need the byte-order mark for files with non-ASCII text; the technologies parser rejects it
    files[rel] = (rel.startsWith('common/technologies/') ? '' : String.fromCharCode(0xfeff)) + sanitizeVanillaScript(raw.replace(/^\ufeff/, ''));
  }
  // landmark buildings list vanilla tags as controllers; point them at the dummy tag
  const landmark = 'common/buildings/01_landmark_buildings.txt';
  if (existsSync(join(gameDir, landmark))) {
    const raw = readFileSync(join(gameDir, landmark), 'utf8');
    files[landmark] = (raw.charCodeAt(0) === 0xfeff ? String.fromCharCode(0xfeff) : '') + raw.replace(/^\ufeff/, '').replace(/enable_for_controllers\s*=\s*\{[^}]*\}/g, `enable_for_controllers = { ${DUMMY_TAG} }`);
  }
  // generic scripts that test vanilla ideologies: point them at this mod's ideologies
  const remap = [
    'common/collections/collections.txt', 'common/factions/rules/joining_rules.txt', 'common/factions/rules/dismissal_rules.txt',
    'common/occupation_laws/occupation_laws.txt', 'common/continuous_focus/generic.txt', 'music/_songs.txt',
    'common/special_projects/projects/naval_projects.txt', 'common/special_projects/projects/land_projects.txt',
    'common/scorers/country/generic_platonic_scorers.txt', 'gfx/army_icons/army_icons.txt', 'common/difficulty_settings/00_difficulty.txt',
    ...readdirSync(join(gameDir, 'common/factions/rules')).filter((n) => n.endsWith('.txt')).map((n) => `common/factions/rules/${n}`),
    ...readdirSync(join(gameDir, 'common/ai_equipment')).filter((n) => n.startsWith('generic_')).map((n) => `common/ai_equipment/${n}`),
    ...readdirSync(join(gameDir, 'common/autonomous_states')).filter((n) => n.endsWith('.txt')).map((n) => `common/autonomous_states/${n}`),
  ];
  for (const rel of remap) {
    const shipped = files[rel];
    const src = join(gameDir, rel);
    const text = typeof shipped === 'string' ? shipped : existsSync(src) ? readFileSync(src, 'utf8') : undefined;
    // keep the vanilla file's own byte-order mark state: some parsers reject a BOM the original did not have
    const hadBom = existsSync(src) && readFileSync(src, 'utf8').charCodeAt(0) === 0xfeff;
    if (text !== undefined) files[rel] = (hadBom ? String.fromCharCode(0xfeff) : '') + redirectTags(remapIdeologies(text.replace(/^\ufeff/, '')), DUMMY_TAG);
  }
  // DLC portrait files are grouped by vanilla tag too; shadow each by name (portraits/ is replaced in the base game only)
  files['portraits/998_scientist_portraits.txt'] = '# intentionally empty'+String.fromCharCode(10);
  for (const dlcRoot of ['dlc', 'integrated_dlc']) {
    const root = join(gameDir, dlcRoot);
    if (!existsSync(root)) continue;
    for (const dlc of readdirSync(root)) {
      const dir = join(root, dlc, 'portraits');
      if (existsSync(dir)) for (const name of readdirSync(dir)) if (name.endsWith('.txt')) files[`portraits/${name}`] = '# intentionally empty\n';
    }
  }
  // equipment designer icons are keyed by vanilla tag: ship copies with the tag blocks cut out (base game and DLC folders)
  const dbRel = 'gfx/interface/equipmentdesigner/graphic_db';
  for (const root of [gameDir, ...['dlc', 'integrated_dlc'].flatMap((d) => (existsSync(join(gameDir, d)) ? readdirSync(join(gameDir, d)).map((x) => join(gameDir, d, x)) : []))]) {
    const dir = join(root, dbRel);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) if (name.endsWith('.txt')) files[`${dbRel}/${name}`] = String.fromCharCode(0xfeff) + sanitizeVanillaScript(readFileSync(join(dir, name), 'utf8').replace(/^﻿/, ''));
  }
  // the generic AI equipment roles are blocked for a list of vanilla tags; point the lists at the dummy tag instead
  for (const name of readdirSync(join(gameDir, 'common/ai_equipment'))) {
    if (!name.startsWith('generic_') || !name.endsWith('.txt')) continue;
    const text = readFileSync(join(gameDir, 'common/ai_equipment', name), 'utf8').replace(/^\ufeff/, '');
    files[`common/ai_equipment/${name}`] = text.replace(/blocked_for\s*=\s*\{[^}]*\}/g, `blocked_for = { ${DUMMY_TAG} }`);
  }
  // the vanilla sabotage actions reference DLC laws and resources this mod does not ship
  files['common/resistance_activity/resistance_activity.txt'] = '# intentionally empty' + String.fromCharCode(10);
  files['common/achievements.txt'] = '# intentionally empty\n';
  // song unlock triggers written for vanilla tags (the files live in DLC folders, so they are shadowed by name)
  for (const song of ['bba', 'toa', 'mtg', 'lar', 'got', 'dod', 'nsb', 'commonwealth']) files[`music/${song}_songs.txt`] = '# intentionally empty\n';
  for (const f of ['alliedradio', 'eastern_front']) files[`music/${f}.txt`] = '# intentionally empty\n';
}

// Debug aid: OVERHAUL_SKIP=buildings.txt,unitstacks.txt leaves out matching files, to bisect a load crash.
const skip = (process.env.OVERHAUL_SKIP ?? '').split(',').filter(Boolean);
for (const path of Object.keys(files)) if (skip.some((x) => path.includes(x))) delete files[path];

rmSync(modDir, { recursive: true, force: true });
for (const [path, content] of Object.entries(files)) {
  const full = join(modDir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}
mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, `${MOD_ID}.mod`), launcherBody());

const land = world.provinces.filter((p) => !p.isSea).length;
console.log(`Wrote ${Object.keys(files).length} files to ${modDir}`);
console.log(`${world.provinces.length} provinces (${land} land, ${world.provinces.length - land} sea), ${world.states.length} states, ${COUNTRIES.length} countries`);
