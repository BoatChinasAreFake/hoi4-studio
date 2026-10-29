import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseDefinitionCsv } from './helpers/mapDefinitionParser'
import { parseStateFile, validateStateProvinceSync } from './helpers/stateProvinceSync'
import { parseIdeologies } from './helpers/ideologyParser'
import { hasUtf8Bom, stripUtf8Bom, validateLocalizationEncoding } from './helpers/utf8Bom'
import { SupplyNetworkGraph } from './helpers/supplyNetworkBfs'

const VANILLA_DIR = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Hearts of Iron IV'

describe('Tier 4: Real-World Vanilla Fixture Validation', () => {
  const isVanillaAvailable = fs.existsSync(VANILLA_DIR)

  it('confirms the vanilla HOI4 installation is present at reference path', () => {
    expect(isVanillaAvailable).toBe(true)
  })

  describe('1. Vanilla map/definition.csv parsing and mathematical uniqueness', () => {
    it('parses all 13,414 vanilla province definitions and proves zero duplicate RGBs', () => {
      const defPath = path.join(VANILLA_DIR, 'map', 'definition.csv')
      expect(fs.existsSync(defPath)).toBe(true)

      const content = fs.readFileSync(defPath, 'utf-8')
      const result = parseDefinitionCsv(content)

      // Total provinces
      expect(result.provinces.length).toBeGreaterThan(13000)

      // Zero duplicate RGB triplets across the entire base game
      expect(result.duplicateRgbs).toHaveLength(0)

      // Province 0 (Void / Ocean separator)
      const p0 = result.idMap.get(0)!
      expect(p0).toBeDefined()
      expect(p0.red).toBe(0)
      expect(p0.green).toBe(0)
      expect(p0.blue).toBe(0)
      expect(p0.type).toBe('land')

      // Province 1 (Lake)
      const p1 = result.idMap.get(1)!
      expect(p1).toBeDefined()
      expect(p1.red).toBe(230)
      expect(p1.green).toBe(81)
      expect(p1.blue).toBe(119)
      expect(p1.type).toBe('lake')
      expect(p1.terrain).toBe('lakes')
    })
  })

  describe('2. Vanilla history/states/1-France.txt fixture inspection', () => {
    it('parses Corsica (State 1) and validates all assigned provinces against definition.csv', () => {
      const statePath = path.join(VANILLA_DIR, 'history', 'states', '1-France.txt')
      expect(fs.existsSync(statePath)).toBe(true)

      const stateContent = fs.readFileSync(statePath, 'utf-8')
      const state = parseStateFile(stateContent)
      expect(state).not.toBeNull()
      expect(state?.id).toBe(1)
      expect(state?.name).toBe('STATE_1')
      expect(state?.manpower).toBe(322900)
      expect(state?.category).toBe('town')
      expect(state?.owner).toBe('FRA')

      // Corsica provinces: 3838 (Ajaccio/Bastia), 9851, 11804
      expect(state?.provinces).toEqual([3838, 9851, 11804])

      // Victory points: 3838 has 1 VP
      expect(state?.victoryPoints).toEqual([{ provinceId: 3838, points: 1 }])

      // Validate against definition.csv
      const defContent = fs.readFileSync(path.join(VANILLA_DIR, 'map', 'definition.csv'), 'utf-8')
      const defResult = parseDefinitionCsv(defContent)

      const syncResult = validateStateProvinceSync([state!], defResult.idMap)
      expect(syncResult.valid).toBe(true)
      expect(syncResult.unknownProvincesInStates).toHaveLength(0)
      expect(syncResult.invalidVictoryPoints).toHaveLength(0)
    })
  })

  describe('3. Vanilla common/ideologies/00_ideologies.txt schema validation', () => {
    it('parses the four core ideology groups and extracts sub-ideology tokens and RGB colors', () => {
      const ideoPath = path.join(VANILLA_DIR, 'common', 'ideologies', '00_ideologies.txt')
      expect(fs.existsSync(ideoPath)).toBe(true)

      const content = fs.readFileSync(ideoPath, 'utf-8')
      const { ideologies, errors } = parseIdeologies(content)

      expect(errors).toHaveLength(0)

      // Democratic
      const dem = ideologies.democratic
      expect(dem).toBeDefined()
      expect(dem.subTypes).toContain('conservatism')
      expect(dem.subTypes).toContain('liberalism')
      expect(dem.subTypes).toContain('socialism')
      expect(dem.color).toEqual([0, 0, 255])
      expect(dem.rules?.can_puppet).toBe(false)

      // Communism
      const com = ideologies.communism
      expect(com).toBeDefined()
      expect(com.subTypes).toContain('marxism')
      expect(com.subTypes).toContain('leninism')
      expect(com.subTypes).toContain('stalinism')
      expect(com.color).toEqual([255, 0, 0])
      expect(com.rules?.can_puppet).toBe(true)

      // Fascism
      const fas = ideologies.fascism
      expect(fas).toBeDefined()
      expect(fas.subTypes).toContain('nazism')
      expect(fas.subTypes).toContain('fascism_ideology')
      expect(fas.color).toEqual([150, 75, 0])

      // Neutrality
      const neu = ideologies.neutrality
      expect(neu).toBeDefined()
      expect(neu.subTypes).toContain('despotism')
      expect(neu.subTypes).toContain('oligarchism')
      expect(neu.color).toEqual([124, 124, 124])
    })
  })

  describe('4. Vanilla localisation UTF-8 BOM byte sequence [0xEF, 0xBB, 0xBF]', () => {
    it('verifies exact UTF-8 BOM on localisation/english/countries_l_english.yml and parses keys', () => {
      const locPath = path.join(VANILLA_DIR, 'localisation', 'english', 'countries_l_english.yml')
      expect(fs.existsSync(locPath)).toBe(true)

      const rawBytes = fs.readFileSync(locPath)
      const byteArr = new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength)

      // Verify mandatory BOM header
      expect(hasUtf8Bom(byteArr)).toBe(true)
      expect(byteArr[0]).toBe(0xEF)
      expect(byteArr[1]).toBe(0xBB)
      expect(byteArr[2]).toBe(0xBF)

      const validation = validateLocalizationEncoding(byteArr)
      expect(validation.valid).toBe(true)

      // Decode and check country name keys
      const { text } = stripUtf8Bom(byteArr)
      expect(text).toContain('l_english:')
      expect(text).toContain('FRA: "France"')
      expect(text).toContain('ENG_democratic: "United Kingdom"')
      expect(text).toContain('GER_fascism: "German Reich"')
    })
  })

  describe('5. Vanilla railways.txt and supply_nodes.txt network connectivity', () => {
    it('parses the entire vanilla railway network and validates supply graph connectivity from Berlin (Prov 6521)', () => {
      const railPath = path.join(VANILLA_DIR, 'map', 'railways.txt')
      const nodePath = path.join(VANILLA_DIR, 'map', 'supply_nodes.txt')

      expect(fs.existsSync(railPath)).toBe(true)
      expect(fs.existsSync(nodePath)).toBe(true)

      const railContent = fs.readFileSync(railPath, 'utf-8')
      const nodeContent = fs.readFileSync(nodePath, 'utf-8')

      const graph = new SupplyNetworkGraph()
      const railResult = graph.parseRailways(railContent)
      const nodeResult = graph.parseSupplyNodes(nodeContent)

      // Vanilla railways: ~910 lines
      expect(railResult.lines.length).toBeGreaterThan(800)
      expect(railResult.errors).toHaveLength(0)

      // Vanilla supply nodes: ~728 nodes
      expect(nodeResult.nodes.length).toBeGreaterThan(700)
      expect(nodeResult.errors).toHaveLength(0)

      // Test BFS reachability from Berlin (province 6521)
      const supplyCheck = graph.validateConnectivityFromCapital(6521)
      expect(supplyCheck.connectedHubs.length).toBeGreaterThan(100)

      // Check path from Berlin to neighboring capital/hub, e.g. province connected to Berlin
      const berlinHub = graph.getSupplyHub(6521)
      if (berlinHub) {
        expect(supplyCheck.connectedHubs).toContain(6521)
      }
    })
  })
})
