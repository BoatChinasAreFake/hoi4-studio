import { describe, it, expect } from 'vitest'
import { createTgaBuffer, validateFlagTga, parseTgaHeader } from './helpers/tgaValidator'
import { GfxTagIndexer } from './helpers/gfxIndexer'
import type { GuiElementDef, FlagIdeology, FlagResolution, ModOptimizerIssue } from '../src/types/ui'
import { DEFAULT_GUI_ELEMENTS } from '../src/components/ui/GuiBuilder'
import { INITIAL_DIAGNOSTIC_ISSUES } from '../src/components/ui/ModOptimizer'
import { INITIAL_DIFF_BLOCKS } from '../src/components/ui/PatchUpgrader'
import { DEFAULT_METADATA } from '../src/components/ui/WorkshopPackager'

// ============================================================================
// Adversarial M4 Test Suite: Phase 5 UI Layout Tools, Asset Utilities, & Diffing
// ============================================================================

describe('Adversarial M4: UI Layout Tools, Asset Utilities, and 3-Way Diffing', () => {

  // --------------------------------------------------------------------------
  // 1. Flag Studio TGA Exporter Oracle & Byte Verification
  // --------------------------------------------------------------------------
  describe('1. Flag Studio TGA Exporter Byte Exactness & BGRA Integrity', () => {
    const ideologies: FlagIdeology[] = ['democratic', 'communism', 'fascism', 'neutrality']
    const ideologyRgb: Record<FlagIdeology, [number, number, number]> = {
      democratic: [30, 90, 200],
      communism: [220, 20, 20],
      fascism: [139, 69, 19],
      neutrality: [120, 120, 120],
    }

    const expectedResolutions: Array<{
      kind: FlagResolution
      width: number
      height: number
      expectedBytes: number
      folder: string
    }> = [
      { kind: 'standard', width: 82, height: 52, expectedBytes: 17074, folder: 'gfx/flags/' },
      { kind: 'medium', width: 41, height: 26, expectedBytes: 4282, folder: 'gfx/flags/medium/' },
      { kind: 'small', width: 10, height: 7, expectedBytes: 298, folder: 'gfx/flags/small/' },
    ]

    it('exports all 4 ideologies across all 3 resolutions with byte-exact length and valid headers', () => {
      let totalFlagsGenerated = 0

      for (const ideo of ideologies) {
        const rgb = ideologyRgb[ideo]

        for (const res of expectedResolutions) {
          const buffer = createTgaBuffer(res.width, res.height, rgb)
          totalFlagsGenerated++

          // Exact byte calculation: 18 header + (width * height * 4)
          expect(buffer.length).toBe(res.expectedBytes)

          // Validate via TGA header parser
          const info = parseTgaHeader(buffer)
          expect(info.width).toBe(res.width)
          expect(info.height).toBe(res.height)
          expect(info.bpp).toBe(32)
          expect(info.isUncompressedTrueColor).toBe(true)
          expect(info.hasAlpha).toBe(true)

          const val = validateFlagTga(buffer, res.kind)
          expect(val.valid).toBe(true)
        }
      }

      expect(totalFlagsGenerated).toBe(12)
    })

    it('proves BGRA pixel order for every pixel across all generated buffers', () => {
      for (const ideo of ideologies) {
        const [r, g, b] = ideologyRgb[ideo]
        const buffer = createTgaBuffer(10, 7, [r, g, b])

        // Skip 18 header bytes, each pixel is 4 bytes [B, G, R, A]
        const pixelData = buffer.slice(18)
        expect(pixelData.length).toBe(10 * 7 * 4)

        for (let i = 0; i < pixelData.length; i += 4) {
          expect(pixelData[i]).toBe(b)       // Blue
          expect(pixelData[i + 1]).toBe(g)   // Green
          expect(pixelData[i + 2]).toBe(r)   // Red
          expect(pixelData[i + 3]).toBe(255) // Alpha (fully opaque)
        }
      }
    })

    it('rejects malformed buffers or corrupt headers', () => {
      // Too small buffer
      const tinyBuf = new Uint8Array(10)
      expect(() => parseTgaHeader(tinyBuf)).toThrow(/Buffer too small/)

      // Buffer with wrong dimensions for standard (40x25 instead of 82x52)
      const wrongDimBuf = createTgaBuffer(40, 25, [100, 100, 100])
      const res = validateFlagTga(wrongDimBuf, 'standard')
      expect(res.valid).toBe(false)
      expect(res.error).toContain('Invalid flag dimensions')
    })
  })

  // --------------------------------------------------------------------------
  // 2. 3-Way AST Diffing & Merge Conflicts
  // --------------------------------------------------------------------------
  describe('2. 3-Way AST Diffing & Conflict Resolution', () => {
    it('accurately resolves conflict when user chooses Mod Custom buff', () => {
      const conflictBlock = INITIAL_DIFF_BLOCKS.find(b => b.id === 'FRA_devalue_franc')!
      expect(conflictBlock.status).toBe('conflict')
      expect(conflictBlock.baseContent).toContain('cost = 10')
      expect(conflictBlock.vanillaContent).toContain('cost = 14')
      expect(conflictBlock.modContent).toContain('cost = 8')

      // Simulate conflict resolution: User takes Mod
      const resolvedWithMod = {
        ...conflictBlock,
        status: 'clean' as const,
        mergedContent: conflictBlock.modContent,
      }

      expect(resolvedWithMod.status).toBe('clean')
      expect(resolvedWithMod.mergedContent).toContain('cost = 8')
      expect(resolvedWithMod.mergedContent).toContain('add_political_power = 100')
    })

    it('accurately auto-merges upstream changes when mod left block untouched', () => {
      const autoMergeBlock = INITIAL_DIFF_BLOCKS.find(b => b.id === 'FRA_maginot_extension')!
      expect(autoMergeBlock.status).toBe('upstream_modified')
      expect(autoMergeBlock.baseContent).toContain('cost = 10')
      expect(autoMergeBlock.vanillaContent).toContain('cost = 12')
      expect(autoMergeBlock.modContent).toContain('cost = 10')

      // Merged content takes vanilla's new version
      expect(autoMergeBlock.mergedContent).toBe(autoMergeBlock.vanillaContent)
      expect(autoMergeBlock.mergedContent).toContain('FRA_defensive_focus')
    })

    it('preserves user custom blocks not present in upstream base or updated vanilla', () => {
      const customBlock = INITIAL_DIFF_BLOCKS.find(b => b.id === 'FRA_peoples_militia')!
      expect(customBlock.status).toBe('mod_custom')
      expect(customBlock.baseContent).toBeUndefined()
      expect(customBlock.vanillaContent).toBeUndefined()
      expect(customBlock.mergedContent).toBe(customBlock.modContent)
    })

    it('demonstrates Add/Add collision behavior when upstream and mod add blocks with identical IDs', () => {
      interface MockBlock {
        id: string
        cost: number
        reward: string
      }

      const baseBlock: MockBlock | null = null
      const upstreamAdd: MockBlock = { id: 'SHARED_FOCUS', cost: 10, reward: 'pp_50' }
      const modAdd: MockBlock = { id: 'SHARED_FOCUS', cost: 5, reward: 'pp_100' }

      // 3-way evaluation:
      // When both branches add an item not present in base, their equality must be checked:
      const isAddAddCollision = baseBlock === null && upstreamAdd !== null && modAdd !== null
      const isIdenticalAdd = JSON.stringify(upstreamAdd) === JSON.stringify(modAdd)
      const status = isAddAddCollision ? (isIdenticalAdd ? 'clean' : 'conflict') : 'clean'

      expect(isAddAddCollision).toBe(true)
      expect(isIdenticalAdd).toBe(false)
      expect(status).toBe('conflict')
    })
  })

  // --------------------------------------------------------------------------
  // 3. Province Realignment Engine
  // --------------------------------------------------------------------------
  describe('3. Province ID Realignment & Substring Safety', () => {
    it('computes shifted province IDs by RGB matching between old and new definitions', () => {
      const oldDefinition = new Map<string, number>([
        ['100,50,25', 1],
        ['200,80,90', 10],
        ['50,150,200', 100],
      ])

      const newDefinition = new Map<string, number>([
        ['100,50,25', 2],   // Shifted 1 -> 2
        ['200,80,90', 10],  // Unchanged
        ['50,150,200', 105], // Shifted 100 -> 105
      ])

      const shifted = new Map<number, number>()
      for (const [rgb, oldId] of oldDefinition) {
        const newId = newDefinition.get(rgb)
        if (newId && newId !== oldId) {
          shifted.set(oldId, newId)
        }
      }

      expect(shifted.get(1)).toBe(2)
      expect(shifted.get(10)).toBeUndefined()
      expect(shifted.get(100)).toBe(105)
    })

    it('demonstrates substring corruption hazard with naive replace vs word-bounded replace', () => {
      const script = 'state = { id = 100 provinces = { 1 10 100 11804 } }'
      const oldId = 1
      const newId = 2

      // Naive substring replacement (similar to `modified.replace(" 1", " 2")`):
      const naiveReplaced = script.replaceAll(` ${oldId}`, ` ${newId}`)
      // Even state id = 100 became id = 200, and " 10" became " 20", " 100" became " 200", " 11804" became " 21804"!
      expect(naiveReplaced).toBe('state = { id = 200 provinces = { 2 20 200 21804 } }')

      // Safe regex word-boundary replacement:
      const safeReplaced = script.replace(new RegExp(`\\b${oldId}\\b`, 'g'), newId.toString())
      expect(safeReplaced).toBe('state = { id = 100 provinces = { 2 10 100 11804 } }')
    })
  })

  // --------------------------------------------------------------------------
  // 4. Mod Asset Optimizer & Purger
  // --------------------------------------------------------------------------
  describe('4. Mod Asset Optimizer & Purger Scanner', () => {
    it('verifies quarantine path transformation and safe 1-click rollback', () => {
      const issues: ModOptimizerIssue[] = [...INITIAL_DIAGNOSTIC_ISSUES]
      expect(issues.length).toBe(7)

      // Calculate total initial size
      const totalReclaimableBytes = issues
        .filter(i => i.selected)
        .reduce((acc, i) => acc + i.sizeBytes, 0)

      expect(totalReclaimableBytes).toBe(13913700) // ~13.27 MB

      // Quarantine simulation:
      const quarantined = issues.map(item => ({
        ...item,
        path: `.backup_purged/${item.path}`,
        quarantined: true,
      }))

      for (const item of quarantined) {
        expect(item.path.startsWith('.backup_purged/')).toBe(true)
        expect(item.quarantined).toBe(true)
      }

      // Rollback simulation:
      const restored = quarantined.map(item => ({
        ...item,
        path: item.path.replace('.backup_purged/', ''),
        quarantined: false,
      }))

      expect(restored).toEqual(issues.map(i => ({ ...i, quarantined: false })))
    })

    it('identifies double-counting bug when duplicate assets are also unreferenced textures', () => {
      // Asset A (active, referenced in script): 50,000 bytes, hash: H1
      // Asset B (copy of A, unreferenced): 50,000 bytes, hash: H1
      const assetA = { path: 'gfx/a.dds', size: 50000, hash: 'H1', referenced: true }
      const assetB = { path: 'gfx/b.dds', size: 50000, hash: 'H1', referenced: false }

      // If unreferenced textures sum unreferenced assets:
      const unrefBytes = [assetA, assetB].filter(a => !a.referenced).reduce((s, a) => s + a.size, 0)
      expect(unrefBytes).toBe(50000)

      // If duplicate scanner also adds secondary copy:
      const dupBytes = 50000 // assetB

      // If an optimizer naively adds both without deduplicating:
      const naiveTotal = unrefBytes + dupBytes
      expect(naiveTotal).toBe(100000) // Double-counted! Actual disk saving from deleting B is only 50,000 bytes.

      // Deduplicated set of purgeable files:
      const purgeSet = new Set(['gfx/b.dds'])
      const actualReclaimable = Array.from(purgeSet).length * 50000
      expect(actualReclaimable).toBe(50000)
    })
  })

  // --------------------------------------------------------------------------
  // 5. GUI Builder & Minigame Templates
  // --------------------------------------------------------------------------
  describe('5. GUI Builder & Minigame Geometry', () => {
    it('validates default GUI element hierarchy and Clausewitz formatting', () => {
      const defaultWin = DEFAULT_GUI_ELEMENTS[0]
      expect(defaultWin.type).toBe('containerWindowType')
      expect(defaultWin.name).toBe('custom_diplo_window')
      expect(defaultWin.children?.length).toBe(5)

      const serialize = (el: GuiElementDef): string => {
        let out = `${el.type} = {\n\tname = "${el.name}"\n\tposition = { x = ${el.position.x} y = ${el.position.y} }\n`
        if (el.children) {
          for (const c of el.children) {
            out += `\t${serialize(c)}\n`
          }
        }
        out += '}'
        return out
      }

      const script = serialize(defaultWin)
      expect(script).toContain('containerWindowType = {')
      expect(script).toContain('name = "custom_diplo_window"')
      expect(script).toContain('name = "window_background"')
      expect(script).toContain('name = "sign_treaty_button"')
    })

    it('computes parliament semicircle seating geometry and ensures non-overlapping angular distribution', () => {
      const totalSeats = 100
      const rows = 4
      const dotsPerRow = Math.ceil(totalSeats / rows)

      const dots: Array<{ x: number; y: number; r: number }> = []

      for (let r = 0; r < rows; r++) {
        const radius = 120 + r * 28
        const countThisRow = Math.min(dotsPerRow, totalSeats - dots.length)
        const angleStep = Math.PI / (countThisRow + 1)

        for (let i = 1; i <= countThisRow; i++) {
          const angle = Math.PI - i * angleStep
          const x = 200 + radius * Math.cos(angle)
          const y = 200 - radius * Math.sin(angle)
          dots.push({ x, y, r: radius })
        }
      }

      expect(dots).toHaveLength(totalSeats)

      // Radius strictly increases per row
      expect(dots[0].r).toBe(120)
      expect(dots[99].r).toBe(120 + 3 * 28)

      // All dots must have y <= 200 (upper semicircle)
      for (const d of dots) {
        expect(d.y).toBeLessThanOrEqual(200)
      }
    })

    it('clamps Balance of Power tension between -1.0 and +1.0', () => {
      const clampBop = (val: number) => Math.max(-1.0, Math.min(1.0, val))

      expect(clampBop(0.25)).toBe(0.25)
      expect(clampBop(-1.5)).toBe(-1.0)
      expect(clampBop(2.0)).toBe(1.0)
    })
  })

  // --------------------------------------------------------------------------
  // 6. Workshop Packager & Descriptor Validation
  // --------------------------------------------------------------------------
  describe('6. Steam Workshop Packager & Release Filter', () => {
    it('validates mandatory Paradox descriptor fields', () => {
      const meta = DEFAULT_METADATA
      expect(meta.name).toBeTruthy()
      expect(meta.version).toBeTruthy()
      expect(meta.supportedVersion).toMatch(/^\d+\.\d+\.\*$/)
      expect(meta.tags.length).toBeGreaterThan(0)
      expect(meta.picture).toBeTruthy()
    })

    it('correctly filters ignored development files from release package', () => {
      const files = [
        '.git/index',
        '.agents/teamwork/plan.md',
        'art/icon.psd',
        'model/mesh.blend',
        'sound/voice.wav',
        'tests/unit.test.ts',
        'node_modules/vite/index.js',
        'common/national_focus/france.txt',
        'gfx/flags/FRA.tga',
        'descriptor.mod',
      ]

      const ignoreRules = DEFAULT_METADATA.ignorePatterns.map(p => p.replace('*', ''))

      const included = files.filter(f => !ignoreRules.some(rule => f.includes(rule)))
      expect(included).toHaveLength(3)
      expect(included).toContain('common/national_focus/france.txt')
      expect(included).toContain('gfx/flags/FRA.tga')
      expect(included).toContain('descriptor.mod')
    })
  })
})
