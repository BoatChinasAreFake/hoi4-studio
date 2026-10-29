import { describe, it, expect } from 'vitest';
import {
  GfxTagIndexer,
  reverseLookupGfx,
  scanModAssets,
  diffAst3Way,
  migrateCountryLeaders,
  migrateDeprecatedScript,
  computeProvinceDiff,
  realignModProvinces,
  serializeGuiElement,
  computeParliamentSeats,
  createTgaBuffer,
  validateFlagTga,
  batchGenerateFlagTgas,
  calculatePlaybackChance,
  calculateEffectiveVolume,
  validateModDescriptor,
  filterPackageReleaseFiles,
} from '../src/utils/phase5Generators';
import type { GuiElementDef } from '../src/types/ui';

describe('Phase 5: UI Layout Tools, Asset Utilities, and Publishing Workflows', () => {

  // 1. Visual GFX Asset Browser & Tag Search
  describe('1. Visual GFX Asset Browser & Semantic Tag Search', () => {
    const mockGfxScript = `
      spriteTypes = {
        spriteType = {
          name = "GFX_goal_generic_atomic_research"
          texturefile = "gfx/interface/goals/goal_atomic.dds"
        }
        spriteType = {
          name = "GFX_goal_generic_eagle_strike"
          texturefile = "gfx/interface/goals/goal_eagle.dds"
        }
        spriteType = {
          name = "GFX_idea_tank_manufacturer"
          texturefile = "gfx/interface/ideas/idea_panzer.dds"
          noOfFrames = 2
        }
        spriteType = {
          name = "GFX_idea_wheat_harvest"
          texturefile = "gfx/interface/ideas/idea_grain.dds"
        }
        spriteType = {
          name = "GFX_portrait_skull_commando"
          texturefile = "gfx/leaders/portrait_skull.dds"
        }
        spriteType = {
          name = "GFX_unit_naval_anchor_icon"
          texturefile = "gfx/interface/counters/anchor.dds"
        }
      }
    `;

    it('indexes sprite types and extracts semantic keyword tags accurately', () => {
      const indexer = new GfxTagIndexer();
      const { indexedCount, duplicates } = indexer.parseGfxScript(mockGfxScript);

      expect(indexedCount).toBe(6);
      expect(duplicates).toHaveLength(0);

      const atomicSprite = indexer.getSprite('GFX_goal_generic_atomic_research');
      expect(atomicSprite).toBeDefined();
      expect(atomicSprite?.tags).toContain('focus');

      const tankSprite = indexer.getSprite('GFX_idea_tank_manufacturer');
      expect(tankSprite).toBeDefined();
      expect(tankSprite?.noOfFrames).toBe(2);
      expect(tankSprite?.tags).toContain('idea');
    });

    it('performs reverse lookup to find all occurrences in mod files', () => {
      const modFiles = [
        { path: 'common/national_focus/france.txt', content: 'focus = {\n\tid = FRA_atomic_project\n\ticon = GFX_goal_generic_atomic_research\n}' },
        { path: 'events/France.txt', content: 'country_event = {\n\tid = fra.10\n\tpicture = GFX_goal_generic_atomic_research\n}' },
        { path: 'common/ideas/france.txt', content: 'ideas = {\n\tcountry = {\n\t\tFRA_tank_spirit = {\n\t\t\tpicture = GFX_idea_tank_manufacturer\n\t\t}\n\t}\n}' },
      ];

      const matches = reverseLookupGfx('GFX_goal_generic_atomic_research', modFiles);
      expect(matches).toHaveLength(2);
      expect(matches[0].path).toBe('common/national_focus/france.txt');
      expect(matches[0].line).toBe(3);
      expect(matches[1].path).toBe('events/France.txt');
      expect(matches[1].line).toBe(3);
    });

    it('scales to fast tag searches across large catalog queries', () => {
      const indexer = new GfxTagIndexer();
      indexer.parseGfxScript(mockGfxScript);

      const focusSprites = indexer.searchByTag('focus');
      expect(focusSprites.length).toBeGreaterThanOrEqual(2);
      expect(focusSprites.map(s => s.name)).toContain('GFX_goal_generic_atomic_research');
    });
  });

  // 2. Mod Asset Optimizer & Purger
  describe('2. Mod Asset Optimizer & Purger', () => {
    it('identifies unreferenced textures, dead audio, orphaned loc keys and duplicate assets without double-counting', () => {
      const assets = [
        { path: 'gfx/interface/goals/unused_dead_focus.dds', fileType: 'texture' as const, sizeBytes: 154820, hash: 'hash_a' },
        { path: 'gfx/interface/goals/active_focus.dds', fileType: 'texture' as const, sizeBytes: 50000, hash: 'hash_b' },
        { path: 'sound/music/unregistered_march.ogg', fileType: 'audio' as const, sizeBytes: 13100000, hash: 'hash_c' },
        { path: 'sound/music/active_theme.ogg', fileType: 'audio' as const, sizeBytes: 8500000, hash: 'hash_d' },
        { path: 'gfx/flags/original_flag.tga', fileType: 'texture' as const, sizeBytes: 17074, hash: 'hash_flag' },
        { path: 'gfx/flags/duplicate_flag.tga', fileType: 'texture' as const, sizeBytes: 17074, hash: 'hash_flag' },
      ];

      const scriptCorpus = 'focus = { icon = GFX_active_focus }\nsong = { name = active_theme }\nflag = original_flag';
      const locKeys = ['UNUSED_FOCUS_KEY', 'ACTIVE_FOCUS_TITLE'];

      const report = scanModAssets(assets, scriptCorpus, locKeys);
      expect(report.unreferencedTextures.length).toBeGreaterThanOrEqual(1);
      expect(report.deadAudio.length).toBe(1);
      expect(report.orphanedLocKeys).toContain('UNUSED_FOCUS_KEY');
      expect(report.duplicateAssets.length).toBe(1);

      // Reclaimable bytes: 154,820 (unused) + 13,100,000 (dead audio) + 17,074 (duplicate) = 13,271,894
      expect(report.totalReclaimableBytes).toBe(154820 + 13100000 + 17074);
    });
  });

  // 3. Vanilla Patch & Version Upgrader
  describe('3. Vanilla Patch & Version Upgrader', () => {
    it('executes 3-way AST merge detecting conflicts vs auto-merges and Add/Add collisions', () => {
      const baseScript = `focus = {\n\tid = FOCUS_A\n\tcost = 10\n\treward = 50\n}`;
      const vanillaUpdated = `focus = {\n\tid = FOCUS_A\n\tcost = 14\n\treward = 50\n}`;
      const userMod = `focus = {\n\tid = FOCUS_A\n\tcost = 10\n\treward = 100\n}`;

      // Non-conflicting updates (vanilla updated cost, mod updated reward)
      const mergeReport = diffAst3Way(baseScript, vanillaUpdated, userMod);
      expect(mergeReport.conflictCount).toBe(0);
      expect(mergeReport.autoMergedCount).toBe(1);
      expect(mergeReport.mergedScript).toContain('cost = 14');
      expect(mergeReport.mergedScript).toContain('reward = 100');

      // Conflicting updates (both updated cost differently)
      const conflictingMod = `focus = {\n\tid = FOCUS_A\n\tcost = 7\n\treward = 100\n}`;
      const conflictReport = diffAst3Way(baseScript, vanillaUpdated, conflictingMod);
      expect(conflictReport.conflictCount).toBe(1);
      expect(conflictReport.blocks[0].status).toBe('conflict');
      expect(conflictReport.mergedScript).toContain('CONFLICT');

      // Add/Add Collision
      const baseEmpty = '';
      const vanillaAdd = `focus = {\n\tid = FOCUS_NEW\n\tcost = 10\n}`;
      const modAdd = `focus = {\n\tid = FOCUS_NEW\n\tcost = 5\n}`;
      const addAddReport = diffAst3Way(baseEmpty, vanillaAdd, modAdd);
      expect(addAddReport.conflictCount).toBe(1);
      expect(addAddReport.blocks[0].status).toBe('conflict');
    });

    it('migrates legacy create_country_leader syntax dynamically to modern character architecture', () => {
      const legacyLeaderScript = `
        create_country_leader = {
          name = "Leon Blum"
          desc = "POLITICS_LEON_BLUM_DESC"
          picture = "gfx/leaders/FRA/portrait_leon_blum.dds"
          expire = "1965.1.1"
          ideology = democratic_socialism
          traits = { popular_figurehead }
        }
      `;

      const result = migrateCountryLeaders(legacyLeaderScript);
      expect(result.migratedCount).toBe(1);
      expect(result.migratedScript).toContain('characters = {');
      expect(result.migratedScript).toContain('FRA_leon_blum = {');
      expect(result.migratedScript).toContain('name = "Leon Blum"');
      expect(result.migratedScript).toContain('large = "gfx/leaders/FRA/portrait_leon_blum.dds"');
      expect(result.migratedScript).toContain('ideology = democratic_socialism');
      expect(result.migratedScript).toContain('traits = { popular_figurehead }');
      expect(result.migratedScript).not.toContain('create_country_leader = {');
    });

    it('migrates deprecated triggers to modern HOI4 syntax', () => {
      const legacyScript = `
        trigger = {
          is_in_faction = yes
          is_puppet = yes
          can_create_factions = yes
        }
      `;

      const report = migrateDeprecatedScript(legacyScript);
      expect(report.totalMigrations).toBe(3);
      expect(report.migratedContent).toContain('has_faction = yes');
      expect(report.migratedContent).toContain('is_subject = yes');
      expect(report.migratedContent).toContain('rule = { can_create_factions = yes }');
      expect(report.migratedContent).not.toContain('is_in_faction = yes');
      expect(report.migratedContent).not.toContain('is_puppet = yes');
    });

    it('detects shifted province IDs by RGB in definition.csv and remaps mod state files with word boundary safety', () => {
      const oldCsv = "0;0;0;0;land;false;unknown;0\n1;100;50;25;land;false;plains;1\n501;200;80;90;land;false;hills;1\n";
      const newCsv = "0;0;0;0;land;false;unknown;0\n2;100;50;25;land;false;plains;1\n501;200;80;90;land;false;hills;1\n";

      const diff = computeProvinceDiff(oldCsv, newCsv);
      expect(diff.shiftedMap.get(1)).toBe(2);

      // Test with numbers that have digit prefix '1' (e.g. 10, 100, 11804)
      const modStateScript = `
        state = {
          id = 100
          provinces = { 1 10 100 11804 }
          history = {
            victory_points = { 1 5 }
            1 = { naval_base = 2 }
          }
        }
      `;

      const realigned = realignModProvinces(modStateScript, diff.shiftedMap);
      expect(realigned.replacementsCount).toBe(3);
      expect(realigned.modifiedScript).toContain('id = 100'); // NOT mangled to 200
      expect(realigned.modifiedScript).toContain('provinces = { 2 10 100 11804 }'); // 1 became 2, others preserved!
      expect(realigned.modifiedScript).toContain('victory_points = { 2 5 }');
      expect(realigned.modifiedScript).toContain('2 = { naval_base = 2 }');
    });
  });

  // 4. WYSIWYG .gui Layout Builder
  describe('4. WYSIWYG .gui Layout Builder & Minigame Templates', () => {
    it('generates compliant Clausewitz .gui syntax for containerWindowType, iconType, instantTextBoxType, buttonType', () => {
      const container: GuiElementDef = {
        id: 'win_1',
        type: 'containerWindowType',
        name: 'custom_decision_window',
        position: { x: 100, y: 150 },
        size: { width: 500, height: 350 },
        orientation: 'center',
        children: [
          {
            id: 'icon_1',
            type: 'iconType',
            name: 'background_icon',
            spriteType: 'GFX_tiled_window_thin_border',
            position: { x: 0, y: 0 },
            size: { width: 500, height: 350 },
          },
          {
            id: 'text_1',
            type: 'instantTextBoxType',
            name: 'window_title',
            position: { x: 20, y: 15 },
            size: { width: 400, height: 30 },
            font: 'hoi_24header',
            text: 'PARLIAMENT_VIEW_TITLE',
            format: 'center',
          },
          {
            id: 'btn_1',
            type: 'buttonType',
            name: 'close_button',
            position: { x: 460, y: 10 },
            size: { width: 30, height: 30 },
            spriteType: 'GFX_closebutton',
            clickSound: 'click_close',
          },
        ],
      };

      const script = serializeGuiElement(container);
      expect(script).toContain('containerWindowType = {');
      expect(script).toContain('name = "custom_decision_window"');
      expect(script).toContain('iconType = {');
      expect(script).toContain('instantTextBoxType = {');
      expect(script).toContain('font = "hoi_24header"');
      expect(script).toContain('buttonType = {');
      expect(script).toContain('clicksound = "click_close"');
    });

    it('computes semicircular parliament seating geometry and majority thresholds', () => {
      const seats = { democratic: 55, communist: 25, fascist: 20 };
      const calc = computeParliamentSeats(seats, 100, 150, 150);

      expect(calc.totalSeats).toBe(100);
      expect(calc.majorityThreshold).toBe(51);
      expect(calc.dots).toHaveLength(100);
      expect(calc.dots[0].x).toBeLessThan(150);
      expect(calc.dots[99].x).toBeGreaterThan(150);
    });
  });

  // 5. Automated 1-Click Multi-Resolution Flag Studio
  describe('5. Automated 1-Click Multi-Resolution Flag Studio', () => {
    const blueColor: [number, number, number] = [30, 90, 200];

    it('produces exact byte buffers: Standard 82x52 [17,074 B], Medium 41x26 [4,282 B], Small 10x7 [298 B]', () => {
      const stdBuf = createTgaBuffer(82, 52, blueColor);
      expect(stdBuf.length).toBe(17074);
      expect(validateFlagTga(stdBuf, 'standard').valid).toBe(true);

      const medBuf = createTgaBuffer(41, 26, blueColor);
      expect(medBuf.length).toBe(4282);
      expect(validateFlagTga(medBuf, 'medium').valid).toBe(true);

      const smlBuf = createTgaBuffer(10, 7, blueColor);
      expect(smlBuf.length).toBe(298);
      expect(validateFlagTga(smlBuf, 'small').valid).toBe(true);
    });

    it('exports all 4 major ideologies across all 3 resolutions (12 total verified flags)', () => {
      const flags = batchGenerateFlagTgas('RPL');
      expect(flags).toHaveLength(12);
      expect(flags[0].path).toBe('gfx/flags/RPL_democratic.tga');
      expect(flags[0].byteCount).toBe(17074);
      expect(flags[4].path).toBe('gfx/flags/medium/RPL_communism.tga');
      expect(flags[4].byteCount).toBe(4282);
      expect(flags[11].path).toBe('gfx/flags/small/RPL_neutrality.tga');
      expect(flags[11].byteCount).toBe(298);
    });
  });

  // 6. Music Station & Radio Studio
  describe('6. Music Station & Radio Studio', () => {
    it('evaluates playback chance factors and conditional modifiers correctly', () => {
      const modifiers = [
        { factor: 2.0, condition: (ctx: any) => ctx.tag === 'RPL' && ctx.war },
        { factor: 1.5, condition: (ctx: any) => ctx.democratic },
      ];

      const chance1 = calculatePlaybackChance(1.0, modifiers, { tag: 'RPL', war: true, democratic: true });
      expect(chance1).toBe(3.0);

      const chance2 = calculatePlaybackChance(1.0, modifiers, { tag: 'RPL', war: false, democratic: true });
      expect(chance2).toBe(1.5);
    });

    it('simulates volume ducking (-40% when combat occurs)', () => {
      const vol = calculateEffectiveVolume(0.8, true);
      expect(vol).toBeCloseTo(0.48);
    });
  });

  // 7. Steam Workshop Publisher & Packager
  describe('7. Steam Workshop Publisher & Packager', () => {
    it('validates descriptor.mod ensuring mandatory Paradox fields', () => {
      const validDescriptor = `
        version="1.2.0"
        tags={
          "Alternative History"
          "National Focuses"
        }
        name="Republic of Libertalia Overhaul"
        picture="thumbnail.png"
        supported_version="1.14.*"
      `;

      const validRes = validateModDescriptor(validDescriptor);
      expect(validRes.valid).toBe(true);
      expect(validRes.descriptor?.name).toBe('Republic of Libertalia Overhaul');

      const invalidDescriptor = `version="1.0.0"`;
      const invalidRes = validateModDescriptor(invalidDescriptor);
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.errors).toContain("Missing mandatory field: 'name'");
    });

    it('filters out internal development files from release package', () => {
      const rawFileList = [
        '.git/config',
        '.agents/teamwork/plan.md',
        'art_source/flag_emblem.psd',
        '3d_models/tank.blend',
        'sound/voice_raw.wav',
        'tests/unit_test.test.ts',
        'common/national_focus/france.txt',
        'history/countries/FRA - France.txt',
        'gfx/flags/FRA.tga',
        'descriptor.mod',
      ];

      const report = filterPackageReleaseFiles(rawFileList);
      expect(report.includedFiles).toHaveLength(4);
      expect(report.includedFiles).toContain('common/national_focus/france.txt');
      expect(report.includedFiles).toContain('history/countries/FRA - France.txt');
      expect(report.includedFiles).toContain('gfx/flags/FRA.tga');
      expect(report.includedFiles).toContain('descriptor.mod');
      expect(report.excludedFiles).toHaveLength(6);
    });
  });
});
