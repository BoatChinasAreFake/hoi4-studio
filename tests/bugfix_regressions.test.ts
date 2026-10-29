import { describe, it, expect } from 'vitest';
import { ClausewitzFocusParser as P } from '../src/utils/clausewitzParser';
import { scaffoldCountryFiles, generateCharacterScript } from '../src/utils/politicsGenerators';
import { validateModDescriptor, filterPackageReleaseFiles, matchesIgnoreRule } from '../src/utils/phase5Generators';
import { buildFocusProject } from '../tools/modbuilder/grandDuchy';

describe('focus parser round trip (space-indented generator output)', () => {
  const project = buildFocusProject();
  const script = P.generateScript(project);
  it('parses every generated focus back', () => {
    const [tree] = P.parse(script);
    expect(tree.id).toBe(project.treeId);
    expect(tree.focuses.map((f) => f.id)).toEqual(project.nodes.map((n) => n.id));
  });
  it('preserves prerequisites, exclusions, coordinates and ai factor', () => {
    const [tree] = P.parse(script);
    for (const n of project.nodes) {
      const f = tree.focuses.find((x) => x.id === n.id)!;
      expect(f.x).toBe(n.x);
      expect(f.y).toBe(n.y);
      expect(f.prerequisites.flat().sort()).toEqual(n.prerequisites.flat().sort());
      expect([...f.mutually_exclusive].sort()).toEqual([...n.mutually_exclusive].sort());
      expect(f.ai).toBe(n.ai);
    }
  });
  it('does not drift reward indentation across parse/generate cycles', () => {
    const [t1] = P.parse(script);
    const again = P.generateScript({ ...project, nodes: t1.focuses });
    const [t2] = P.parse(again);
    expect(t2.focuses.map((f) => f.reward)).toEqual(t1.focuses.map((f) => f.reward));
  });
});

describe('surgical mutators touch only the named focus', () => {
  const src = `focus_tree = {\n\tid = t\n\tfocus = {\n\t\tid = A\n\t\tx = 1\n\t\ty = 1\n\t\tcost = 5\n\t\ticon = GFX_a\n\t}\n\tfocus = {\n\t\tid = A_2\n\t\tx = 2\n\t\ty = 2\n\t\tcost = 6\n\t}\n\tfocus = {\n\t\tid = B\n\t\tx = 5\n\t\ty = 5\n\t\tcost = 7\n\t\tcompletion_reward = { add_stability = 0.1 }\n\t}\n}\n`;
  it('mutateCoordinates edits B only', () => {
    const out = P.mutateCoordinates(src, 'B', 9, 8);
    expect(out).toContain('id = B\n\t\tx = 9\n\t\ty = 8');
    expect(out).toContain('id = A\n\t\tx = 1\n\t\ty = 1');
    expect(out).toContain('id = A_2\n\t\tx = 2\n\t\ty = 2');
  });
  it('id A is not confused with A_2', () => {
    const out = P.mutateCost(src, 'A', 99);
    expect(out).toContain('id = A\n\t\tx = 1\n\t\ty = 1\n\t\tcost = 99');
    expect(out).toContain('cost = 6');
  });
  it('mutateIcon replaces only the icon, and is a no-op for unknown ids', () => {
    expect(P.mutateIcon(src, 'A', 'GFX_z')).toContain('icon = GFX_z');
    expect(P.mutateIcon(src, 'NOPE', 'GFX_z')).toBe(src);
  });
  it('renameSymbol is boundary-safe', () => {
    expect(P.renameSymbol('A A_2 xA A', 'A', 'Q')).toBe('Q A_2 xA Q');
  });
});

describe('descriptor validator', () => {
  it('accepts `tags = {` with spaces and one-line tags', () => {
    expect(validateModDescriptor('name="x"\nsupported_version="1.*"\ntags = {\n"Gameplay"\n}\n').valid).toBe(true);
    expect(validateModDescriptor('name="x"\nsupported_version="1.*"\ntags={ "Gameplay" }\n').valid).toBe(true);
  });
  it('still rejects a missing tags block', () => {
    expect(validateModDescriptor('name="x"\nsupported_version="1.*"\n').valid).toBe(false);
  });
});

describe('release package filter', () => {
  it('honours globs and does not drop unrelated paths', () => {
    expect(matchesIgnoreRule('art/logo.psd', '*.psd')).toBe(true);
    expect(matchesIgnoreRule('common/latests/a.txt', 'tests/')).toBe(false);
    expect(matchesIgnoreRule('tests/a.txt', 'tests/')).toBe(true);
    expect(matchesIgnoreRule('.github/x.yml', '.git')).toBe(true);
    expect(matchesIgnoreRule('src-tauri2/x', 'src-tauri')).toBe(false);
  });
  it('custom glob patterns now take effect', () => {
    const r = filterPackageReleaseFiles(['gfx/a.png', 'sound/b.ogg'], ['*.ogg']);
    expect(r.excludedFiles).toEqual(['sound/b.ogg']);
  });
});

