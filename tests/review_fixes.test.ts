import { describe, it, expect } from 'vitest';
import { generateRaidScript } from '../src/utils/exporters';
import { keysAtDepth, validateModProject, textFile, type ModFiles } from '../src/utils/modProject';
import { lintScript } from '../src/utils/scriptCatalog';
import { parseBmp8, applyBrush } from '../src/utils/mapFiles';
import { doctrineSetFromNodes, generateDoctrineTracks, generateHqTemplate, generateMarketEffect } from '../src/utils/militaryExporters';
import { buildExperimentalMod } from '../tools/modbuilder/experimental';
import { buildMod } from '../tools/modbuilder/grandDuchy';
import type { RaidMissionDef, RaidCategory } from '../src/types/economy';
import type { DoctrineNodeDef, MilitaryHqDef } from '../src/types/military';

const NL = String.fromCharCode(10);

const raid = (category: RaidCategory): RaidMissionDef => ({
  id: 'r', name: 'R', category, arrowType: 'air', commandPower: 20,
  prepPhases: [{ name: 'p', durationDays: 30, requiredIntel: 0, commandPowerCost: 0 }],
  requiredEquipment: {}, successEffect: {}, failureEffect: {}, detectionRisk: 40,
});

describe('raid exporter follows the category', () => {
  it('air raids need bombers from an air base', () => {
    const t = generateRaidScript(raid('air_raid'));
    expect(t).toContain('types = { air_base }');
    expect(t).toContain('tactical_bomber');
    expect(t).toContain('launch_sound = raid_launch_air');
  });
  it('naval, paratrooper, nuclear and infiltration raids do not', () => {
    const naval = generateRaidScript(raid('naval_raid'));
    expect(naval).toContain('types = { naval_base }');
    expect(naval).toContain('marine = { min = 3 }');
    expect(naval).not.toContain('tactical_bomber');
    expect(naval).not.toContain('raid_launch_air');
    expect(generateRaidScript(raid('paratrooper_raid'))).toContain('transport_plane_equipment = 10');
    expect(generateRaidScript(raid('nuclear_raid'))).toContain('nukes = 1');
    expect(generateRaidScript(raid('infiltration_raid'))).toContain('building_types = { supply_node }');
  });
  it('studio equipment overrides the category default', () => {
    expect(generateRaidScript({ ...raid('naval_raid'), requiredEquipment: { convoy: 5 } })).toContain('convoy = 5');
  });
});

describe('validator reads any indentation', () => {
  it('finds space-indented characters and ideas', () => {
    const chars = 'characters = {' + NL + '    GDR_a = {' + NL + '        name = "A"' + NL + '    }' + NL + '}';
    expect(keysAtDepth(chars, 1)).toEqual(['GDR_a']);
    const ideas = 'ideas = {' + NL + '  country = {' + NL + '    GDR_idea = { }' + NL + '  }' + NL + '}';
    expect(keysAtDepth(ideas, 2)).toEqual(['GDR_idea']);
    const files: ModFiles = new Map([
      ['descriptor.mod', textFile('name="x" supported_version="1.19.*" tags={ "Gameplay" }')],
      ['common/characters/c.txt', textFile(chars)],
      ['common/on_actions/a.txt', textFile('on_actions = { on_startup = { effect = { recruit_character = GDR_a } } }')],
    ]);
    expect(validateModProject(files).some((p) => p.code === 'character-ref')).toBe(false);
  });
});

describe('lint does not flag the mods own scripted effects', () => {
  const catalog = [{ name: 'add_stability', kind: 'effect' as const, scopes: [], targets: [], doc: '' }];
  it('ignores add_namespace and names defined in the same text', () => {
    expect(lintScript('add_namespace = my', catalog)).toEqual([]);
    expect(lintScript('add_my_boost = { add_stability = 0.1 }' + NL + 'add_my_boost = yes', catalog)).toEqual([]);
    expect(lintScript('add_unknown_thing = 5', catalog).length).toBe(1);
  });
});

describe('smooth brush', () => {
  it('matches the result of smoothing from a full snapshot and does not touch pixels outside the brush', () => {
    const rowSize = 16;
    const header = new Uint8Array(54 + 1024);
    const v = new DataView(header.buffer);
    header[0] = 0x42; header[1] = 0x4d; v.setUint32(10, header.length, true); v.setInt32(18, 16, true); v.setInt32(22, 16, true); v.setUint16(28, 8, true);
    const bytes = new Uint8Array(header.length + rowSize * 16);
    bytes.set(header, 0);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) bytes[header.length + (15 - y) * rowSize + x] = x < 8 ? 0 : 200;
    const bmp = parseBmp8(bytes);
    const outside = bmp.pixels[0];
    applyBrush(bmp, { x: 8, y: 8, radius: 2, mode: 'smooth', value: 0, softness: 0 });
    expect(bmp.pixels[8 * 16 + 7]).toBeGreaterThan(0);
    expect(bmp.pixels[8 * 16 + 7]).toBeLessThan(200);
    expect(bmp.pixels[0]).toBe(outside);
  });
});

