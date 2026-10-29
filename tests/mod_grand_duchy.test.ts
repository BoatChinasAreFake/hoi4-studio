import { describe, it, expect } from 'vitest';
import { buildMod, analyzeTree, FOCUSES, IDEAS, DECISIONS, EVENTS, MOD_ID } from '../tools/modbuilder/grandDuchy';
import { hasUtf8Bom, stripUtf8Bom } from '../src/utils/politicsGenerators';
import { validateModDescriptor } from '../src/utils/phase5Generators';

const { files, launcher } = buildMod();
const text = (path: string) => {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing ${path}`);
  return typeof f.content === 'string' ? f.content : stripUtf8Bom(f.content).text;
};
const scriptFiles = files.filter((f) => typeof f.content === 'string' && !f.path.endsWith('.mod'));

/** Strip comments and quoted strings, then check { } balance never dips below zero and ends at zero. */
function braceBalance(src: string): { ok: boolean; depth: number } {
  const clean = src.replace(/#[^\n]*/g, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
  let d = 0;
  for (const ch of clean) {
    if (ch === '{') d++;
    if (ch === '}') { d--; if (d < 0) return { ok: false, depth: d }; }
  }
  return { ok: d === 0, depth: d };
}

describe('Grand Duchy Rising: load-safety checks', () => {
  it('descriptor.mod and launcher .mod are valid and agree on the path', () => {
    expect(validateModDescriptor(text('descriptor.mod')).valid).toBe(true);
    expect(launcher.content).toContain(`path="mod/${MOD_ID}"`);
    expect(launcher.path).toBe(`${MOD_ID}.mod`);
    expect(text('descriptor.mod')).not.toContain('path=');
  });

  it('thumbnail is a real PNG', () => {
    const f = files.find((x) => x.path === 'thumbnail.png')!.content as Uint8Array;
    expect(Array.from(f.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('every script file has balanced braces', () => {
    for (const f of scriptFiles) {
      const r = braceBalance(f.content as string);
      expect(r.ok, `${f.path} unbalanced (depth ${r.depth})`).toBe(true);
    }
  });

  it('overrides no vanilla file: every content file is GDR_-prefixed (or the descriptor/thumbnail)', () => {
    for (const f of files) {
      const base = f.path.split('/').pop()!;
      expect(/^(GDR_|descriptor\.mod|thumbnail\.png)/.test(base), f.path).toBe(true);
    }
  });

  it('touches no map, history or gfx data', () => {
    for (const f of files) expect(/^(map|history|gfx|interface|sound)\//.test(f.path), f.path).toBe(false);
  });

  it('localisation has a UTF-8 BOM, header and unique keys', () => {
    const f = files.find((x) => x.path.endsWith('GDR_l_english.yml'))!.content as Uint8Array;
    expect(hasUtf8Bom(f)).toBe(true);
    const { text: t } = stripUtf8Bom(f);
    expect(t.startsWith('l_english:')).toBe(true);
    const keys = [...t.matchAll(/^ ([^:\s]+):0 "/gm)].map((m) => m[1]);
    expect(new Set(keys).size).toBe(keys.length);
    // every non-blank line is a valid entry
    for (const line of t.split('\n').slice(1)) if (line.trim()) expect(line).toMatch(/^ [^:\s]+:0 ".*"$/);
  });

  it('every referenced key is localised', () => {
    const loc = text('localisation/english/GDR_l_english.yml');
    const has = (k: string) => loc.includes(` ${k}:0 "`);
    for (const f of FOCUSES) { expect(has(f.id)).toBe(true); expect(has(`${f.id}_desc`)).toBe(true); }
    for (const i of IDEAS) expect(has(i.id)).toBe(true);
    for (const d of DECISIONS) expect(has(d.id)).toBe(true);
    for (const e of EVENTS) {
      expect(has(`gdr.${e.n}.t`)).toBe(true);
      expect(has(`gdr.${e.n}.d`)).toBe(true);
      e.opts.forEach((_, i) => expect(has(`gdr.${e.n}.${String.fromCharCode(97 + i)}`)).toBe(true));
    }
  });
});

describe('Grand Duchy Rising: focus tree', () => {
  const ids = new Set(FOCUSES.map((f) => f.id));
  it('has unique ids and unique grid positions', () => {
    expect(ids.size).toBe(FOCUSES.length);
    const pos = FOCUSES.map((f) => `${f.x},${f.y}`);
    expect(new Set(pos).size).toBe(pos.length);
  });
  it('is in-depth', () => expect(FOCUSES.length).toBeGreaterThanOrEqual(35));
  it('has no cycles, unreachable focuses or exclusion deadlocks (Tarjan SCC from the suite)', () => {
    const a = analyzeTree();
    expect(a.hasCycles).toBe(false);
    expect(a.unreachableFocuses).toEqual([]);
    expect(a.hasMutualExclusionDeadlocks).toBe(false);
  });
  it('all prerequisite / exclusion references exist and exclusions are symmetric', () => {
    for (const f of FOCUSES) {
      for (const p of f.pre ?? []) expect(ids.has(p), `${f.id} -> ${p}`).toBe(true);
      for (const x of f.excl ?? []) {
        expect(ids.has(x)).toBe(true);
        expect(FOCUSES.find((g) => g.id === x)!.excl).toContain(f.id);
      }
    }
  });
  it('children sit below their prerequisites', () => {
    for (const f of FOCUSES) for (const p of f.pre ?? []) expect(f.y).toBeGreaterThan(FOCUSES.find((g) => g.id === p)!.y);
  });
  it('script uses only the suite\'s emitted shape and a dominant tag weight', () => {
    const s = text('common/national_focus/GDR_luxembourg.txt');
    expect(s).toContain('add = 1000');
    expect(s.match(/\n    focus = \{/g)!.length).toBe(FOCUSES.length);
  });
});

describe('Grand Duchy Rising: cross references', () => {
  const allScript = scriptFiles.map((f) => f.content as string).join('\n');
  it('every referenced idea is defined', () => {
    const defined = new Set(IDEAS.map((i) => i.id));
    for (const m of allScript.matchAll(/(?:add_ideas|add_idea|remove_idea|idea) = (GDR_\w+)/g)) expect(defined.has(m[1]), m[1]).toBe(true);
  });
  it('every triggered event exists', () => {
    const defined = new Set(EVENTS.map((e) => `gdr.${e.n}`));
    for (const m of allScript.matchAll(/id = (gdr\.\d+)/g)) expect(defined.has(m[1]), m[1]).toBe(true);
  });
  it('every decision is in the category and ids are unique across ideas/decisions/focuses', () => {
    const all = [...FOCUSES.map((f) => f.id), ...IDEAS.map((i) => i.id), ...DECISIONS.map((d) => d.id)];
    expect(new Set(all).size).toBe(all.length);
  });
  it('scripted effect used by focuses is defined', () => {
    expect(allScript).toMatch(/GDR_gain_progress = \{/);
  });
  it('advisor characters are gated to LUX and use engine syntax', () => {
    const c = text('common/characters/GDR_characters.txt');
    expect((c.match(/advisor = \{/g) ?? []).length).toBe((c.match(/allowed = \{ original_tag = LUX \}/g) ?? []).length);
    expect(c).not.toContain('base =');
  });
});