describe('country wizard & character generator', () => {
  const cfg = {
    tag: 'TST', name: 'Testia', adjective: 'Testian', color: [1, 2, 3] as [number, number, number], graphicalCulture: 'western_european',
    capitalProvinceId: 999, stateId: 777, stateName: 'Test', stateProvinces: [999], rulingParty: 'democratic' as const,
    leaderName: 'A B', leaderIdeology: 'conservatism',
  };
  it('writes the STATE id as capital', () => {
    const hist = scaffoldCountryFiles(cfg).files.find((f) => f.path.startsWith('history/countries/'))!.content as string;
    expect(hist).toContain('capital = 777');
    expect(hist).not.toContain('capital = 999');
  });
  it('advisor uses factor and honours allowedTag', () => {
    const s = generateCharacterScript([{ token: 'X', name: 'X', gender: 'male', portraits: {}, advisor: { slot: 'political_advisor', allowedTag: 'TST', traits: [], aiWillDo: 1 } }]);
    expect(s).toContain('allowed = { original_tag = TST }');
    expect(s).toContain('ai_will_do = { factor = 1.0 }');
    expect(s).not.toContain('base =');
  });
});

import { realignModProvinces } from '../src/utils/phase5Generators';
describe('province realignment', () => {
  it('does not chain shifts (1->2, 2->3)', () => {
    const r = realignModProvinces('provinces = { 1 2 }', new Map([[1, 2], [2, 3]]));
    expect(r.modifiedScript).toBe('provinces = { 2 3 }');
    expect(r.replacementsCount).toBe(2);
  });
  it('supports swaps and leaves decimals / longer ids alone', () => {
    const r = realignModProvinces('provinces = { 10 20 } b = 0.10 c = 100', new Map([[10, 20], [20, 10]]));
    expect(r.modifiedScript).toBe('provinces = { 20 10 } b = 0.10 c = 100');
  });
  it('only touches province positions, not ids, values or levels', () => {
    const script = 'state = { id = 1 manpower = 1 history = { victory_points = { 1 1 } buildings = { infrastructure = 1 1 = { naval_base = 1 } } } provinces = { 1 } }';
    const r = realignModProvinces(script, new Map([[1, 7]]));
    expect(r.modifiedScript).toBe('state = { id = 1 manpower = 1 history = { victory_points = { 7 1 } buildings = { infrastructure = 1 7 = { naval_base = 1 } } } provinces = { 7 } }');
    expect(r.replacementsCount).toBe(3);
  });
});

import { generateAutonomyScript, generateIdeologyScript, generateBopScript, generateFactionScript, generateDiploActionScript, generateTimedActivityScript } from '../src/utils/politicsGenerators';
describe('memory-reconstructed generators are marked UNVERIFIED and well-formed', () => {
  const brace = (s: string) => { const c = s.replace(/#[^\n]*/g, '').replace(/"[^"]*"/g, '""'); return (c.match(/\{/g) ?? []).length === (c.match(/\}/g) ?? []).length; };
  const level = { id: 'dominion', name: 'D', minFreedomLevel: 0.5, manpowerInfluence: 0.1, rules: { can_not_declare_war: false, can_decline_call_to_war: true, can_be_spymaster: false, contributes_operatives: true }, modifiers: { autonomy_manpower_share: 0.3 } };
  it('autonomy wraps levels in autonomy_state with a prefixed id', () => {
    const s = generateAutonomyScript([level, { ...level, id: 'autonomy_colony' }]);
    expect(s).toContain('autonomy_state = {');
    expect(s).toContain('id = autonomy_dominion');
    expect(s).toContain('id = autonomy_colony');
    expect(s).toContain('UNVERIFIED');
    expect(brace(s)).toBe(true);
  });
  it('ideology emits the extra vanilla group fields', () => {
    const s = generateIdeologyScript([{ name: 'x', group: 'custom', color: [1, 2, 3], subTypes: ['x_a'], rules: { can_force_government: false, can_puppet: false, can_send_volunteers: true, can_be_spymaster: false, can_declare_war_on_same_ideology: false }, warImpactOnWorldTension: 0.5, dynamicFactionNames: ['FACTION_NAME_X_1'] }]);
    expect(s).toContain('faction_impact_on_world_tension = 0.10');
    expect(s).toContain('can_host_government_in_exile = yes');
    expect(s).toContain('UNVERIFIED');
    expect(brace(s)).toBe(true);
  });
  it('low-confidence generators carry a warning', () => {
    const f = generateFactionScript({ name: 'F', leaderTag: 'AAA', ideology: 'x', memberTags: [], goals: [], rules: { leaderVetoPeace: false, canPuppetJoin: false, worldTensionThreshold: 0, offensiveWarAllowed: false, mutualDefenseTrigger: false } as never });
    expect(f.rulesScript).toContain('UNVERIFIED (medium');
    expect(generateTimedActivityScript({ id: 't', name: 'T', durationDays: 1, equipmentCost: {}, onExpireEffect: '', cancelTrigger: '' })).toContain('equipment_need');
    const d = generateDiploActionScript({ id: 'a', name: 'A', costPP: 1, costCP: 0, requiresAcceptance: true, allowedTrigger: '', visibleTrigger: '', aiAcceptanceFormula: '', onSentEffect: '', completeEffect: '', rejectEffect: '' });
    expect(d).toContain('a_acceptance = {');
    expect(d).toMatch(/\nscripted_diplomatic_actions = \{\s+a = \{/);
    expect(brace(d)).toBe(true);
    expect(generateBopScript({ token: 'B', initialValue: 0, leftSide: 'l', rightSide: 'r', sides: [] })).toContain('UNVERIFIED');
  });
});

import { calculateResearchCost as researchCost } from '../src/utils/phase4Generators';
describe('research cost matches the wiki example and common/defines', () => {
  it('110 days at +15% speed takes 96 days (cost / (1 + bonus), rounded up)', () => {
    expect(researchCost(1.0, 1936, 1936, 15).finalResearchDays).toBe(96);
  });
});
