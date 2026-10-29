import { describe, it, expect } from 'vitest';
import {
  realignModProvinces,
  computeProvinceDiff,
  parseDefinitionCsv,
  diffAst3Way,
  parseScriptBlocks,
  scanModAssets,
  migrateDeprecatedScript,
  migrateCountryLeaders,
  SYNTAX_MIGRATION_RULES,
  type ModAssetEntry,
} from '../src/utils/phase5Generators';

describe('Milestone M4 Recheck: Adversarial Stress Suite', () => {

  // ==========================================================================
  // Challenge 1: Province Realignment Word Boundaries & Digit Prefix Collision
  // ==========================================================================
  describe('Challenge 1: Province Realignment Word Boundaries', () => {
    it('accurately remaps single digit province 1 -> 2 while leaving 10, 100, 1001, 11804 intact', () => {
      const shiftedMap = new Map<number, number>([
        [1, 2],
      ]);

      const testScript = `
        state = {
          id = 100
          provinces = { 1 10 100 1001 11804 11 }
          history = {
            victory_points = { 1 15 }
            victory_points = { 10 5 }
            victory_points = { 100 20 }
            1 = { naval_base = 3 }
            10 = { bunker = 2 }
            100 = { coastal_bunker = 2 }
          }
        }
      `;

      const result = realignModProvinces(testScript, shiftedMap);

      // Verify that 1 was replaced with 2
      expect(result.modifiedScript).toContain('provinces = { 2 10 100 1001 11804 11 }');
      expect(result.modifiedScript).toContain('id = 100'); // NOT mangled to 200
      expect(result.modifiedScript).toContain('victory_points = { 2 15 }');
      expect(result.modifiedScript).toContain('victory_points = { 10 5 }');
      expect(result.modifiedScript).toContain('victory_points = { 100 20 }');
      expect(result.modifiedScript).toContain('2 = { naval_base = 3 }');
      expect(result.modifiedScript).toContain('10 = { bunker = 2 }');
      expect(result.modifiedScript).toContain('100 = { coastal_bunker = 2 }');
      expect(result.replacementsCount).toBe(3); // provinces list, victory_points, block header
    });

    it('handles multiple cascade shifts without intermediate cross-contamination', () => {
      // 1 shifts to 10, and 10 shifts to 100, and 100 shifts to 9999
      // Because sorted by descending length:
      // 100 -> 9999 is replaced first.
      // 10 -> 100 is replaced second.
      // 1 -> 10 is replaced third.
      const shiftedMap = new Map<number, number>([
        [1, 10],
        [10, 100],
        [100, 9999],
      ]);

      const testScript = 'provinces = { 1 10 100 }';
      const result = realignModProvinces(testScript, shiftedMap);

      // 100 should have become 9999
      // 10 should have become 100
      // 1 should have become 10
      expect(result.modifiedScript).toBe('provinces = { 10 100 9999 }');
      expect(result.replacementsCount).toBe(3);
    });

    it('does not replace numbers inside identifiers like leader_1 or tag_10', () => {
      const shiftedMap = new Map<number, number>([
        [1, 999],
        [10, 888],
      ]);

      const testScript = 'character = leader_1 tag = country_10 province = 1';
      const result = realignModProvinces(testScript, shiftedMap);

      expect(result.modifiedScript).toContain('leader_1');
      expect(result.modifiedScript).toContain('country_10');
      expect(result.modifiedScript).toContain('province = 999');
      expect(result.replacementsCount).toBe(1);
    });
  });

  // ==========================================================================
  // Challenge 2: 3-Way Merge Add/Add Collisions
  // ==========================================================================
  describe('Challenge 2: 3-Way Merge Add/Add Collisions', () => {
    it('flags Add/Add collision with differing properties as a conflict', () => {
      const base = '';
      const vanillaUpdated = `
        focus = {
          id = FOCUS_SHARED
          cost = 10
          prerequisite = { FOCUS_A }
        }
      `;
      const userMod = `
        focus = {
          id = FOCUS_SHARED
          cost = 5
          prerequisite = { FOCUS_B }
        }
      `;

      const report = diffAst3Way(base, vanillaUpdated, userMod);

      expect(report.totalBlocks).toBe(1);
      expect(report.conflictCount).toBe(1);
      expect(report.autoMergedCount).toBe(0);

      const block = report.blocks[0];
      expect(block.id).toBe('FOCUS_SHARED');
      expect(block.status).toBe('conflict');
      expect(block.mergedContent).toContain('ADD/ADD COLLISION');
      expect(block.mergedContent).toContain('USER MOD');
      expect(block.mergedContent).toContain('UPSTREAM VANILLA');
    });

    it('auto-merges Add/Add when identical definitions are added in both branches', () => {
      const base = '';
      const identicalBlock = `
        focus = {
          id = FOCUS_IDENTICAL
          cost = 10
        }
      `;

      const report = diffAst3Way(base, identicalBlock, identicalBlock);

      expect(report.totalBlocks).toBe(1);
      expect(report.conflictCount).toBe(0);
      expect(report.autoMergedCount).toBe(1);
      expect(report.blocks[0].status).toBe('clean');
      expect(report.blocks[0].description).toContain('Identical new block');
    });

    it('handles mixed scenario: Add/Add conflict alongside custom mod addition and clean upstream addition', () => {
      const base = '';
      const vanilla = `
        focus = {
          id = FOCUS_COLLIDE
          cost = 10
        }
        focus = {
          id = FOCUS_VANILLA_ONLY
          cost = 7
        }
      `;
      const mod = `
        focus = {
          id = FOCUS_COLLIDE
          cost = 5
        }
        focus = {
          id = FOCUS_MOD_ONLY
          cost = 3
        }
      `;

      const report = diffAst3Way(base, vanilla, mod);
      expect(report.totalBlocks).toBe(3);
      expect(report.conflictCount).toBe(1);
      expect(report.autoMergedCount).toBe(2);

      const collide = report.blocks.find(b => b.id === 'FOCUS_COLLIDE');
      const vanillaOnly = report.blocks.find(b => b.id === 'FOCUS_VANILLA_ONLY');
      const modOnly = report.blocks.find(b => b.id === 'FOCUS_MOD_ONLY');

      expect(collide?.status).toBe('conflict');
      expect(vanillaOnly?.status).toBe('upstream_added');
      expect(modOnly?.status).toBe('mod_custom');
    });
  });

  // ==========================================================================
  // Challenge 3: Mod Optimizer Deduplication
  // ==========================================================================
  describe('Challenge 3: Mod Optimizer Deduplication', () => {
    it('ensures an asset that is unreferenced AND part of a duplicate group is only counted once', () => {
      const assets: ModAssetEntry[] = [
        // Primary copy: active in script
        {
          path: 'gfx/active.dds',
          fileType: 'texture',
          sizeBytes: 50000,
          hash: 'hash_shared_content',
        },
        // Secondary copy: unreferenced AND binary duplicate of active.dds
        {
          path: 'gfx/copy_of_active.dds',
          fileType: 'texture',
          sizeBytes: 50000,
          hash: 'hash_shared_content',
        },
      ];

      // Script only references active.dds
      const scriptCorpus = 'focus = { icon = active.dds }';

      const report = scanModAssets(assets, scriptCorpus, []);

      // copy_of_active should appear in unreferencedTextures
      expect(report.unreferencedTextures).toHaveLength(1);
      expect(report.unreferencedTextures[0].path).toBe('gfx/copy_of_active.dds');

      // duplicateAssets should contain the group [active.dds, copy_of_active.dds]
      expect(report.duplicateAssets).toHaveLength(1);
      expect(report.duplicateAssets[0]).toHaveLength(2);

      // CRITICAL ASSERTION: totalReclaimableBytes MUST be exactly 50,000, NOT 100,000!
      expect(report.totalReclaimableBytes).toBe(50000);
    });

    it('correctly calculates reclaimable bytes for 3 duplicate copies where 2 are unreferenced', () => {
      const assets: ModAssetEntry[] = [
        { path: 'gfx/1.dds', fileType: 'texture', sizeBytes: 20000, hash: 'h_triplet' },
        { path: 'gfx/2.dds', fileType: 'texture', sizeBytes: 20000, hash: 'h_triplet' },
        { path: 'gfx/3.dds', fileType: 'texture', sizeBytes: 20000, hash: 'h_triplet' },
      ];

      // Only 1.dds is referenced
      const scriptCorpus = 'sprite = 1.dds';

      const report = scanModAssets(assets, scriptCorpus, []);

      expect(report.unreferencedTextures).toHaveLength(2); // 2.dds, 3.dds
      expect(report.duplicateAssets).toHaveLength(1);
      expect(report.duplicateAssets[0]).toHaveLength(3);

      // Deleting 2.dds and 3.dds saves 40,000 bytes. Must NOT be double-counted!
      expect(report.totalReclaimableBytes).toBe(40000);
    });

    it('correctly handles dead audio that also has a duplicate', () => {
      const assets: ModAssetEntry[] = [
        { path: 'sound/track_a.ogg', fileType: 'audio', sizeBytes: 1000000, hash: 'hash_audio' },
        { path: 'sound/track_b.ogg', fileType: 'audio', sizeBytes: 1000000, hash: 'hash_audio' },
      ];

      // Neither is referenced in script
      const scriptCorpus = 'sound = { other_track }';

      const report = scanModAssets(assets, scriptCorpus, []);

      expect(report.deadAudio).toHaveLength(2);
      expect(report.duplicateAssets).toHaveLength(1);

      // Both tracks are unreferenced dead audio, so total reclaimable is 2,000,000.
      // Duplicate loop must NOT add track_b a second time!
      expect(report.totalReclaimableBytes).toBe(2000000);
    });
  });

  // ==========================================================================
  // Challenge 4: Trigger Migration Rules
  // ==========================================================================
  describe('Challenge 4: Trigger Migration Rules', () => {
    it('does not rewrite triggers that are still valid in HOI4 1.19.4', () => {
      const deprecatedScript = `
        limit = {
          is_in_faction = yes
          is_puppet = yes
          can_create_factions = yes
        }
        trigger = {
          is_in_faction = no
        }
      `;

      const report = migrateDeprecatedScript(deprecatedScript);

      expect(SYNTAX_MIGRATION_RULES).toHaveLength(0);
      expect(report.totalMigrations).toBe(0);
      expect(report.migratedContent).toBe(deprecatedScript);
      expect(report.migratedContent).not.toContain('has_faction');
      expect(report.migratedContent).not.toContain('is_subject');
    });

    it('simultaneously modernizes legacy leaders and deprecated triggers in one pass', () => {
      const combinedScript = `
        create_country_leader = {
          name = "Philippe Petain"
          desc = "POLITICS_PETAIN_DESC"
          picture = "gfx/leaders/FRA/portrait_petain.dds"
          expire = "1951.7.23"
          ideology = fascism_ideology
          traits = { veteran_marshal }
        }
        limit = {
          is_in_faction = yes
        }
      `;

      const report = migrateDeprecatedScript(combinedScript, 'FRA');

      expect(report.migratedContent).toContain('recruit_character = FRA_philippe_petain');
      expect(report.migratedContent).not.toContain('characters = {');
      expect(report.migratedContent).not.toContain('create_country_leader = {');
      expect(report.migratedContent).toContain('is_in_faction = yes');
      expect(report.charactersScript).toContain('FRA_philippe_petain = {');
      expect(report.totalMigrations).toBe(1); // 1 leader, no trigger rewrites
    });
  });
});
