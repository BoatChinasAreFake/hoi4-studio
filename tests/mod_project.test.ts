import { describe, it, expect } from 'vitest';
import { buildMod } from '../tools/modbuilder/grandDuchy';
import { buildExperimentalMod } from '../tools/modbuilder/experimental';
import { validateModProject, createZip, readZip, crc32, textFile, stripCommonRoot, summarizeProblems, describeImport, type ModFiles } from '../src/utils/modProject';

const toMap = (built: { files: { path: string; content: string | Uint8Array }[] }): ModFiles =>
  new Map(built.files.map((f) => [f.path, typeof f.content === 'string' ? textFile(f.content) : f.content]));

describe('mod project validation', () => {
  it('the main example mod has no errors', () => {
    const problems = validateModProject(toMap(buildMod()), { requiredLanguages: ['german', 'french'] });
    expect(problems.filter((p) => p.severity === 'error')).toEqual([]);
  });

  it('the experimental mod has no errors', () => {
    const problems = validateModProject(toMap(buildExperimentalMod()));
    expect(problems.filter((p) => p.severity === 'error')).toEqual([]);
  });

  it('reports broken references, missing localisation, bad braces and vanilla overrides', () => {
    const files: ModFiles = new Map([
      ['descriptor.mod', textFile('name="x"' + String.fromCharCode(10))],
      ['common/national_focus/a.txt', textFile('focus_tree = { id = t focus = { id = A_one prerequisite = { focus = A_missing } } ')],
      ['localisation/english/a_l_english.yml', textFile('l_english:' + String.fromCharCode(10) + ' A_two:0 "x"')],
      ['map/definition.csv', textFile('0;0;0;0;land;false;unknown;0')],
    ]);
    const codes = validateModProject(files).map((p) => p.code);
    expect(codes).toContain('descriptor-version');
    expect(codes).toContain('braces');
    expect(codes).toContain('loc-bom');
    expect(codes).toContain('vanilla-singleton');
    expect(codes).toContain('focus-ref');
  });

  it('checks sprites against a supplied vanilla list', () => {
    const files: ModFiles = new Map([
      ['descriptor.mod', textFile('name="x" supported_version="1.*"')],
      ['events/a.txt', textFile('country_event = { id = a.1 picture = GFX_nope }')],
    ]);
    const bad = validateModProject(files, { vanillaGfx: new Set(['GFX_other']) });
    expect(bad.some((p) => p.code === 'gfx-missing')).toBe(true);
    const ok = validateModProject(files, { vanillaGfx: new Set(['GFX_nope']) });
    expect(ok.some((p) => p.code === 'gfx-missing')).toBe(false);
    expect(summarizeProblems(bad).errors).toBeGreaterThan(0);
  });
});

describe('zip export and import', () => {
  it('crc32 matches the standard check value', () => {
    expect(crc32(textFile('123456789'))).toBe(0xcbf43926);
  });

  it('round-trips a mod through a ZIP', async () => {
    const files = toMap(buildMod());
    const zip = createZip(files, 'grand_duchy_rising');
    expect(zip[0]).toBe(0x50);
    const back = stripCommonRoot(await readZip(zip));
    expect([...back.keys()].sort()).toEqual([...files.keys()].sort());
    for (const [k, v] of files) expect(Array.from(back.get(k)!)).toEqual(Array.from(v));
  });

  it('describes an import', () => {
    const notes = describeImport(toMap(buildExperimentalMod()));
    expect(notes[0]).toMatch(/files imported/);
  });
});
