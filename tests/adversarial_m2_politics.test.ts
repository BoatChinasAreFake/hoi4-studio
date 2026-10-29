import { describe, it, expect } from 'vitest';
import {
  scaffoldCountryFiles,
  createTgaBuffer,
  prependUtf8Bom,
  hasUtf8Bom,
  stripUtf8Bom,
  validateLocalizationEncoding,
  formatLocalizationYaml,
  ALL_HOI4_LANGUAGES,
  refactorSymbolInContent,
  generateUnifiedDiff,
  generateBopScript,
  getActiveBopModifiers,
  generateCharacterScript,
  generateFactionScript,
  generateIdeologyScript,
  generateAutonomyScript,
  generateDiploActionScript,
  generateTimedActivityScript,
  validateSuperEventPayload,
  generateSuperEventFiles,
} from '../src/utils/politicsGenerators';
import type {
  CountryWizardConfig,
  BopDefinition,
  CharacterDef,
  FactionDef,
  IdeologyDefinition,
  AutonomyLevel,
  ScriptedDiploAction,
  TimedActivity,
  SuperEventDef,
} from '../src/types/politics';
import { validateFlagTga, parseTgaHeader } from './helpers/tgaValidator';
import { parseCharactersFile } from './helpers/characterParser';
import { parseBopScript } from './helpers/bopParser';
import { parseIdeologies } from './helpers/ideologyParser';

