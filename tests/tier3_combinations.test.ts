import { describe, it, expect } from 'vitest'
import { SupplyNetworkGraph } from './helpers/supplyNetworkBfs'
import {
  validateStateProvinceSync,
  reassignProvince,
  type StateFileDef,
} from './helpers/stateProvinceSync'
import type { ProvinceDefinition } from './helpers/mapDefinitionParser'

describe('Tier 3: Cross-Feature Combinations', () => {
  describe('1. Supply network BFS graph validation against railways.txt and supply_nodes.txt', () => {
    it('verifies unbroken connectivity from capital province to all reachable supply hubs', () => {
      const graph = new SupplyNetworkGraph()

      // Railways:
      // Level 3 from Capital 100 -> 101 -> 102
      // Level 2 from 102 -> 103 -> 104
      const railwaysTxt = [
        '3 3 100 101 102',
        '2 3 102 103 104',
      ].join('\n')

      // Supply nodes placed at 102 and 104
      const nodesTxt = [
        '1 102',
        '2 104',
      ].join('\n')

      const railParse = graph.parseRailways(railwaysTxt)
      expect(railParse.errors).toHaveLength(0)

      const nodeParse = graph.parseSupplyNodes(nodesTxt)
      expect(nodeParse.errors).toHaveLength(0)

      const result = graph.validateConnectivityFromCapital(100)

      expect(result.allHubsCount).toBe(2)
      expect(result.isFullyConnected).toBe(true)
      expect(result.connectedHubs).toEqual(expect.arrayContaining([102, 104]))
      expect(result.disconnectedHubs).toHaveLength(0)

      // Shortest path reconstruction
      const pathTo104 = result.shortestPathToHub?.(104)
      expect(pathTo104).toEqual([100, 101, 102, 103, 104])
    })

    it('identifies disconnected/isolated supply nodes due to broken railway links', () => {
      const graph = new SupplyNetworkGraph()

      // Capital network: 100 -> 101 (hub at 101)
      // Disconnected island: 200 -> 201 (hub at 201)
      const railwaysTxt = [
        '2 2 100 101',
        '1 2 200 201',
      ].join('\n')

      const nodesTxt = [
        '1 101',
        '1 201',
      ].join('\n')

      graph.parseRailways(railwaysTxt)
      graph.parseSupplyNodes(nodesTxt)

      const result = graph.validateConnectivityFromCapital(100)

      expect(result.allHubsCount).toBe(2)
      expect(result.isFullyConnected).toBe(false)
      expect(result.connectedHubs).toEqual([101])
      expect(result.disconnectedHubs).toEqual([201])

      // Path to disconnected hub returns null
      expect(result.shortestPathToHub?.(201)).toBeNull()
    })
  })

  describe('2. State reassignment vs province definition synchronization', () => {
    it('migrates a province between two states, preserves definition invariants, and prevents double-assignment', () => {
      // Mock definition map
      const mockDefinitions = new Map<number, ProvinceDefinition>([
        [10, { id: 10, red: 10, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'plains', continent: 1 }],
        [11, { id: 11, red: 11, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'forest', continent: 1 }],
        [12, { id: 12, red: 12, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'hills', continent: 1 }],
        [20, { id: 20, red: 20, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'plains', continent: 1 }],
        [21, { id: 21, red: 21, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'mountain', continent: 1 }],
      ])

      const stateA: StateFileDef = {
        id: 1,
        name: 'STATE_A',
        manpower: 100000,
        category: 'town',
        owner: 'FRA',
        victoryPoints: [{ provinceId: 10, points: 5 }, { provinceId: 11, points: 1 }],
        provinces: [10, 11, 12],
      }

      const stateB: StateFileDef = {
        id: 2,
        name: 'STATE_B',
        manpower: 50000,
        category: 'rural',
        owner: 'GER',
        victoryPoints: [{ provinceId: 20, points: 10 }],
        provinces: [20, 21],
      }

      // Initial validation
      const initialValidation = validateStateProvinceSync([stateA, stateB], mockDefinitions)
      expect(initialValidation.valid).toBe(true)

      // Reassign province 11 from State A to State B
      const reassignResult = reassignProvince(stateA, stateB, 11)
      expect(reassignResult.success).toBe(true)

      // State A provinces should now be [10, 12]
      expect(stateA.provinces).toEqual([10, 12])
      // State B provinces should now be [20, 21, 11]
      expect(stateB.provinces).toEqual([20, 21, 11])

      // Victory points in State A referencing 11 should have been cleaned up
      expect(stateA.victoryPoints.some(vp => vp.provinceId === 11)).toBe(false)

      // Post-reassignment synchronization verification
      const postValidation = validateStateProvinceSync([stateA, stateB], mockDefinitions)
      expect(postValidation.valid).toBe(true)
      expect(postValidation.doubleAssignedProvinces).toHaveLength(0)
      expect(postValidation.unknownProvincesInStates).toHaveLength(0)
    })

    it('detects and flags simulated double-assignment conflict if a province is added without removing from source', () => {
      const mockDefinitions = new Map<number, ProvinceDefinition>([
        [1, { id: 1, red: 1, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'plains', continent: 1 }],
        [2, { id: 2, red: 2, green: 0, blue: 0, type: 'land', coastal: false, terrain: 'plains', continent: 1 }],
      ])

      const state1: StateFileDef = {
        id: 1,
        name: 'S1',
        manpower: 1000,
        category: 'rural',
        owner: 'FRA',
        victoryPoints: [],
        provinces: [1, 2], // 2 is in state1
      }

      const state2: StateFileDef = {
        id: 2,
        name: 'S2',
        manpower: 1000,
        category: 'rural',
        owner: 'ENG',
        victoryPoints: [],
        provinces: [2], // 2 also in state2! Double assignment!
      }

      const sync = validateStateProvinceSync([state1, state2], mockDefinitions)
      expect(sync.valid).toBe(false)
      expect(sync.doubleAssignedProvinces).toHaveLength(1)
      expect(sync.doubleAssignedProvinces[0].provinceId).toBe(2)
      expect(sync.doubleAssignedProvinces[0].states).toEqual([1, 2])
    })
  })
})
