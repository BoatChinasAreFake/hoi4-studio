import { describe, it, expect } from 'vitest';
import { buildExperimentalMod, EXP_MOD_ID } from '../tools/modbuilder/experimental';
import { stripUtf8Bom } from '../src/utils/politicsGenerators';
import { validateModDescriptor } from '../src/utils/phase5Generators';

const { files, launcher } = buildExperimentalMod();
const text = (f: { content: string | Uint8Array }) => (typeof f.content === 'string' ? f.content : stripUtf8Bom(f.content).text);
const scripts = files.filter((f) => /\.(txt|gui|asset|mod)$/.test(f.path));

// Single-file vanilla paths that a mod copy would replace wholesale (the original Shattered Meridian crash).
const VANILLA_SINGLETONS = ['common/countries/colors.txt', 'map/definition.csv', 'map/provinces.bmp', 'map/rivers.bmp', 'map/railways.txt', 'map/supply_nodes.txt'];

describe('Grand Duchy Rising: Experimental Systems', () => {
  it('has a valid descriptor and launcher', () => {
    expect(validateModDescriptor(text(files.find((f) => f.path === 'descriptor.mod')!)).valid).toBe(true);
    expect(launcher.path).toBe(`${EXP_MOD_ID}.mod`);
    expect(text(launcher)).toContain(`path="mod/${EXP_MOD_ID}"`);
  });

  it('never replaces a vanilla singleton file or vanilla state history', () => {
    for (const f of files) {
      expect(VANILLA_SINGLETONS).not.toContain(f.path);
      expect(f.path.startsWith('history/states/')).toBe(false);
    }
  });

  it('has balanced braces in every script', () => {
    for (const f of scripts) {
      const clean = text(f).replace(/#[^\n]*/g, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
      expect((clean.match(/\{/g) ?? []).length, f.path).toBe((clean.match(/\}/g) ?? []).length);
    }
  });

  it('localisation files carry a UTF-8 BOM', () => {
    for (const f of files.filter((x) => x.path.endsWith('.yml'))) {
      expect(typeof f.content === 'string' ? false : stripUtf8Bom(f.content).hasBom, f.path).toBe(true);
    }
  });

  it('uses the vanilla keys the earlier exporters got wrong', () => {
    const get = (p: string) => text(files.find((f) => f.path === p)!);
    // custom resources need a production-screen checkbox the mod cannot ship, so none is generated
    expect(files.some((f) => f.path.startsWith('common/resources/'))).toBe(false);
    expect(files.some((f) => f.path.startsWith('common/timed_activities/'))).toBe(false); // custom timed activities cannot load
    expect(get('events/SuperEvents_ducal_dawn.txt')).toContain('sound_effect = gdx_ducal_dawn');
    expect(get('music/GDX_music.txt')).toContain('music_station = "base_music"');
    expect(get('common/special_projects/projects/GDX_projects.txt')).toContain('specialization = specialization_land');
  });
});
