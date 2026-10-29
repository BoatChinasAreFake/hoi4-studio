import { describe, it, expect } from 'vitest';
import { generateGrandDoctrine, generateDoctrineTracks, generateSubdoctrines, doctrineSetFromNodes, doctrineFiles, doctrineLocEntries, generateHqTemplate, generateMarketEffect, generatePurchaseContract } from '../src/utils/militaryExporters';
import type { DoctrineNodeDef, MilitaryHqDef } from '../src/types/military';
import type { MarketSubsidiesConfig } from '../src/types/economy';

const balanced = (s: string) => (s.match(/\{/g) ?? []).length === (s.match(/\}/g) ?? []).length;

const nodes: DoctrineNodeDef[] = [
  { id: 'my_mobile_core', name: 'Mobile Core', branch: 'mobile_warfare', category: 'land', level: 1, costXp: 100, statModifiers: { army_speed_factor: 0.1 }, description: 'Fast.', icon: 'GFX_x' },
  { id: 'my_mobile_reward', name: 'Mobile Reward', branch: 'mobile_warfare', category: 'land', level: 2, costXp: 0, parentDoctrineId: 'my_mobile_core', statModifiers: { planning_speed: 0.2 }, description: 'More.', icon: 'GFX_x' },
  { id: 'my_fire_core', name: 'Fire Core', branch: 'superior_firepower', category: 'land', level: 1, costXp: 100, mutuallyExclusiveWith: ['my_mobile_core'], statModifiers: { army_attack_factor: 0.05 }, description: 'Guns.', icon: 'GFX_x' },
];

describe('doctrines', () => {
  const set = doctrineSetFromNodes(nodes, 'gdx_doctrine', 'Ducal Doctrine');

  it('maps branches to tracks and deeper nodes to rewards', () => {
    expect(set.tracks.map((t) => t.id)).toEqual(['gdx_doctrine_mobile_warfare', 'gdx_doctrine_superior_firepower']);
    const mobile = set.subdoctrines.find((s) => s.id === 'my_mobile_core')!;
    expect(mobile.rewards).toEqual([{ planning_speed: 0.2 }]);
    expect(set.grand.xpType).toBe('army');
  });

  it('emits the vanilla keys', () => {
    const grand = generateGrandDoctrine(set.grand);
    expect(grand).toContain('folder = land');
    expect(grand).toContain('xp_type = army');
    expect(grand).toContain('tracks = {');
    expect(grand).toContain('milestones = {');
    expect((grand.match(/\{ \}/g) ?? []).length).toBeGreaterThanOrEqual(2);
    const subs = generateSubdoctrines(set.subdoctrines, 'army');
    expect(subs).toContain('track = gdx_doctrine_mobile_warfare');
    expect(subs).toContain('rewards = {');
    expect(subs).toContain('xor = { my_mobile_core }');
    const tracks = generateDoctrineTracks(set.tracks);
    expect(tracks).toContain('mastery = {');
    expect(tracks).toContain('multiplier = 1');
    for (const text of [grand, subs, tracks]) expect(balanced(text)).toBe(true);
  });

  it('writes files in the vanilla folders and localisation for every key', () => {
    expect(Object.keys(doctrineFiles(set))).toEqual([
      'common/doctrines/grand_doctrines/gdx_doctrine_grand_doctrines.txt',
      'common/doctrines/tracks/gdx_doctrine_tracks.txt',
      'common/doctrines/subdoctrines/land/gdx_doctrine_subdoctrines.txt',
    ]);
    const keys = doctrineLocEntries(set, {}).map((e) => e.key);
    expect(keys).toContain('GDX_DOCTRINE');
    expect(keys).toContain('MY_MOBILE_CORE_DESC');
    expect(keys).toContain('my_mobile_core_reward_1');
    expect(() => doctrineSetFromNodes([], 'x', 'X')).toThrow();
  });
});

describe('headquarters', () => {
  const hq: MilitaryHqDef = { id: 'h', name: 'Ducal Army HQ', level: 'army_hq', auraRadiusProvinces: 4, staffTraits: [], assignedCommanderName: 'Marie Thill', baseSupplyBonus: 0.1, basePlanningMultiplier: 0.1, locationProvinceId: 3838 };
  it('is a division template with is_army_hq and HQ units', () => {
    const text = generateHqTemplate(hq);
    expect(text).toContain('division_template = {');
    expect(text).toContain('is_army_hq = yes');
    expect(text).toContain('hq_infantry = { x = 0 y = 2 }');
    expect(text).toContain('hq_air_liaison');
    expect(text).not.toContain('military_headquarters');
    expect(balanced(text)).toBe(true);
    expect(generateHqTemplate({ ...hq, level: 'corps_hq' })).not.toContain('hq_naval_liaison');
  });
});

describe('market', () => {
  const config: MarketSubsidiesConfig = {
    bilateralSubsidies: [{ buyerTag: 'GDX', sellerTag: 'ENG', equipmentCategory: 'infantry', discountPercent: 20, deliverySpeedBonusPercent: 10 }],
    civFactoryExchangeRatio: 5,
    baseDeliveryDaysPerBatch: 30,
    tradeQuotaRules: [],
  };
  it('uses the documented effects', () => {
    const text = generateMarketEffect('MY_apply', config);
    expect(text).toContain('add_equipment_subsidy = {');
    expect(text).toContain('equipment_type = infantry_equipment');
    expect(text).toContain('seller_tags = { ENG }');
    expect(text).toContain('give_market_access = ENG');
    expect(balanced(text)).toBe(true);
    const contract = generatePurchaseContract({ seller: 'ENG', buyer: 'GDX', civilianFactories: 2, equipment: { infantry_equipment: 600 } });
    expect(contract).toContain('create_purchase_contract = {');
    expect(contract).toContain('amount = 600');
  });
});
