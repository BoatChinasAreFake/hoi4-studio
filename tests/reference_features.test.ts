import { describe, it, expect } from 'vitest';
import { parseEffectOrTriggerDocs, parseModifierDocs, buildCatalog, searchCatalog, lintScript, describeEntry } from '../src/utils/scriptCatalog';
import { searchSnippets, SNIPPETS } from '../src/utils/snippets';
import { resizeRgba, encodeTga32, flagFilesFromImage, focusIconFiles, spriteFiles, type Rgba } from '../src/utils/imageAssets';
import { validateFlagTga } from '../src/utils/phase5Generators';
import {
  countryNameEntries, countryHistoryExtras, generateDeployments, generateAirWings, generateFleets, generateOobFile,
  generateDivisionNameGroups, generateDynamicModifiers, generateOnActions, generateScriptedLocalisation,
} from '../src/utils/contentGenerators';

const NL = String.fromCharCode(10);
const FENCE = String.fromCharCode(96).repeat(3);
const solid = (w: number, h: number, c: [number, number, number, number]): Rgba => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(c, i * 4);
  return { width: w, height: h, data };
};

describe('script catalog', () => {
  const effects = ['# Effects', '', '## add_political_power', '', '* Supported Scopes: COUNTRY', '* Supported Targets: none', '', FENCE, 'add political power to country', FENCE, '', '## add_stability', '', '* Supported Scopes: COUNTRY', '', FENCE, 'add stability', FENCE].join(NL);
  const triggers = ['## has_war', '', '* Supported Scopes: COUNTRY', '* Supported Targets: THIS, ROOT', '', FENCE, 'is country at war', FENCE].join(NL);
  const modifiers = ['## Modifiers for scope country', '', '* [stability_factor](#stability_factor)', '* [political_power_gain](#political_power_gain)'].join(NL);

  it('parses effects, triggers and modifiers', () => {
    const e = parseEffectOrTriggerDocs(effects, 'effect');
    expect(e.map((x) => x.name)).toEqual(['add_political_power', 'add_stability']);
    expect(e[0].scopes).toEqual(['COUNTRY']);
    expect(e[0].doc).toBe('add political power to country');
    expect(parseEffectOrTriggerDocs(triggers, 'trigger')[0].targets).toEqual(['THIS', 'ROOT']);
    expect(parseModifierDocs(modifiers).map((x) => x.name)).toEqual(['stability_factor', 'political_power_gain']);
  });

  it('searches by name and description', () => {
    const cat = buildCatalog({ effects, triggers, modifiers });
    expect(searchCatalog(cat, 'add political power')[0].name).toBe('add_political_power');
    expect(searchCatalog(cat, 'war', 'trigger')[0].name).toBe('has_war');
    expect(describeEntry(cat[0])).toContain('Scopes: COUNTRY');
  });

  it('lints braces and unknown effects', () => {
    const cat = buildCatalog({ effects, triggers });
    expect(lintScript('a = { b = { }', cat).some((d) => d.message.includes('unclosed'))).toBe(true);
    expect(lintScript('add_political_power = 5').length).toBe(0);
    expect(lintScript('add_made_up_thing = 5', cat).some((d) => d.severity === 'warning')).toBe(true);
    expect(lintScript('add_political_power = 5', cat).length).toBe(0);
  });
});

describe('snippet library', () => {
  it('finds the political power snippet by a plain-language query', () => {
    expect(searchSnippets('gain political power')[0].id).toBe('pp-gain');
  });
  it('every snippet has balanced braces', () => {
    for (const s of SNIPPETS) expect((s.code.match(/\{/g) ?? []).length, s.id).toBe((s.code.match(/\}/g) ?? []).length);
  });
});