describe('doctrines and headquarters', () => {
  const node = (category: DoctrineNodeDef['category']): DoctrineNodeDef => ({ id: 'n', name: 'N', branch: 'grand_battleplan', category, level: 1, costXp: 100, statModifiers: {}, description: '', icon: '' });
  it('naval and air tracks use equipment categories, not infantry', () => {
    const naval = generateDoctrineTracks(doctrineSetFromNodes([node('naval')], 'g', 'G').tracks);
    expect(naval).toContain('equipment = {');
    expect(naval).toContain('capital_ship');
    expect(naval).not.toContain('category_all_infantry');
    expect(generateDoctrineTracks(doctrineSetFromNodes([node('land')], 'g', 'G').tracks)).toContain('category_all_infantry');
    expect(generateDoctrineTracks(doctrineSetFromNodes([node('special_forces')], 'g', 'G').tracks)).toContain('category_special_forces');
  });
  it('HQ templates can have distinct counters and the market uses the studio values', () => {
    const hq: MilitaryHqDef = { id: 'h', name: 'H', level: 'army_hq', auraRadiusProvinces: 1, staffTraits: [], assignedCommanderName: 'X', baseSupplyBonus: 0, basePlanningMultiplier: 0, locationProvinceId: 1 };
    expect(generateHqTemplate(hq, 122)).toContain('template_counter = 122');
    const m = generateMarketEffect('E', { bilateralSubsidies: [{ buyerTag: 'A', sellerTag: 'B', equipmentCategory: 'infantry', discountPercent: 20, deliverySpeedBonusPercent: 10 }], civFactoryExchangeRatio: 99, baseDeliveryDaysPerBatch: 30, tradeQuotaRules: [] });
    expect(m).toContain('cic = 20');
    expect(m).toContain('+10% delivery speed requested');
  });
});

describe('experimental mod country history', () => {
  it('applies the starting technologies and spirit', () => {
    const f = buildExperimentalMod().files.find((x) => x.path === 'history/countries/GDX - Free Duchy.txt')!;
    const text = String(f.content);
    expect(text).toContain('set_technology = {');
    expect(text).toContain('add_ideas = { GDX_national_spirit }');
    expect(text).toContain('set_oob = "GDX_1936"');
  });
});

import { scriptNumber } from '../src/utils/militaryExporters';
import { generateBuildingsScript } from '../src/utils/exporters';

describe('values the game accepts', () => {
  it('turns studio percent strings into script numbers', () => {
    expect(scriptNumber('+15%')).toBe(0.15);
    expect(scriptNumber('-5%')).toBe(-0.05);
    expect(scriptNumber('+5')).toBe(5);
    expect(scriptNumber(0.2)).toBe(0.2);
    expect(scriptNumber('MY_VAR')).toBe('MY_VAR');
  });
  it('buildings never ask for a map model the tool cannot create', () => {
    const text = generateBuildingsScript([{ id: 'b', name: 'B', icon: '', isProvincial: true, baseCost: 1, perLevelExtraCost: 0, maxLevel: 1, sharesSlots: false, showOnMap: true, damageFactor: 1 }]);
    expect(text).toContain('show_on_map = 0');
  });
});

describe('validator warns about content that needs a vanilla gui edit', () => {
  const base: [string, Uint8Array][] = [['descriptor.mod', textFile('name="x" supported_version="1.19.*" tags={ "Gameplay" }')]];
  it('custom technologies without a gridbox', () => {
    const files: ModFiles = new Map([...base, ['common/technologies/t.txt', textFile('technologies = { my_tech = { } }')]]);
    expect(validateModProject(files).some((p) => p.code === 'tech-gridbox')).toBe(true);
    files.set('interface/t.gui', textFile('gridboxtype = { name = "my_tech_tree" }'));
    expect(validateModProject(files).some((p) => p.code === 'tech-gridbox')).toBe(false);
  });
  it('custom resources without a production checkbox', () => {
    const files: ModFiles = new Map([...base, ['common/resources/r.txt', textFile('resources = { my_ore = { cic = 0.125 } }')]]);
    expect(validateModProject(files).some((p) => p.code === 'resource-checkbox')).toBe(true);
    files.set('interface/p.gui', textFile('checkBoxType = { name = "my_ore_checkbox" }'));
    expect(validateModProject(files).some((p) => p.code === 'resource-checkbox')).toBe(false);
  });
  it('the example mods ship neither', () => {
    for (const built of [buildMod(), buildExperimentalMod()]) {
      const paths = built.files.map((f) => f.path);
      expect(paths.some((p) => p.startsWith('common/technologies/') || p.startsWith('common/resources/'))).toBe(false);
    }
  });
});
