import { describe, it, expect } from 'vitest'
import { parseDefinitionCsv } from './helpers/mapDefinitionParser'
import { RiverGrid, validateRiverBitmap, RIVER_COLORS } from './helpers/riverValidator'
import { validateStateProvinceSync, type StateFileDef } from './helpers/stateProvinceSync'
import { hasUtf8Bom, validateLocalizationEncoding, prependUtf8Bom, stripUtf8Bom } from './helpers/utf8Bom'
import { validateFlagTga, createTgaBuffer } from './helpers/tgaValidator'
import { calculateDivisionStats } from './helpers/divisionMath'
import { parseBopScript } from './helpers/bopParser'

describe('Tier 2: Boundary & Corner Cases', () => {
  describe('1. Empty province lists', () => {
    it('flags state with empty provinces array as invalid state configuration', () => {
      const emptyState: StateFileDef = {
        id: 99,
        name: 'STATE_99',
        manpower: 1000,
        category: 'rural',
        owner: 'TAG',
        victoryPoints: [],
        provinces: [], // Empty!
      }

      const syncResult = validateStateProvinceSync([emptyState], new Map())
      expect(syncResult.valid).toBe(false)
      expect(syncResult.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('empty province list'),
        ])
      )
    })
  })

  describe('2. Duplicate RGBs in map definition', () => {
    it('detects duplicate RGB color triplets assigned to different provinces as fatal collision', () => {
      const csvWithDupes = [
        '0;0;0;0;land;false;unknown;0',
        '1;100;150;200;land;false;plains;1',
        '2;100;150;200;land;false;hills;1', // Duplicate RGB of prov 1
        '3;50;50;50;sea;true;ocean;0',
      ].join('\n')

      const result = parseDefinitionCsv(csvWithDupes)

      expect(result.duplicateRgbs).toHaveLength(1)
      expect(result.duplicateRgbs[0].rgb).toBe('100,150,200')
      expect(result.duplicateRgbs[0].provinceIds).toEqual([1, 2])
      expect(result.errors.some(e => e.code === 'DUPLICATE_RGB')).toBe(true)
    })
  })

  describe('3. Illegal river 2x2 blocks (bottlenecks causing CTD)', () => {
    it('detects every 2x2 contiguous river pixel block and reports precise coordinates', () => {
      const grid = new RiverGrid(6, 6)
      // Source at (1, 1)
      grid.setPixel(1, 1, RIVER_COLORS.SOURCE)
      grid.setPixel(1, 2, RIVER_COLORS.TIER_1)

      // Create a 2x2 solid block of river pixels at (2, 2), (3, 2), (2, 3), (3, 3)
      grid.setPixel(2, 2, RIVER_COLORS.TIER_2)
      grid.setPixel(3, 2, RIVER_COLORS.TIER_2)
      grid.setPixel(2, 3, RIVER_COLORS.TIER_2)
      grid.setPixel(3, 3, RIVER_COLORS.TIER_2)

      // Mouth at (4, 4)
      grid.setPixel(4, 4, RIVER_COLORS.MOUTH)

      const result = validateRiverBitmap(grid)

      expect(result.valid).toBe(false)
      expect(result.twoByTwoBlocks).toHaveLength(1)
      expect(result.twoByTwoBlocks[0]).toEqual({ x: 2, y: 2 })
      expect(result.errors.some(e => e.includes('illegal 2x2 river block'))).toBe(true)
    })
  })

  describe('4. Missing green source or red mouth', () => {
    it('rejects river branch missing a green source (0, 255, 0)', () => {
      const grid = new RiverGrid(5, 5)
      // Only blue flow pixels and mouth, missing source!
      grid.setPixel(1, 1, RIVER_COLORS.TIER_1)
      grid.setPixel(1, 2, RIVER_COLORS.TIER_2)
      grid.setPixel(1, 3, RIVER_COLORS.MOUTH)

      const result = validateRiverBitmap(grid)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('River network has no source pixel (0, 255, 0).')
    })

    it('rejects river branch missing a red mouth (255, 0, 0)', () => {
      const grid = new RiverGrid(5, 5)
      // Only source and flow pixels, dead end without mouth!
      grid.setPixel(1, 1, RIVER_COLORS.SOURCE)
      grid.setPixel(1, 2, RIVER_COLORS.TIER_1)
      grid.setPixel(1, 3, RIVER_COLORS.TIER_2)

      const result = validateRiverBitmap(grid)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('River network has no mouth pixel (255, 0, 0).')
    })
  })

  describe('5. UTF-8 BOM validation [0xEF, 0xBB, 0xBF]', () => {
    it('detects missing UTF-8 BOM in localisation files and outputs diagnostic error', () => {
      const plainUtf8 = new TextEncoder().encode('l_english:\n TAG:0 "Sample"\n')
      expect(hasUtf8Bom(plainUtf8)).toBe(false)

      const validation = validateLocalizationEncoding(plainUtf8)
      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('Missing mandatory UTF-8 BOM prefix [0xEF, 0xBB, 0xBF]')
    })

    it('rejects UTF-16 BE/LE BOMs as invalid Paradox encoding', () => {
      // UTF-16 LE BOM is [0xFF, 0xFE]
      const utf16le = new Uint8Array([0xFF, 0xFE, 0x6C, 0x00])
      const validation = validateLocalizationEncoding(utf16le)
      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('0xFF, 0xFE')
    })
  })

  describe('6. Flag TGA boundary dimensions', () => {
    it('rejects TGAs with non-standard dimensions or non-32bpp bit depth', () => {
      // Create a 80x50 image instead of 82x52
      const invalidSizeBuf = createTgaBuffer(80, 50)
      const res1 = validateFlagTga(invalidSizeBuf, 'standard')
      expect(res1.valid).toBe(false)
      expect(res1.error).toContain('expected 82x52, got 80x50')

      // Create a 24bpp buffer
      const buf24 = createTgaBuffer(82, 52)
      buf24[16] = 24 // mutate bpp byte
      const res2 = validateFlagTga(buf24, 'standard')
      expect(res2.valid).toBe(false)
      expect(res2.error).toContain('expected 32 bpp')
    })
  })

  describe('7. Adversarial encoding and character set integrity', () => {
    it('preserves diacritics, Cyrillic, CJK glyphs, and quotes without corruption through BOM pipeline', () => {
      const multilingualLoc = [
        'l_english:',
        ' STATE_1:0 "Région de l\'Île-de-France"',
        ' STATE_2:0 "München und Nürnberg"',
        ' STATE_3:0 "Москва и Санкт-Петербург"',
        ' STATE_4:0 "東京都 & 京都府"',
        ' STATE_5:0 "Special: \\"Quoted\\" & \\\\Escaped\\\\"',
      ].join('\n')

      const encoded = prependUtf8Bom(multilingualLoc)
      expect(hasUtf8Bom(encoded)).toBe(true)

      const validation = validateLocalizationEncoding(encoded)
      expect(validation.valid).toBe(true)

      const { text } = stripUtf8Bom(encoded)
      expect(text).toBe(multilingualLoc)
      expect(text).toContain('Région de l\'Île-de-France')
      expect(text).toContain('Москва и Санкт-Петербург')
      expect(text).toContain('東京都 & 京都府')
    })
  })

  describe('8. Adversarial malformed inputs and invalid combinations', () => {
    it('gracefully flags malformed definition CSV with non-numeric RGB and invalid column count', () => {
      const malformedCsv = [
        'not_a_number;0;0;0;land;false;unknown;0',
        '1;256;-5;not_a_color;land;false;plains;1',
        '2;100;100;100;invalid_type;false;plains;1',
        '3;100;100;101;land;not_a_bool;plains;1',
        'too;few;columns',
      ].join('\n')

      const result = parseDefinitionCsv(malformedCsv)
      expect(result.errors.length).toBeGreaterThanOrEqual(4)
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true)
      expect(result.errors.some(e => e.code === 'INVALID_RGB')).toBe(true)
      expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true)
      expect(result.errors.some(e => e.code === 'INVALID_COASTAL')).toBe(true)
    })

    it('flags BoP with out-of-order range bounds (min >= max)', () => {
      const invertedBop = `
        bop_token = {
          initial_value = 0.0
          left_side = left
          right_side = right
          range = {
            id = broken_range
            min = 0.5
            max = -0.5
          }
        }
      `
      const result = parseBopScript(invertedBop)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('min (0.5) >= max (-0.5)'))).toBe(true)
    })

    it('returns zeroes and handles completely empty division template without NaN or crash', () => {
      const emptyDivision = {
        name: 'Empty Ghost Division',
        grid: [
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
          [null, null, null, null, null],
        ],
        supportCompanies: [null, null, null, null, null],
      }

      const stats = calculateDivisionStats(emptyDivision)
      expect(stats.combatWidth).toBe(0)
      expect(stats.manpower).toBe(0)
      expect(stats.maxHp).toBe(0)
      expect(stats.organization).toBe(0)
      expect(stats.softAttack).toBe(0)
      expect(stats.maximumSpeed).toBe(0)
      expect(isNaN(stats.organization)).toBe(false)
    })
  })
})

