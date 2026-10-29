import { describe, it, expect, vi, beforeAll } from 'vitest';
import { loadGoalIconsManifest, getGoalIconCandidates, getCachedGoalIconUrl, registerGoalIcon } from '../src/utils/goalIcons';

const MANIFEST: Record<string, string> = {
  GFX_goal_support_democracy: '/gfx/goals/goal_generic_support_democracy.webp',
  GFX_goal_generic_construct_civ_factory: '/gfx/goals/civ.webp',
  GFX_goal_generic_political_pressure: '/gfx/goals/pressure.webp',
  GFX_goal_generic_national_unity: '/gfx/goals/unity.webp',
  GFX_goal_generic_production: '/gfx/goals/production.webp',
  GFX_goal_generic_construct_civ_factory_shine: '/gfx/goals/civ_shine.webp',
};

describe('focus icon candidates', () => {
  beforeAll(async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => MANIFEST }));
    await loadGoalIconsManifest();
  });

  it('puts the exact icon first', () => {
    expect(getGoalIconCandidates('GFX_goal_support_democracy')[0]).toBe('/gfx/goals/goal_generic_support_democracy.webp');
    expect(getCachedGoalIconUrl('GFX_goal_generic_construct_civ_factory')).toBe('/gfx/goals/civ.webp');
  });

  it('an imported icon beats everything else for its own name', () => {
    registerGoalIcon('GFX_goal_mymod_crest', 'blob:crest');
    expect(getGoalIconCandidates('GFX_goal_mymod_crest')[0]).toBe('blob:crest');
  });

  it('falls back to close variants, then generic backup icons, without duplicates', () => {
    const c = getGoalIconCandidates('GFX_construct_civ_factory');
    expect(c[0]).toBe('/gfx/goals/civ.webp');
    const unknown = getGoalIconCandidates('GFX_goal_does_not_exist_anywhere');
    expect(unknown).toEqual(['/gfx/goals/pressure.webp', '/gfx/goals/unity.webp', '/gfx/goals/production.webp']);
    expect(new Set(unknown).size).toBe(unknown.length);
  });

  it('never offers the shine overlay as a stand-in', () => {
    expect(getGoalIconCandidates('GFX_goal_generic_construct_civ_factory').every((u) => !u.includes('shine'))).toBe(true);
  });
});