describe('Adversarial M2: Phase 3 Politics, Country Wizard, BoP & Localization Engine Stress Test', () => {
  // =========================================================================
  // 1. Country Wizard 10-File / 7-Dir Scaffolding & Clausewitz Syntax
  // =========================================================================
  describe('1. Country Wizard 10-File / 7-Dir Scaffolding & Clausewitz Syntax', () => {
    const testConfigs: CountryWizardConfig[] = [
      {
        tag: 'BOR',
        name: 'Borduria',
        adjective: 'Bordurian',
        color: [140, 30, 45],
        graphicalCulture: 'eastern_european_gfx',
        capitalProvinceId: 450,
        stateId: 999,
        stateName: 'Szohod',
        stateProvinces: [450, 451, 452],
        rulingParty: 'fascism',
        leaderName: 'Kurvi-Tasch',
        leaderIdeology: 'fascism_ideology',
        leaderPortrait: 'GFX_portrait_BOR_kurvi',
      },
      {
        tag: 'SYL',
        name: 'Syldavia',
        adjective: 'Syldavian',
        color: [45, 95, 140],
        graphicalCulture: 'eastern_european_gfx',
        capitalProvinceId: 460,
        stateId: 1001,
        stateName: 'Klow',
        stateProvinces: [460, 461, 462, 463, 464, 465],
        rulingParty: 'democratic',
        leaderName: 'Muskar XII',
        leaderIdeology: 'constitutional_monarchy',
        leaderPortrait: 'GFX_portrait_SYL_muskar',
      },
      {
        tag: 'SAN',
        name: 'San Escobar',
        adjective: 'Escobarian',
        color: [0, 0, 0], // Edge RGB black
        graphicalCulture: 'southamerican_gfx',
        capitalProvinceId: 1,
        stateId: 500,
        stateName: 'Santo Subito',
        stateProvinces: [1],
        rulingParty: 'communism',
        leaderName: 'Ernesto Guava',
        leaderIdeology: 'marxism_leninism',
      },
      {
        tag: 'WHT',
        name: 'White Island',
        adjective: 'White Islander',
        color: [255, 255, 255], // Edge RGB white
        graphicalCulture: 'commonwealth_gfx',
        capitalProvinceId: 13000,
        stateId: 2000,
        stateName: 'Alba',
        stateProvinces: Array.from({ length: 25 }, (_, i) => 12000 + i),
        rulingParty: 'neutrality',
        leaderName: 'Governor General',
        leaderIdeology: 'despotism',
      },
    ];

    it.each(testConfigs)(
      'scaffolds exactly 10 files across >= 7 distinct directories for $name ($tag)',
      (cfg) => {
        const result = scaffoldCountryFiles(cfg);

        expect(result.tag).toBe(cfg.tag);
        expect(result.files).toHaveLength(10);
        expect(result.directories.length).toBeGreaterThanOrEqual(7);

        // Verify all 10 expected relative file paths exist
        const paths = result.files.map((f) => f.path);
        expect(paths).toContain(`common/countries/${cfg.name}.txt`);
        expect(paths).toContain(`common/country_tags/${cfg.tag}.txt`);
        expect(paths).toContain(`history/countries/${cfg.tag} - ${cfg.name}.txt`);
        expect(paths).toContain(`history/states/${cfg.stateId}-${cfg.stateName}.txt`);
        expect(paths).toContain(`gfx/flags/${cfg.tag}.tga`);
        expect(paths).toContain(`gfx/flags/medium/${cfg.tag}.tga`);
        expect(paths).toContain(`gfx/flags/small/${cfg.tag}.tga`);
        expect(paths).toContain(`common/characters/${cfg.tag}.txt`);
        expect(paths).toContain(`common/ideas/${cfg.tag}.txt`);
        expect(paths).toContain(`localisation/english/${cfg.tag}_l_english.yml`);
      }
    );

    it('verifies strict Clausewitz syntax (balanced braces, balanced quotes, no NaNs) across all generated files', () => {
      for (const cfg of testConfigs) {
        const result = scaffoldCountryFiles(cfg);
        for (const file of result.files) {
          if (!file.isBinary && typeof file.content === 'string') {
            const content = file.content;

            // 1. Check for no NaN or undefined
            expect(content).not.toContain('NaN');
            expect(content).not.toContain('undefined');
            expect(content).not.toContain('null');

            // 2. Check balanced braces
            let depth = 0;
            for (let i = 0; i < content.length; i++) {
              if (content[i] === '{') depth++;
              else if (content[i] === '}') {
                depth--;
                expect(depth).toBeGreaterThanOrEqual(0);
              }
            }
            expect(depth).toBe(0);

            // 3. Check balanced quotes
            const quoteCount = (content.match(/"/g) || []).length;
            expect(quoteCount % 2).toBe(0);
          }
        }
      }
    });

    it('verifies democratic countries set elections_allowed = yes while others set elections_allowed = no', () => {
      const demRes = scaffoldCountryFiles(testConfigs[1]); // SYL, democratic
      const demHist = demRes.files.find((f) => f.path.startsWith('history/countries'))!;
      expect(demHist.content).toContain('elections_allowed = yes');

      const fasRes = scaffoldCountryFiles(testConfigs[0]); // BOR, fascism
      const fasHist = fasRes.files.find((f) => f.path.startsWith('history/countries'))!;
      expect(fasHist.content).toContain('elections_allowed = no');

      const comRes = scaffoldCountryFiles(testConfigs[2]); // SAN, communism
      const comHist = comRes.files.find((f) => f.path.startsWith('history/countries'))!;
      expect(comHist.content).toContain('elections_allowed = no');

      const neuRes = scaffoldCountryFiles(testConfigs[3]); // WHT, neutrality
      const neuHist = neuRes.files.find((f) => f.path.startsWith('history/countries'))!;
      expect(neuHist.content).toContain('elections_allowed = no');
    });

    it('validates standard, medium, and small TGA flag headers and binary dimensions', () => {
      const cfg = testConfigs[0];
      const result = scaffoldCountryFiles(cfg);

      // 1. Standard Flag (82x52)
      const stdFile = result.files.find((f) => f.path === `gfx/flags/${cfg.tag}.tga`)!;
      expect(stdFile.isBinary).toBe(true);
      const stdBytes = stdFile.content as Uint8Array;
      expect(stdBytes.length).toBe(18 + 82 * 52 * 4); // 17074
      const stdVal = validateFlagTga(stdBytes, 'standard');
      expect(stdVal.valid).toBe(true);
      expect(stdVal.info?.width).toBe(82);
      expect(stdVal.info?.height).toBe(52);
      expect(stdVal.info?.bpp).toBe(32);
      expect(stdVal.info?.isUncompressedTrueColor).toBe(true);

      // Verify BGRA byte ordering at pixel offset
      expect(stdBytes[18]).toBe(cfg.color[2]); // B
      expect(stdBytes[19]).toBe(cfg.color[1]); // G
      expect(stdBytes[20]).toBe(cfg.color[0]); // R
      expect(stdBytes[21]).toBe(255); // Alpha

      // 2. Medium Flag (41x26)
      const medFile = result.files.find((f) => f.path === `gfx/flags/medium/${cfg.tag}.tga`)!;
      const medBytes = medFile.content as Uint8Array;
      expect(medBytes.length).toBe(18 + 41 * 26 * 4); // 4282
      const medVal = validateFlagTga(medBytes, 'medium');
      expect(medVal.valid).toBe(true);
      expect(medVal.info?.width).toBe(41);
      expect(medVal.info?.height).toBe(26);

      // 3. Small Flag (10x7)
      const smallFile = result.files.find((f) => f.path === `gfx/flags/small/${cfg.tag}.tga`)!;
      const smallBytes = smallFile.content as Uint8Array;
      expect(smallBytes.length).toBe(18 + 10 * 7 * 4); // 298
      const smallVal = validateFlagTga(smallBytes, 'small');
      expect(smallVal.valid).toBe(true);
      expect(smallVal.info?.width).toBe(10);
      expect(smallVal.info?.height).toBe(7);
    });

    it('rejects corrupted and invalid flag TGA buffers', () => {
      // Buffer too small (< 18 bytes)
      expect(validateFlagTga(new Uint8Array(10), 'standard').valid).toBe(false);

      // Valid size but wrong dimensions (e.g. 50x50 instead of 82x52)
      const wrongDim = createTgaBuffer(50, 50, [100, 100, 100]);
      const resWrong = validateFlagTga(wrongDim, 'standard');
      expect(resWrong.valid).toBe(false);
      expect(resWrong.error).toContain('Invalid flag dimensions');

      // Wrong image type (not type 2)
      const wrongType = createTgaBuffer(82, 52, [100, 100, 100]);
      wrongType[2] = 1; // Colormapped instead of true-color
      const resType = validateFlagTga(wrongType, 'standard');
      expect(resType.valid).toBe(false);
      expect(resType.error).toContain('Invalid TGA image type');
    });
  });

  // =========================================================================
  // 2. UTF-8 BOM Verification Across 10 Languages and Non-ASCII Encodings
  // =========================================================================
  describe('2. UTF-8 BOM Verification Across 10 Languages and Non-ASCII Encodings', () => {
    const complexMultilingualEntries = [
      // Cyrillic (Russian, Ukrainian)
      { key: 'SOV_name', value: 'Союз Советских Социалистических Республик' },
      { key: 'UKR_city', value: 'Вінниця та Дніпро' },
      // Simplified & Traditional Chinese
      { key: 'CHI_name', value: '中华民国 / 中華民國' },
      { key: 'PRC_name', value: '中华人民共和国' },
      { key: 'CHI_event', value: '七七事变与卢沟桥' },
      // Japanese Kanji, Hiragana, Katakana
      { key: 'JAP_fleet', value: '連合艦隊旗艦「大和」' },
      { key: 'JAP_plane', value: '三菱 零式艦上戦闘機（ゼロセン）' },
      // Korean Hangul
      { key: 'KOR_gov', value: '대한민국 임시정부 (大韓民國 臨時政府)' },
      // European diacritics (German, French, Polish, Spanish, Portuguese, Turkish, Czech)
      { key: 'GER_cities', value: 'München, Nürnberg, Köln, Düsseldorf und Königsberg' },
      { key: 'FRA_republic', value: 'Troisième République Française: Liberté, Égalité, Fraternité' },
      { key: 'POL_heroes', value: 'Bohaterowie Gdańska, Krakowa, Łodzi i Warszawy' },
      { key: 'SPA_conflict', value: 'Guerra Civil Española: ¡No Pasarán!' },
      { key: 'BRA_city', value: 'São Paulo, Brasília e Rio de Janeiro' },
      { key: 'TUR_leader', value: 'Mustafa Kemal Atatürk ve İsmet İnönü' },
      { key: 'CZE_state', value: 'Československá republika: Praha a Brno' },
      // Quotes & variable references
      { key: 'QUOTE_TEST', value: '"We shall fight on the beaches, we shall fight on the landing grounds."' },
      { key: 'TOKEN_REF', value: '§Y[Root.GetName]§! controls §R$STATE_50$§!' },
    ];

    it('verifies that all 10 Paradox official languages strictly start with [0xEF, 0xBB, 0xBF]', () => {
      expect(ALL_HOI4_LANGUAGES).toHaveLength(10);

      for (const { key: langKey } of ALL_HOI4_LANGUAGES) {
        const bytes = formatLocalizationYaml(langKey, [
          { key: 'TEST_KEY', value: 'Test localization value' },
        ]);

        // Exact raw byte checks
        expect(bytes.length).toBeGreaterThanOrEqual(3);
        expect(bytes[0]).toBe(0xef);
        expect(bytes[1]).toBe(0xbb);
        expect(bytes[2]).toBe(0xbf);

        // Helper checks
        expect(hasUtf8Bom(bytes)).toBe(true);
        const val = validateLocalizationEncoding(bytes);
        expect(val.valid).toBe(true);

        // Text representation check
        const { text } = stripUtf8Bom(bytes);
        expect(text).toContain(`l_${langKey}:`);
        expect(text).toContain('TEST_KEY:0 "Test localization value"');
      }
    });

    it('preserves 100% of non-ASCII multibyte glyphs without corruption or replacement characters', () => {
      const bytes = formatLocalizationYaml('russian', complexMultilingualEntries);
      expect(hasUtf8Bom(bytes)).toBe(true);

      const { text } = stripUtf8Bom(bytes);

      // Verify no Unicode replacement character was introduced
      expect(text).not.toContain('\uFFFD');

      // Verify every single non-ASCII test entry is intact
      for (const entry of complexMultilingualEntries) {
        expect(text).toContain(`${entry.key}:0 "${entry.value}"`);
      }
    });

    it('rejects invalid, truncated, and non-BOM encoded byte buffers', () => {
      // 1. Buffer too small (< 3 bytes)
      expect(validateLocalizationEncoding(new Uint8Array([])).valid).toBe(false);
      expect(validateLocalizationEncoding(new Uint8Array([0xef])).valid).toBe(false);
      expect(validateLocalizationEncoding(new Uint8Array([0xef, 0xbb])).valid).toBe(false);

      // 2. UTF-8 string without BOM
      const noBom = new TextEncoder().encode('l_english:\n FRA:0 "France"\n');
      const noBomVal = validateLocalizationEncoding(noBom);
      expect(noBomVal.valid).toBe(false);
      expect(noBomVal.error).toContain('Missing mandatory UTF-8 BOM prefix');

      // 3. UTF-16 Big Endian BOM [0xFE, 0xFF]
      const utf16Be = new Uint8Array([0xfe, 0xff, 0x00, 0x6c]);
      expect(validateLocalizationEncoding(utf16Be).valid).toBe(false);

      // 4. UTF-16 Little Endian BOM [0xFF, 0xFE]
      const utf16Le = new Uint8Array([0xff, 0xfe, 0x6c, 0x00]);
      expect(validateLocalizationEncoding(utf16Le).valid).toBe(false);
    });

    it('handles prependUtf8Bom and stripUtf8Bom idempotently', () => {
      const rawText = 'l_english:\n KEY:0 "Value"\n';
      const bomBytes = prependUtf8Bom(rawText);
      expect(hasUtf8Bom(bomBytes)).toBe(true);

      const stripped = stripUtf8Bom(bomBytes);
      expect(stripped.hasBom).toBe(true);
      expect(stripped.text).toBe(rawText);

      // Stripping non-BOM bytes should gracefully return original text
      const rawBytes = new TextEncoder().encode(rawText);
      const strippedRaw = stripUtf8Bom(rawBytes);
      expect(strippedRaw.hasBom).toBe(false);
      expect(strippedRaw.text).toBe(rawText);
    });
  });

  // =========================================================================
  // 3. Symbol Refactoring Stress Testing & Cross-File AST Diffs
  // =========================================================================
  describe('3. Symbol Refactoring Stress Testing & Word-Boundary Integrity', () => {
    it('accurately isolates target symbol from adjacent underscores, word prefixes, and suffixes', () => {
      const source = [
        'tag = GER',
        'ruling_party = GER_fascism',
        'is_puppet_of = PRE_GER',
        'GERMANY = yes',
        'GER:0 "German Reich"',
        'GER.1 = { country_event }',
        'set_variable = { which = GER value = 5 }',
        'custom_tag = "GER"',
      ].join('\n');

      const { newContent, count } = refactorSymbolInContent(source, 'GER', 'DEU');

      // Only true word-boundary 'GER' should be replaced:
      // Line 1: 'tag = GER' -> replaced (1)
      // Line 2: 'GER_fascism' -> '_' is ident char, NOT replaced (0)
      // Line 3: 'PRE_GER' -> '_' is ident char, NOT replaced (0)
      // Line 4: 'GERMANY' -> letters continue, NOT replaced (0)
      // Line 5: 'GER:0' -> ':' is non-ident boundary, replaced (1)
      // Line 6: 'GER.1' -> '.' is non-ident boundary, replaced (1)
      // Line 7: 'which = GER' -> space boundary, replaced (1)
      // Line 8: '"GER"' -> quote boundary, replaced (1)
      expect(count).toBe(5);

      expect(newContent).toContain('tag = DEU');
      expect(newContent).toContain('ruling_party = GER_fascism'); // Preserved!
      expect(newContent).toContain('is_puppet_of = PRE_GER'); // Preserved!
      expect(newContent).toContain('GERMANY = yes'); // Preserved!
      expect(newContent).toContain('DEU:0 "German Reich"'); // Replaced!
      expect(newContent).toContain('DEU.1 = { country_event }'); // Replaced!
      expect(newContent).toContain('which = DEU value = 5'); // Replaced!
      expect(newContent).toContain('custom_tag = "DEU"'); // Replaced!
    });

    it('handles expansion and contraction without infinite loops', () => {
      // Expansion: 'A' -> 'AA'
      const expandText = 'focus = A\nprerequisite = { focus = A }\nother = B';
      const { newContent: expanded, count: expCount } = refactorSymbolInContent(expandText, 'A', 'AA');
      expect(expCount).toBe(2);
      expect(expanded).toContain('focus = AA');
      expect(expanded).toContain('focus = AA }');
      expect(expanded).toContain('other = B');

      // Contraction: 'AA' -> 'A'
      const contractText = 'tag = AA\nleader = AA_char';
      const { newContent: contracted, count: conCount } = refactorSymbolInContent(contractText, 'AA', 'A');
      expect(conCount).toBe(1);
      expect(contracted).toContain('tag = A');
      expect(contracted).toContain('leader = AA_char'); // Preserved!
    });

    it('handles multiple occurrences on single line and repeated tokens', () => {
      const text = 'swap_ideas = { remove_idea = TAG_SPIRIT add_idea = TAG_SPIRIT } TAG TAG';
      const { newContent, count } = refactorSymbolInContent(text, 'TAG', 'NEW');
      expect(count).toBe(2); // exactly the trailing 'TAG TAG'
      expect(newContent).toBe('swap_ideas = { remove_idea = TAG_SPIRIT add_idea = TAG_SPIRIT } NEW NEW');
    });

    it('returns original text unchanged when old symbol is empty or identical to new symbol', () => {
      const text = 'capital = 123\nowner = FRA\n';
      expect(refactorSymbolInContent(text, '', 'XYZ').count).toBe(0);
      expect(refactorSymbolInContent(text, 'FRA', 'FRA').count).toBe(0);
      expect(refactorSymbolInContent(text, 'NON_EXISTENT', 'XYZ').count).toBe(0);
    });

    it('generates unified diff with accurate line numbers and hunk headers', () => {
      const oldCode = [
        'common_idea_1 = { }',
        'target_idea = {',
        '    picture = generic',
        '}',
        'common_idea_2 = { }',
      ].join('\n');

      const newCode = [
        'common_idea_1 = { }',
        'target_idea_renamed = {',
        '    picture = generic',
        '}',
        'common_idea_2 = { }',
      ].join('\n');

      const diff = generateUnifiedDiff('common/ideas/ideas.txt', oldCode, newCode);
      expect(diff).toContain('--- a/common/ideas/ideas.txt');
      expect(diff).toContain('+++ b/common/ideas/ideas.txt');
      expect(diff).toContain('@@ -2,1 +2,1 @@');
      expect(diff).toContain('-target_idea = {');
      expect(diff).toContain('+target_idea_renamed = {');
    });
  });

  // =========================================================================
  // 4. Balance of Power (BoP) Slider & Character Traits Edge Cases
  // =========================================================================
  describe('4. Balance of Power (BoP) Slider & Character Traits Edge Cases', () => {
    const testBop: BopDefinition = {
      token: 'ITA_balance_of_power',
      initialValue: 0.0,
      leftSide: 'grand_council_side',
      rightSide: 'duce_side',
      decisionCategory: 'ITA_bop_category',
      neutralRange: {
        id: 'neutral_equilibrium',
        min: -0.15,
        max: 0.15,
        modifiers: {
          political_power_factor: 0.05,
        },
      },
      sides: [
        {
          id: 'grand_council_side',
          name: 'Grand Council of Fascism',
          ranges: [
            {
              id: 'council_total_control',
              min: -1.0,
              max: -0.6,
              modifiers: {
                stability_factor: -0.2,
                political_power_gain: 0.3,
              },
            },
            {
              id: 'council_high_influence',
              min: -0.6,
              max: -0.15,
              modifiers: {
                stability_factor: -0.1,
                political_power_gain: 0.15,
              },
            },
          ],
        },
        {
          id: 'duce_side',
          name: 'Il Duce',
          ranges: [
            {
              id: 'duce_high_influence',
              min: 0.15,
              max: 0.6,
              modifiers: {
                war_support_factor: 0.1,
                command_power_gain: 0.25,
              },
            },
            {
              id: 'duce_total_control',
              min: 0.6,
              max: 1.0,
              modifiers: {
                war_support_factor: 0.25,
                justify_war_goal_time: -0.3,
              },
            },
          ],
        },
      ],
    };

    it('evaluates active modifier resolution across critical edge-case tension points (-1.0, 0.0, +1.0)', () => {
      // 1. Minimum bound (-1.0)
      const minRes = getActiveBopModifiers(testBop, -1.0);
      expect(minRes.activeSideId).toBe('grand_council_side');
      expect(minRes.activeRangeId).toBe('council_total_control');
      expect(minRes.modifiers.stability_factor).toBe(-0.2);

      // 2. Exact origin (0.0)
      const zeroRes = getActiveBopModifiers(testBop, 0.0);
      expect(zeroRes.activeSideId).toBe('neutral');
      expect(zeroRes.activeRangeId).toBe('neutral_equilibrium');
      expect(zeroRes.modifiers.political_power_factor).toBe(0.05);

      // 3. Maximum bound (+1.0)
      const maxRes = getActiveBopModifiers(testBop, 1.0);
      expect(maxRes.activeSideId).toBe('duce_side');
      expect(maxRes.activeRangeId).toBe('duce_total_control');
      expect(maxRes.modifiers.war_support_factor).toBe(0.25);
    });

    it('resolves bracket boundary transition points consistently without gaps', () => {
      // -0.6 boundary
      const boundLeft = getActiveBopModifiers(testBop, -0.6);
      expect(['council_total_control', 'council_high_influence']).toContain(boundLeft.activeRangeId);

      // -0.15 boundary between council and neutral
      const boundNeutralLeft = getActiveBopModifiers(testBop, -0.15);
      expect(boundNeutralLeft.activeRangeId).toBeDefined();

      // +0.15 boundary between neutral and duce
      const boundNeutralRight = getActiveBopModifiers(testBop, 0.15);
      expect(boundNeutralRight.activeRangeId).toBeDefined();

      // +0.6 boundary between duce influence and total control
      const boundRight = getActiveBopModifiers(testBop, 0.6);
      expect(['duce_high_influence', 'duce_total_control']).toContain(boundRight.activeRangeId);
    });

    it('handles out-of-bounds tension values gracefully without throwing', () => {
      const farLeft = getActiveBopModifiers(testBop, -1.5);
      expect(farLeft.modifiers).toEqual({});

      const farRight = getActiveBopModifiers(testBop, 1.5);
      expect(farRight.modifiers).toEqual({});
    });

    it('generates Clausewitz BoP script that parses back successfully through parseBopScript', () => {
      const script = generateBopScript(testBop);
      const parsed = parseBopScript(script);

      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.bop?.token).toBe('ITA_balance_of_power');
      expect(parsed.bop?.leftSide).toBe('grand_council_side');
      expect(parsed.bop?.rightSide).toBe('duce_side');
      expect(parsed.bop?.initialValue).toBe(0.0);
    });

    it('supports complex multi-role characters with Ship Captain naval traits & Götterdämmerung scientists', () => {
      const renaissanceLeader: CharacterDef = {
        token: 'ITA_multi_role_marshal',
        name: 'Pietro Badoglio',
        gender: 'male',
        portraits: {
          civilianLarge: 'GFX_portrait_badoglio_civ',
          civilianSmall: 'GFX_portrait_badoglio_civ_small',
          armyLarge: 'GFX_portrait_badoglio_army',
          armySmall: 'GFX_portrait_badoglio_army_small',
        },
        countryLeader: {
          ideology: 'fascism_ideology',
          expire: '1956.1.1',
          traits: ['cornered_fox', 'dictator'],
          id: -1,
        },
        corpsCommander: {
          skill: 4,
          attack: 3,
          defense: 4,
          planning: 3,
          logistics: 2,
          traits: ['old_guard', 'defensive_doctrine'],
        },
        navyLeader: {
          skill: 5,
          attack: 4,
          defense: 4,
          maneuvering: 5,
          coordination: 4,
          traits: [
            'cruiser_captain',
            'destroyer_leader',
            'seawolf',
            'ironside',
            'superior_tactician',
          ],
        },
        advisor: {
          slot: 'army_chief',
          ideaToken: 'ITA_badoglio_chief',
          ledger: 'army',
          cost: 150,
          traits: ['army_chief_defensive_2'],
          aiWillDo: 1.5,
        },
        scientist: {
          traits: ['theoretical_physicist', 'meticulous'],
          specializations: {
            nuclear: 3,
            rocketry: 2,
            aeronautics: 4,
            electronics: 1,
          },
        },
      };

      const script = generateCharacterScript([renaissanceLeader]);

      // Verify all Ship Captain naval traits are present
      expect(script).toContain('cruiser_captain');
      expect(script).toContain('destroyer_leader');
      expect(script).toContain('seawolf');
      expect(script).toContain('ironside');
      expect(script).toContain('superior_tactician');

      // Verify scientist specializations are present
      expect(script).toContain('nuclear = 3');
      expect(script).toContain('rocketry = 2');
      expect(script).toContain('aeronautics = 4');
      expect(script).toContain('electronics = 1');

      // Round-trip parsing verification
      const { characters, errors } = parseCharactersFile(script);
      expect(errors).toHaveLength(0);
      expect(characters).toHaveLength(1);

      const parsed = characters[0];
      expect(parsed.token).toBe('ITA_multi_role_marshal');
      expect(parsed.countryLeader?.ideology).toBe('fascism_ideology');
      expect(parsed.corpsCommander?.skill).toBe(4);
      expect(parsed.navyLeader?.skill).toBe(5);
      expect(parsed.navyLeader?.traits).toContain('cruiser_captain');
      expect(parsed.navyLeader?.traits).toContain('seawolf');
      expect(parsed.advisor?.slot).toBe('army_chief');
      expect(parsed.scientist?.specializations.nuclear).toBe(3);
    });
  });

  // =========================================================================
  // 5. Narrative, Super Events & Political Systems Generator Checks
  // =========================================================================
  describe('5. Narrative, Super Events & Political Systems Generator Checks', () => {
    it('validates and scaffolds complete Super Event assets (.gui, scripted_gui, .asset, event script)', () => {
      const superEvent: SuperEventDef = {
        id: 'super_event_unification',
        titleLocKey: 'SUPER_EVENT_UNIFICATION_TITLE',
        titleText: 'A NATION REUNITED',
        quoteLocKey: 'SUPER_EVENT_UNIFICATION_QUOTE',
        quoteText: 'The divided brothers have clasped hands once more across the ruins.',
        quoteAuthor: 'Anonymous Veteran',
        buttonLocKey: 'SUPER_EVENT_UNIFICATION_BTN',
        buttonText: 'Order is restored.',
        bannerSprite: 'GFX_super_event_unification_banner',
        soundEffect: 'anthem_of_reunion',
        frameSkin: 'kaiserreich',
        fireOnlyOnce: true,
      };

      const val = validateSuperEventPayload(superEvent);
      expect(val.valid).toBe(true);

      const files = generateSuperEventFiles(superEvent);
      expect(Object.keys(files)).toHaveLength(4);

      const gui = files['interface/superevents_unification.gui'];
      expect(gui).toContain('name = "super_event_unification_window"');
      expect(gui).toContain('spriteType = "GFX_super_event_unification_frame_kaiserreich"');

      const sGui = files['common/scripted_guis/superevents_unification_scripted_gui.txt'];
      expect(sGui).toContain('has_global_flag = super_event_unification_active');

      const asset = files['sound/superevents_unification.asset'];
      expect(asset).toContain('name = "anthem_of_reunion"');

      const evt = files['events/SuperEvents_unification.txt'];
      expect(evt).toContain('add_namespace = superevent_unification');
    });

    it('generates valid NCNS faction rules and strategic goals', () => {
      const faction: FactionDef = {
        name: 'Anti-Comintern Pact',
        leaderTag: 'GER',
        ideology: 'fascism',
        rules: {
          leaderVetoPeace: true,
          canPuppetJoin: false,
          worldTensionThreshold: 0.25,
          offensiveWarAllowed: true,
          mutualDefenseTrigger: true,
        },
        memberTags: ['GER', 'ITA', 'JAP', 'HUN', 'ROM'],
        goals: [
          {
            id: 'crush_bolshevism',
            name: 'Crush Bolshevism',
            description: 'Total destruction of the Soviet government.',
            rewardModifier: {
              army_core_attack_factor: 0.15,
            },
          },
        ],
      };

      const { rulesScript, goalsScript } = generateFactionScript(faction);
      expect(rulesScript).toContain('leader = GER');
      expect(rulesScript).toContain('leader_veto_peace_deals = yes');
      expect(rulesScript).toContain('can_puppet_join = no');
      expect(rulesScript).toContain('members = { GER ITA JAP HUN ROM }');

      expect(goalsScript).toContain('faction_goal_crush_bolshevism = {');
      expect(goalsScript).toContain('army_core_attack_factor = 0.15');
    });

    it('generates valid custom ideologies and sub-ideologies with Paradox rule flags', () => {
      const ideology: IdeologyDefinition = {
        name: 'technocracy',
        group: 'neutrality',
        color: [70, 130, 180],
        subTypes: ['cybernetic_planning', 'algorithmic_governance', 'expert_council'],
        rules: {
          can_force_government: true,
          can_puppet: true,
          can_send_volunteers: false,
          can_be_spymaster: true,
        },
        warImpactOnWorldTension: 0.2,
        dynamicFactionNames: ['FACTION_NAME_TECHNOCRACY_1'],
      };

      const script = generateIdeologyScript([ideology]);
      expect(script).toContain('technocracy = {');
      expect(script).toContain('cybernetic_planning = { }');
      expect(script).toContain('algorithmic_governance = { }');
      expect(script).toContain('color = { 70 130 180 }');
      expect(script).toContain('can_force_government = yes');
      expect(script).toContain('can_send_volunteers = no');
      expect(script).toContain('war_impact_on_world_tension = 0.20');
    });

    it('generates valid Autonomy ladder script with resource and manpower constraints', () => {
      const levels: AutonomyLevel[] = [
        {
          id: 'integrated_protectorate',
          name: 'Integrated Protectorate',
          minFreedomLevel: 0.1,
          manpowerInfluence: 0.9,
          rules: {
            can_not_declare_war: true,
            can_decline_call_to_war: false,
            can_be_spymaster: false,
            contributes_operatives: true,
          },
          modifiers: {
            autonomy_manpower_share: 0.9,
            master_resources_extraction_factor: 0.5,
          },
        },
      ];

      const script = generateAutonomyScript(levels);
      expect(script).toContain('autonomy_integrated_protectorate = {');
      expect(script).toContain('is_puppet = yes');
      expect(script).toContain('min_freedom_level = 0.10');
      expect(script).toContain('manpower_influence = 0.90');
      expect(script).toContain('can_not_declare_war = yes');
      expect(script).toContain('master_resources_extraction_factor = 0.5');
    });

    it('generates valid Scripted Diplo Actions and Timed Activities', () => {
      const diplo: ScriptedDiploAction = {
        id: 'demand_demilitarization',
        name: 'Demand Border Demilitarization',
        costPP: 100,
        costCP: 50,
        requiresAcceptance: true,
        allowedTrigger: 'is_neighbor_of = FROM',
        visibleTrigger: 'always = yes',
        aiAcceptanceFormula: 'base = 25 modifier = { factor = 2.0 strength_ratio > 2.0 }',
        onSentEffect: 'FROM = { country_event = border_ultimatum.1 }',
        completeEffect: 'FROM = { set_demilitarized_zone = 50 }',
        rejectEffect: 'create_wargoal = { type = annex_everything target = FROM }',
      };

      const timed: TimedActivity = {
        id: 'naval_maneuvers',
        name: 'Joint Naval Exercises',
        durationDays: 60,
        equipmentCost: { fuel: 5000 },
        cancelTrigger: 'has_war = yes',
        onExpireEffect: 'add_navy_experience = 25',
      };

      const diploScript = generateDiploActionScript(diplo);
      expect(diploScript).toContain('demand_demilitarization = {');
      expect(diploScript).toContain('cost = 100');
      expect(diploScript).toContain('command_power = 50');
      expect(diploScript).toContain('create_wargoal');

      const timedScript = generateTimedActivityScript(timed);
      expect(timedScript).toContain('timed_activity_naval_maneuvers = {');
      expect(timedScript).toContain('duration = 60');
      expect(timedScript).toContain('fuel = 5000');
      expect(timedScript).toContain('add_navy_experience = 25');
    });
  });
});
