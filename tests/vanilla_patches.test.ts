import { describe, it, expect } from 'vitest';
import { addTechGridBox, addProductionResource } from '../src/utils/researchFolders';
import { buildMod } from '../tools/modbuilder/grandDuchy';
import { buildExperimentalMod } from '../tools/modbuilder/experimental';
import { openVanilla, VANILLA_DERIVED_PATHS } from '../tools/modbuilder/vanilla';

const NL = String.fromCharCode(10);
const balanced = (s: string) => {
  const clean = s.replace(/#[^\n]*/g, '').replace(/"[^"\n]*"/g, '""');
  return (clean.match(/\{/g) ?? []).length === (clean.match(/\}/g) ?? []).length;
};

describe('patching vanilla gui text', () => {
  const tech = ['guiTypes = {', '\tcontainerWindowType = {', '\t\tname = "infantry_folder"', '\t\tgridboxtype = {', '\t\t\tname = "infantry_weapons_tree"', '\t\t}', '\t}', '}', ''].join(NL);
  const prod = ['guiTypes = {', '\tcontainerWindowType = {', '\t\tname = "resources"', '\t\tsize = { width = 462 height = 35 }', '\t\ticonType = {', '\t\t\tname = "oil_icon"', '\t\t\tposition = { x=0 y=2 }', '\t\t}', '\t\ticonType = {', '\t\t\tname = "steel_icon"', '\t\t\tposition = { x=132 y=2 }', '\t\t}', '\t}', '}', ''].join(NL);

  it('adds a gridbox named after the root tech inside the folder', () => {
    const out = addTechGridBox(tech, { folderId: 'infantry_folder', rootTech: 'my_root' });
    expect(out).toContain('name = "my_root_tree"');
    expect(balanced(out)).toBe(true);
    expect(out.indexOf('my_root_tree')).toBeGreaterThan(out.indexOf('infantry_weapons_tree'));
    expect(() => addTechGridBox(out, { folderId: 'infantry_folder', rootTech: 'my_root' })).toThrow(/already exists/);
    expect(() => addTechGridBox(tech, { folderId: 'nope_folder', rootTech: 'x' })).toThrow(/not found/);
  });

  it('adds a resource icon and checkbox after the last one and widens the bar', () => {
    const out = addProductionResource(prod, 'my_ore', 3);
    expect(out).toContain('name = "my_ore_checkbox"');
    expect(out).toContain('position = { x=198 y=2 }');
    expect(out).toContain('frame = 3');
    expect(out).toContain('size = { width = 528 height = 35 }');
    expect(balanced(out)).toBe(true);
    expect(() => addProductionResource(out, 'my_ore')).toThrow(/already/);
  });
});

describe('building without the game', () => {
  it('leaves out everything that needs a vanilla file', () => {
    const paths = [...buildMod().files, ...buildExperimentalMod().files].map((f) => f.path);
    for (const derived of VANILLA_DERIVED_PATHS) expect(paths).not.toContain(derived);
    expect(paths.some((p) => p.startsWith('common/technologies/') || p.startsWith('common/resources/'))).toBe(false);
  });
});

// With a local install, the full build ships the patched files.
const vanilla = openVanilla();
describe.skipIf(!vanilla)('building with the game files', () => {
  it('main mod: tech gridbox, custom techs, recruits moved into Luxembourg history', () => {
    const files = buildMod(vanilla).files;
    const text = (p: string) => String(files.find((f) => f.path === p)?.content ?? '');
    expect(text('interface/countrytechtreeview.gui')).toContain('name = "GDR_ducal_drill_manual_tree"');
    expect(balanced(text('interface/countrytechtreeview.gui'))).toBe(true);
    expect(text('common/technologies/GDR_technologies.txt')).toContain('GDR_fortified_valleys = {');
    expect(text('history/countries/LUX - Luxemburg.txt')).toContain('recruit_character = GDR_general_marie_thill');
    expect(text('history/countries/LUX - Luxemburg.txt')).toContain('capital = 8');
    expect(text('events/GDR_events.txt')).not.toContain('recruit_character');
  });

  it('experimental mod: production checkbox for the custom resource', () => {
    const files = buildExperimentalMod(vanilla).files;
    const text = (p: string) => String(files.find((f) => f.path === p)?.content ?? '');
    expect(text('interface/countryproductionlineview.gui')).toContain('name = "gdx_ducal_ore_checkbox"');
    expect(balanced(text('interface/countryproductionlineview.gui'))).toBe(true);
    expect(text('common/resources/GDX_resources.txt')).toContain('icon_frame = 1');
  });
});
