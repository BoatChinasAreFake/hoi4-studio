import { describe, it, expect } from 'vitest';
import {
  createTgaBuffer,
  prependUtf8Bom,
  hasUtf8Bom,
  stripUtf8Bom,
  validateLocalizationEncoding,
  scaffoldCountryFiles,
  generateCharacterScript,
  getActiveBopModifiers,
  generateBopScript,
  refactorSymbolInContent,
  generateUnifiedDiff,
  formatLocalizationYaml,
} from '../src/utils/politicsGenerators';
import type {
  CountryWizardConfig,
  BopDefinition,
  CharacterDef,
} from '../src/types/politics';
import { parseTgaHeader } from './helpers/tgaValidator';

describe('Forensic Integrity Stress Tests - Milestone M2', () => {
  // 1. TGA Binary Exporter Stress & Pixel Analysis
  describe('1. 32-bit TGA Exporter Binary Layout & Color Channels', () => {
    it('verifies exact header bytes and BGRA pixel channel ordering for custom color', () => {
      const red = 135;
      const green = 72;
      const blue = 210;
      const width = 82;
      const height = 52;

      const tga = createTgaBuffer(width, height, [red, green, blue]);

      // Check total size = 18 header + (82 * 52 * 4) = 17074
      expect(tga.length).toBe(18 + width * height * 4);

      // Check header fields
      expect(tga[0]).toBe(0); // ID length
      expect(tga[1]).toBe(0); // Color map type
      expect(tga[2]).toBe(2); // Image type: uncompressed true-color
      expect(tga[12]).toBe(82); // Width low
      expect(tga[13]).toBe(0);  // Width high
      expect(tga[14]).toBe(52); // Height low
      expect(tga[15]).toBe(0);  // Height high
      expect(tga[16]).toBe(32); // 32 bits per pixel
      expect(tga[17]).toBe(0x28); // Origin / descriptor

      const parsed = parseTgaHeader(tga);
      expect(parsed.width).toBe(82);
      expect(parsed.height).toBe(52);
      expect(parsed.bpp).toBe(32);
      expect(parsed.isUncompressedTrueColor).toBe(true);

      // Verify every single pixel matches BGRA layout: blue, green, red, 255
      for (let i = 18; i < tga.length; i += 4) {
        expect(tga[i]).toBe(blue);      // Blue
        expect(tga[i + 1]).toBe(green);  // Green
        expect(tga[i + 2]).toBe(red);    // Red
        expect(tga[i + 3]).toBe(255);    // Alpha
      }
    });

    it('verifies medium (41x26) and small (10x7) TGA dimensions and byte integrity', () => {
      const med = createTgaBuffer(41, 26, [10, 20, 30]);
      expect(med.length).toBe(18 + 41 * 26 * 4); // 4282
      const medParsed = parseTgaHeader(med);
      expect(medParsed.width).toBe(41);
      expect(medParsed.height).toBe(26);

      const small = createTgaBuffer(10, 7, [10, 20, 30]);
      expect(small.length).toBe(18 + 10 * 7 * 4); // 298
      const smallParsed = parseTgaHeader(small);
      expect(smallParsed.width).toBe(10);
      expect(smallParsed.height).toBe(7);
    });
  });

  // 2. UTF-8 BOM Validator & Encoder Stress
  describe('2. UTF-8 BOM Strict Forensics [0xEF, 0xBB, 0xBF]', () => {
    it('rejects truncated, corrupted, or alternative BOM headers (UTF-16, ASCII)', () => {
      // 0 bytes
      expect(hasUtf8Bom(new Uint8Array([]))).toBe(false);
      expect(validateLocalizationEncoding(new Uint8Array([])).valid).toBe(false);

      // 2 bytes
      expect(hasUtf8Bom(new Uint8Array([0xef, 0xbb]))).toBe(false);
      expect(validateLocalizationEncoding(new Uint8Array([0xef, 0xbb])).valid).toBe(false);

      // UTF-16 LE BOM [0xFF, 0xFE]
      const utf16le = new Uint8Array([0xff, 0xfe, 0x6c, 0x00]);
      expect(hasUtf8Bom(utf16le)).toBe(false);
      const val16 = validateLocalizationEncoding(utf16le);
      expect(val16.valid).toBe(false);
      expect(val16.error).toContain('0xFF, 0xFE');

      // 1 byte off: [0xEF, 0xBB, 0xBE]
      const closeBOM = new Uint8Array([0xef, 0xbb, 0xbe, 0x61]);
      expect(hasUtf8Bom(closeBOM)).toBe(false);
      expect(validateLocalizationEncoding(closeBOM).valid).toBe(false);
    });

    it('properly prepends and strips UTF-8 BOM for complex multibyte unicode texts', () => {
      const text = 'l_simp_chinese:\n MOD_KEY:0 "中华人民共和国与红旗"\n';
      const encoded = prependUtf8Bom(text);

      expect(encoded.length).toBe(3 + new TextEncoder().encode(text).length);
      expect(hasUtf8Bom(encoded)).toBe(true);

      const stripped = stripUtf8Bom(encoded);
      expect(stripped.hasBom).toBe(true);
      expect(stripped.text).toBe(text);

      // If text doesn't have BOM, strip returns hasBom: false
      const unbommed = new TextEncoder().encode(text);
      const stripped2 = stripUtf8Bom(unbommed);
      expect(stripped2.hasBom).toBe(false);
      expect(stripped2.text).toBe(text);
    });
  });

  // 3. Country Creation Wizard 10 Files / 7 Dirs Scaffolding
  describe('3. Country Creation Wizard Exhaustive Directory Verification', () => {
    it('scaffolds exactly 10 files across 7 distinct Paradox directory structures', () => {
      const config: CountryWizardConfig = {
        tag: 'NEW',
        name: 'Newland',
        adjective: 'Newlander',
        color: [200, 100, 50],
        graphicalCulture: 'asian_gfx',
        capitalProvinceId: 1234,
        stateId: 567,
        stateName: 'NewState',
        stateProvinces: [1234, 1235, 1236],
        rulingParty: 'neutrality',
        leaderName: 'John Leader',
        leaderIdeology: 'oligarchism',
      };

      const result = scaffoldCountryFiles(config);
      expect(result.files).toHaveLength(10);

      const expectedFiles = [
        'common/countries/Newland.txt',
        'common/country_tags/NEW.txt',
        'history/countries/NEW - Newland.txt',
        'history/states/567-NewState.txt',
        'gfx/flags/NEW.tga',
        'gfx/flags/medium/NEW.tga',
        'gfx/flags/small/NEW.tga',
        'common/characters/NEW.txt',
        'common/ideas/NEW.txt',
        'localisation/english/NEW_l_english.yml',
      ];

      for (const expected of expectedFiles) {
        const found = result.files.find((f) => f.path === expected);
        expect(found, `Expected file '${expected}' to be generated`).toBeDefined();
      }

      // Check directories
      expect(result.directories.length).toBeGreaterThanOrEqual(7);
      expect(result.directories).toContain('common/countries');
      expect(result.directories).toContain('common/country_tags');
      expect(result.directories).toContain('history/countries');
      expect(result.directories).toContain('history/states');
      expect(result.directories).toContain('gfx/flags');
      expect(result.directories).toContain('common/characters');
      expect(result.directories).toContain('localisation/english');

      // Check localization file is binary and contains BOM
      const locFile = result.files.find((f) => f.path === 'localisation/english/NEW_l_english.yml')!;
      expect(locFile.isBinary).toBe(true);
      const locBytes = locFile.content as Uint8Array;
      expect(hasUtf8Bom(locBytes)).toBe(true);
      expect(locBytes[0]).toBe(0xef);
      expect(locBytes[1]).toBe(0xbb);
      expect(locBytes[2]).toBe(0xbf);
    });
  });

  // 4. Token-Aware AST Symbol Refactoring Engine
  describe('4. Token-Aware AST Symbol Refactoring Stress Testing', () => {
    it('strictly preserves substring identifiers that contain the target symbol', () => {
      const code = `
        tag = GER
        GER_adolf_hitler = { ideology = fascism }
        GER_focus_tree = { id = GER_tree }
        set_country_flag = GER_flag
        flag_GER = yes
        my_GER_var = 10
        TAG_GER = "GER"
        GER = { color = { 0 0 0 } }
      `;

      // Refactor 'GER' -> 'PRU'
      const { newContent, count } = refactorSymbolInContent(code, 'GER', 'PRU');

      // GER appears as standalone token only at:
      // 1. 'tag = GER'
      // 2. '"GER"'
      // 3. 'GER = { color ... }'
      expect(count).toBe(3);

      // Verify that compound tokens are NOT corrupted
      expect(newContent).toContain('tag = PRU');
      expect(newContent).toContain('TAG_GER = "PRU"');
      expect(newContent).toContain('PRU = { color = { 0 0 0 } }');
      expect(newContent).toContain('GER_adolf_hitler');
      expect(newContent).toContain('GER_focus_tree');
      expect(newContent).toContain('set_country_flag = GER_flag');
      expect(newContent).toContain('flag_GER = yes');
      expect(newContent).toContain('my_GER_var = 10');
    });

    it('generates standard unified diff between modified versions', () => {
      const original = 'first_line = 1\nsecond_line = 2\nthird_line = 3\n';
      const modified = 'first_line = 1\nsecond_line = CHANGED\nthird_line = 3\n';
      const diff = generateUnifiedDiff('test_path.txt', original, modified);

      expect(diff).toContain('--- a/test_path.txt');
      expect(diff).toContain('+++ b/test_path.txt');
      expect(diff).toContain('@@ -2,1 +2,1 @@');
      expect(diff).toContain('-second_line = 2');
      expect(diff).toContain('+second_line = CHANGED');
    });
  });

  // 5. Balance of Power (BoP) Dynamic Tension Resolution
  describe('5. BoP Dynamic Tension Slider & Active Range Resolution', () => {
    const testBop: BopDefinition = {
      token: 'TEST_bop',
      initialValue: 0.0,
      leftSide: 'left_faction',
      rightSide: 'right_faction',
      neutralRange: {
        id: 'neutral_tier',
        min: -0.1,
        max: 0.1,
        modifiers: { neutral_stability: 0.05 },
      },
      sides: [
        {
          id: 'left_faction',
          name: 'Left Faction',
          ranges: [
            { id: 'left_extreme', min: -1.0, max: -0.6, modifiers: { left_power: 0.3 } },
            { id: 'left_moderate', min: -0.6, max: -0.1, modifiers: { left_power: 0.1 } },
          ],
        },
        {
          id: 'right_faction',
          name: 'Right Faction',
          ranges: [
            { id: 'right_moderate', min: 0.1, max: 0.6, modifiers: { right_power: 0.1 } },
            { id: 'right_extreme', min: 0.6, max: 1.0, modifiers: { right_power: 0.3 } },
          ],
        },
      ],
    };

    it('correctly maps every segment of the tension slider [-1.0, 1.0]', () => {
      // Exactly at -1.0 (left extreme)
      expect(getActiveBopModifiers(testBop, -1.0).activeRangeId).toBe('left_extreme');
      expect(getActiveBopModifiers(testBop, -0.7).activeRangeId).toBe('left_extreme');

      // Left moderate
      expect(getActiveBopModifiers(testBop, -0.3).activeRangeId).toBe('left_moderate');

      // Neutral range around 0
      expect(getActiveBopModifiers(testBop, -0.05).activeRangeId).toBe('neutral_tier');
      expect(getActiveBopModifiers(testBop, 0.0).activeRangeId).toBe('neutral_tier');
      expect(getActiveBopModifiers(testBop, 0.05).activeRangeId).toBe('neutral_tier');

      // Right moderate
      expect(getActiveBopModifiers(testBop, 0.3).activeRangeId).toBe('right_moderate');

      // Right extreme
      expect(getActiveBopModifiers(testBop, 0.8).activeRangeId).toBe('right_extreme');
      expect(getActiveBopModifiers(testBop, 1.0).activeRangeId).toBe('right_extreme');
    });
  });

  // 6. Character & Leader Generator Multi-Role Coverage
  describe('6. Character Script Multi-Role Generator Coverage', () => {
    it('generates multi-role character combining leader, advisor, and navy captain', () => {
      const char: CharacterDef = {
        token: 'TEST_admiral_king',
        name: 'Ernest J. King',
        gender: 'male',
        portraits: { civilianLarge: 'GFX_king_civ', armyLarge: 'GFX_king_navy' },
        navyLeader: {
          skill: 5,
          attack: 5,
          defense: 3,
          maneuvering: 4,
          coordination: 5,
          traits: ['cruiser_captain', 'seawolf', 'ironside'],
        },
        advisor: {
          slot: 'navy_chief',
          cost: 150,
          traits: ['decisive_battle_theorist'],
          aiWillDo: 2.0,
        },
      };

      const script = generateCharacterScript([char]);
      expect(script).toContain('TEST_admiral_king = {');
      expect(script).toContain('name = "Ernest J. King"');
      expect(script).toContain('navy_leader = {');
      expect(script).toContain('skill = 5');
      expect(script).toContain('cruiser_captain seawolf ironside');
      expect(script).toContain('advisor = {');
      expect(script).toContain('slot = navy_chief');
      expect(script).toContain('decisive_battle_theorist');
      expect(script).toContain('ai_will_do = { base = 2.0 }');
    });
  });
});