describe('image assets', () => {
  it('resizes and averages colour', () => {
    const out = resizeRgba(solid(100, 60, [200, 20, 20, 255]), 10, 7);
    expect(out.width).toBe(10);
    expect(Array.from(out.data.slice(0, 4))).toEqual([200, 20, 20, 255]);
  });

  it('transparent pixels do not bleed colour', () => {
    const src = solid(2, 1, [255, 0, 0, 255]);
    src.data.set([0, 255, 0, 0], 4);
    const out = resizeRgba(src, 1, 1);
    expect(out.data[0]).toBe(255);
    expect(out.data[1]).toBe(0);
    expect(out.data[3]).toBe(128);
  });

  it('encodes valid 32-bit TGAs and a full flag set', () => {
    const files = flagFilesFromImage('GDX', solid(164, 104, [30, 90, 200, 255]));
    expect(Object.keys(files).length).toBe(15);
    expect(validateFlagTga(files['gfx/flags/GDX.tga'], 'standard').valid).toBe(true);
    expect(validateFlagTga(files['gfx/flags/medium/GDX_fascism.tga'], 'medium').valid).toBe(true);
    expect(validateFlagTga(files['gfx/flags/small/GDX_neutrality.tga'], 'small').valid).toBe(true);
    const tga = encodeTga32(solid(2, 2, [1, 2, 3, 4]));
    expect(Array.from(tga.slice(18, 22))).toEqual([3, 2, 1, 4]);
  });

  it('emits focus icons with a matching .gfx', () => {
    const files = focusIconFiles('gdr', [{ id: 'crest', image: solid(256, 256, [9, 9, 9, 255]) }]);
    expect(Object.keys(files)).toContain('gfx/interface/goals/gdr_crest.tga');
    expect(files['interface/gdr_goals.gfx']).toContain('name = "GFX_goal_gdr_crest"');
    expect(spriteFiles('gdr', [{ id: 'logo', image: solid(8, 8, [1, 1, 1, 255]), width: 4, height: 4 }])['interface/gdr_sprites.gfx']).toContain('GFX_gdr_logo');
  });
});

describe('content generators', () => {
  it('country names per ideology', () => {
    const e = countryNameEntries({ tag: 'GDX', base: { name: 'Free Duchy', adjective: 'Ducal' }, byIdeology: { fascism: { name: 'Ducal Reich', definite: 'the Ducal Reich', adjective: 'Ducal' } } });
    expect(e.map((x) => x.key)).toEqual(['GDX', 'GDX_DEF', 'GDX_ADJ', 'GDX_fascism', 'GDX_fascism_DEF', 'GDX_fascism_ADJ']);
    expect(e.find((x) => x.key === 'GDX_fascism_DEF')!.value).toBe('the Ducal Reich');
    const h = countryHistoryExtras({ technologies: ['infantry_weapons'], characters: ['GDX_leader'] });
    expect(h).toContain('set_technology = {');
    expect(h).toContain('recruit_character = GDX_leader');
  });

  it('order of battle', () => {
    const d = generateDeployments([{ template: 'Inf', location: 3838, count: 2, name: '1st', startExperience: 0.2 }]);
    expect((d.match(/division = \{/g) ?? []).length).toBe(2);
    expect(d).toContain('division_template = "Inf"');
    expect(generateAirWings([{ baseState: 8, wings: [{ equipment: 'fighter_equipment_1', owner: 'GDX', amount: 20, name: 'Wing' }] }])).toContain('fighter_equipment_1 = {');
    const fleet = generateFleets([{ name: 'F', navalBase: 1, taskForces: [{ name: 'TF', location: 1, ships: [{ name: 'S', definition: 'destroyer', equipment: 'ship_hull_light_1', owner: 'GDX', version: 'Basic' }] }] }]);
    expect(fleet).toContain('definition = destroyer');
    const file = generateOobFile({ templates: ['division_template = { name = "Inf" }'], deployments: [{ template: 'Inf', location: 1 }] });
    expect(file.indexOf('division_template')).toBeLessThan(file.indexOf('units = {'));
    const names = generateDivisionNameGroups([{ id: 'GDX_INF_01', name: 'Infantry', countries: ['GDX'], divisionTypes: ['infantry'], fallback: '%d Inf', ordered: { 2: 'Second', 1: 'First' } }]);
    expect(names.indexOf('1 = ')).toBeLessThan(names.indexOf('2 = '));
  });

  it('dynamic content', () => {
    expect(generateDynamicModifiers([{ id: 'GDX_dm', icon: 'GFX_idea_x', enable: 'always = yes', modifier: { stability_factor: 0.1, army_attack_factor: 'GDX_var' } }])).toContain('army_attack_factor = GDX_var');
    expect(generateOnActions([{ hook: 'on_startup', limit: 'country_exists = GDX', effect: 'GDX = { add_political_power = 5 }' }])).toContain('limit = { country_exists = GDX }');
    expect(generateScriptedLocalisation([{ name: 'GDX_GetName', options: [{ trigger: 'has_government = democratic', key: 'A' }, { key: 'B' }] }])).toContain('defined_text = {');
  });
});
