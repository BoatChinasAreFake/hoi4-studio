import { describe, it, expect } from 'vitest'
import { parseDefinitionCsv } from './helpers/mapDefinitionParser'
import { RiverGrid, validateRiverBitmap, RIVER_COLORS } from './helpers/riverValidator'
import { scaffoldCountryFiles } from './helpers/countryWizard'
import { validateSuperEvent, generateSuperEventScript } from './helpers/superEventSchema'
import { parseBopScript } from './helpers/bopParser'
import { parseCharactersFile } from './helpers/characterParser'
import { calculateDivisionStats, type BattalionStats, type DivisionTemplate } from './helpers/divisionMath'
import { GfxTagIndexer } from './helpers/gfxIndexer'
import { createTgaBuffer, validateFlagTga } from './helpers/tgaValidator'

describe('Tier 1: Feature Coverage', () => {
  describe('1. Map definition CSV parsing', () => {
    it('successfully parses valid definition CSV rows into typed province objects', () => {
      const csv = [
        '0;0;0;0;land;false;unknown;0',
        '1;230;81;119;lake;false;lakes;7',
        '2;0;0;55;land;false;forest;1',
        '3;0;0;205;land;false;forest;1',
        '4;0;0;232;sea;true;ocean;0',
      ].join('\n')

      const result = parseDefinitionCsv(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.provinces).toHaveLength(5)
      expect(result.duplicateRgbs).toHaveLength(0)

      const p0 = result.idMap.get(0)!
      expect(p0).toBeDefined()
      expect(p0.type).toBe('land')
      expect(p0.coastal).toBe(false)
      expect(p0.terrain).toBe('unknown')

      const p4 = result.idMap.get(4)!
      expect(p4).toBeDefined()
      expect(p4.type).toBe('sea')
      expect(p4.coastal).toBe(true)
      expect(p4.terrain).toBe('ocean')
      expect(p4.continent).toBe(0)
    })
  })

  describe('2. River 1px connectivity check', () => {
    it('validates a continuous 1px river line from green source to red mouth without bottlenecks', () => {
      // 10x10 river grid
      const grid = new RiverGrid(10, 10)

      // Continuous 1px path from (1, 1) down to (1, 8)
      // Source at (1, 1)
      grid.setPixel(1, 1, RIVER_COLORS.SOURCE)
      // Body pixels
      grid.setPixel(1, 2, RIVER_COLORS.TIER_1)
      grid.setPixel(1, 3, RIVER_COLORS.TIER_1)
      grid.setPixel(1, 4, RIVER_COLORS.TIER_2)
      grid.setPixel(1, 5, RIVER_COLORS.TIER_2)
      grid.setPixel(1, 6, RIVER_COLORS.TIER_3)
      grid.setPixel(1, 7, RIVER_COLORS.TIER_3)
      // Mouth at (1, 8)
      grid.setPixel(1, 8, RIVER_COLORS.MOUTH)

      const result = validateRiverBitmap(grid)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sources).toHaveLength(1)
      expect(result.mouths).toHaveLength(1)
      expect(result.twoByTwoBlocks).toHaveLength(0)
      expect(result.connectedBranches).toBe(1)
      expect(result.orphanedPixels).toHaveLength(0)
    })
  })

  describe('3. Country wizard file generator', () => {
    it('scaffolds exactly 10 required files across 7 distinct directory trees', () => {
      const config = {
        tag: 'BOR',
        name: 'Borduria',
        adjective: 'Bordurian',
        color: [140, 30, 45] as [number, number, number],
        graphicalCulture: 'eastern_european_gfx',
        capitalProvinceId: 450,
        stateId: 999,
        stateName: 'Szohod',
        stateProvinces: [450, 451, 452],
        rulingParty: 'fascism' as const,
        leaderName: 'Kurvi-Tasch',
        leaderIdeology: 'fascism_ideology',
      }

      const result = scaffoldCountryFiles(config)

      expect(result.tag).toBe('BOR')
      expect(result.files).toHaveLength(10)

      const expectedPaths = [
        'common/countries/Borduria.txt',
        'common/country_tags/BOR.txt',
        'history/countries/BOR - Borduria.txt',
        'history/states/999-Szohod.txt',
        'gfx/flags/BOR.tga',
        'gfx/flags/medium/BOR.tga',
        'gfx/flags/small/BOR.tga',
        'common/characters/BOR.txt',
        'common/ideas/BOR.txt',
        'localisation/english/BOR_l_english.yml',
      ]

      const actualPaths = result.files.map(f => f.path)
      for (const exp of expectedPaths) {
        expect(actualPaths).toContain(exp)
      }

      // Check directories count (7 distinct directories: common/countries, common/country_tags, history/countries, history/states, gfx/flags, common/characters, common/ideas, localisation/english)
      expect(result.directories.length).toBeGreaterThanOrEqual(7)

      // Content verification
      const tagFile = result.files.find(f => f.path === 'common/country_tags/BOR.txt')!
      expect(typeof tagFile.content).toBe('string')
      expect((tagFile.content as string).trim()).toBe('BOR = "countries/Borduria.txt"')

      const countryFile = result.files.find(f => f.path === 'common/countries/Borduria.txt')!
      expect((countryFile.content as string)).toContain('color = { 140 30 45 }')
    })
  })

  describe('4. Super Event schema', () => {
    it('validates super event payload schema and generates executable Clausewitz event code', () => {
      const validEvent = {
        id: 'super_event_fall_of_paris',
        titleLocKey: 'SUPER_EVENT_FALL_OF_PARIS_TITLE',
        descLocKey: 'SUPER_EVENT_FALL_OF_PARIS_DESC',
        buttonLocKey: 'SUPER_EVENT_FALL_OF_PARIS_BTN',
        bannerSprite: 'GFX_super_event_fall_of_paris',
        soundEffect: 'fall_of_paris_anthem',
        fireOnlyOnce: true,
        effect: 'news_event = { id = news.1 hours = 6 }',
      }

      const validation = validateSuperEvent(validEvent)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      const code = generateSuperEventScript(validEvent)
      expect(code).toContain('country_event = {')
      expect(code).toContain('id = super_event_fall_of_paris')
      expect(code).toContain('picture = GFX_super_event_fall_of_paris')
      expect(code).toContain('play_sound = "fall_of_paris_anthem"')
      expect(code).toContain('fire_only_once = yes')
    })
  })

  describe('5. Balance of Power (BoP) parser', () => {
    it('correctly parses initial value, sides, and contiguous ranges', () => {
      const bopScript = `
        ITA_balance_of_power = {
          initial_value = 0.15
          left_side = grand_council_side
          right_side = mussolini_side
          decision_category = ITA_bop_category

          range = {
            id = neutral_range
            min = -0.2
            max = 0.2
          }

          side = {
            id = grand_council_side
            icon = GFX_bop_ITA_council
            range = {
              id = council_dominant
              min = -1.0
              max = -0.2
            }
          }

          side = {
            id = mussolini_side
            icon = GFX_bop_ITA_duce
            range = {
              id = duce_dominant
              min = 0.2
              max = 1.0
            }
          }
        }
      `

      const result = parseBopScript(bopScript)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)

      const bop = result.bop!
      expect(bop.token).toBe('ITA_balance_of_power')
      expect(bop.initialValue).toBe(0.15)
      expect(bop.leftSide).toBe('grand_council_side')
      expect(bop.rightSide).toBe('mussolini_side')
      expect(bop.sides).toHaveLength(2)
      expect(bop.sides[0].ranges[0].min).toBe(-1.0)
      expect(bop.sides[0].ranges[0].max).toBe(-0.2)
    })
  })

  describe('6. Character parser', () => {
    it('parses character with multiple roles: country leader, corps commander, and advisor', () => {
      const charScript = `
        characters = {
          FRA_charles_de_gaulle = {
            name = "Charles de Gaulle"
            portraits = {
              civilian = {
                large = "GFX_portrait_de_gaulle_civ"
                small = "GFX_portrait_de_gaulle_civ_small"
              }
              army = {
                large = "GFX_portrait_de_gaulle_army"
                small = "GFX_portrait_de_gaulle_army_small"
              }
            }
            country_leader = {
              ideology = democratic_socialism
              expire = "1970.1.1"
              traits = { staunch_monarchist }
            }
            corps_commander = {
              skill = 4
              attack_skill = 4
              defense_skill = 3
              planning_skill = 4
              logistics_skill = 3
              traits = { armor_officer panzer_leader }
            }
            advisor = {
              slot = political_advisor
              idea_token = FRA_de_gaulle_advisor
              traits = { military_theorist }
            }
          }
        }
      `

      const { characters, errors } = parseCharactersFile(charScript)
      expect(errors).toHaveLength(0)
      expect(characters).toHaveLength(1)

      const cdg = characters[0]
      expect(cdg.token).toBe('FRA_charles_de_gaulle')
      expect(cdg.name).toBe('Charles de Gaulle')
      expect(cdg.portraits.armyLarge).toBe('GFX_portrait_de_gaulle_army')

      expect(cdg.countryLeader).toBeDefined()
      expect(cdg.countryLeader?.ideology).toBe('democratic_socialism')

      expect(cdg.corpsCommander).toBeDefined()
      expect(cdg.corpsCommander?.skill).toBe(4)
      expect(cdg.corpsCommander?.traits).toContain('panzer_leader')

      expect(cdg.advisor).toBeDefined()
      expect(cdg.advisor?.traits).toContain('military_theorist')
    })
  })

  describe('7. Division template math', () => {
    it('computes accurate composite stats for 9-infantry + 1-artillery + engineer support template', () => {
      const infBattalion: BattalionStats = {
        id: 'infantry',
        name: 'Infantry',
        combatWidth: 2,
        manpower: 1000,
        maxHp: 25,
        organization: 50,
        softAttack: 6,
        hardAttack: 1,
        defense: 22,
        breakthrough: 3,
        armor: 0,
        piercing: 4,
        maximumSpeed: 4.0,
        supplyConsumption: 0.07,
        trainingTime: 90,
      }

      const artBattalion: BattalionStats = {
        id: 'artillery',
        name: 'Artillery',
        combatWidth: 3,
        manpower: 500,
        maxHp: 0.6,
        organization: 0,
        softAttack: 25,
        hardAttack: 2,
        defense: 10,
        breakthrough: 6,
        armor: 0,
        piercing: 5,
        maximumSpeed: 4.0,
        supplyConsumption: 0.2,
        trainingTime: 120,
      }

      const engineerSupport: BattalionStats = {
        id: 'engineer',
        name: 'Engineer Company',
        isSupport: true,
        combatWidth: 0, // Support companies do not consume combat width
        manpower: 300,
        maxHp: 2,
        organization: 20,
        softAttack: 2,
        hardAttack: 1,
        defense: 15,
        breakthrough: 5,
        armor: 0,
        piercing: 4,
        maximumSpeed: 4.0,
        supplyConsumption: 0.02,
        trainingTime: 120,
      }

      // 9 inf + 1 art = 10 combat battalions
      // 9 * 2 + 1 * 3 = 21 combat width
      const grid: Array<Array<BattalionStats | null>> = [
        [infBattalion, infBattalion, infBattalion, null, null],
        [infBattalion, infBattalion, infBattalion, null, null],
        [infBattalion, infBattalion, infBattalion, null, null],
        [artBattalion, null, null, null, null],
        [null, null, null, null, null],
      ]

      const template: DivisionTemplate = {
        name: '9/1 Standard Division',
        grid,
        supportCompanies: [engineerSupport, null, null, null, null],
      }

      const stats = calculateDivisionStats(template)

      expect(stats.totalBattalions).toBe(10)
      expect(stats.totalSupportCompanies).toBe(1)
      expect(stats.combatWidth).toBe(21) // 9*2 + 1*3 = 21
      expect(stats.manpower).toBe(9 * 1000 + 500 + 300) // 9800
      expect(stats.softAttack).toBe(9 * 6 + 25 + 2) // 54 + 25 + 2 = 81
      expect(stats.hardAttack).toBe(9 * 1 + 2 + 1) // 12
      expect(stats.maximumSpeed).toBe(4.0)
      expect(stats.trainingTime).toBe(120)
    })
  })

  describe('8. GFX tag indexer', () => {
    it('indexes sprite types, builds reverse texture lookup, and filters by semantic tags', () => {
      const gfxScript = `
        spriteTypes = {
          spriteType = {
            name = "GFX_goal_generic_production"
            texturefile = "gfx/interface/goals/goal_generic_production.dds"
          }
          spriteType = {
            name = "GFX_goal_generic_production_copy"
            texturefile = "gfx/interface/goals/goal_generic_production.dds"
          }
          spriteType = {
            name = "GFX_idea_air_superiority"
            texturefile = "gfx/interface/ideas/idea_air.dds"
          }
          spriteType = {
            name = "GFX_trait_panzer_leader"
            texturefile = "gfx/interface/traits/trait_panzer.dds"
          }
        }
      `

      const indexer = new GfxTagIndexer()
      const parseSummary = indexer.parseGfxScript(gfxScript)

      expect(parseSummary.indexedCount).toBe(4)
      expect(parseSummary.duplicates).toHaveLength(0)

      // Direct lookup
      const sprite = indexer.getSprite('GFX_goal_generic_production')
      expect(sprite).toBeDefined()
      expect(sprite?.texturefile).toBe('gfx/interface/goals/goal_generic_production.dds')

      // Reverse lookup: two sprite tags share the same texture file
      const sharedSprites = indexer.getSpritesByTexture('gfx/interface/goals/goal_generic_production.dds')
      expect(sharedSprites).toHaveLength(2)
      expect(sharedSprites).toContain('GFX_goal_generic_production')
      expect(sharedSprites).toContain('GFX_goal_generic_production_copy')

      // Tag filtering
      const focusSprites = indexer.searchByTag('focus')
      expect(focusSprites).toHaveLength(2)

      const ideaSprites = indexer.searchByTag('idea')
      expect(ideaSprites).toHaveLength(1)
      expect(ideaSprites[0].name).toBe('GFX_idea_air_superiority')
    })
  })

  describe('9. Flag TGA dimensions', () => {
    it('creates and verifies 32-bit uncompressed TGAs for Standard (82x52), Medium (41x26), and Small (10x7)', () => {
      const redColor: [number, number, number] = [220, 10, 10]

      const stdBuf = createTgaBuffer(82, 52, redColor)
      const stdRes = validateFlagTga(stdBuf, 'standard')
      expect(stdRes.valid).toBe(true)
      expect(stdRes.info?.width).toBe(82)
      expect(stdRes.info?.height).toBe(52)
      expect(stdRes.info?.bpp).toBe(32)
      expect(stdRes.info?.isUncompressedTrueColor).toBe(true)

      const medBuf = createTgaBuffer(41, 26, redColor)
      const medRes = validateFlagTga(medBuf, 'medium')
      expect(medRes.valid).toBe(true)
      expect(medRes.info?.width).toBe(41)
      expect(medRes.info?.height).toBe(26)
      expect(medRes.info?.bpp).toBe(32)

      const smlBuf = createTgaBuffer(10, 7, redColor)
      const smlRes = validateFlagTga(smlBuf, 'small')
      expect(smlRes.valid).toBe(true)
      expect(smlRes.info?.width).toBe(10)
      expect(smlRes.info?.height).toBe(7)
      expect(smlRes.info?.bpp).toBe(32)
    })
  })
})
