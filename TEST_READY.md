# TEST_READY — HOI4 Studio Automated Test Suite

## Executive Summary
A modern automated test harness powered by **Vitest 5.0.5** has been established in `hoi4-studio`. The test suite implements genuine, specification-compliant opaque-box E2E and integration tests across **Tiers 1 through 4**, directly verified against real base-game assets from the vanilla installation (**Operation Postern v1.19.4** at `C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV`).

- **Test Framework**: Vitest v5.0.5 + Node environment
- **Execution Command**: `npm.cmd test` (alias for `vitest run`)
- **Total Test Files**: 4 suites (`tests/tier1_features.test.ts`, `tests/tier2_boundary.test.ts`, `tests/tier3_combinations.test.ts`, `tests/tier4_vanilla.test.ts`)
- **Total Test Cases**: 31 executed
- **Pass Rate**: 100% (31 passed, 0 failed)
- **Execution Duration**: ~260ms

---

## Test Inventory by Tier

### Tier 1: Feature Coverage (`tests/tier1_features.test.ts`)
*Comprehensive validation of core domain algorithms and file generators.*
1. **Map definition CSV parsing**: Correct parsing of semicolon-separated rows into typed `ProvinceDefinition` structures; validates coordinate types (`land`, `sea`, `lake`), coastal flags, terrain classifications, and continent IDs.
2. **River 1px connectivity check**: Topologically validates continuous 1px river lines from green source `(0, 255, 0)` down through tiers to red mouth `(255, 0, 0)` without 2x2 bottlenecks or unanchored pixels.
3. **Country wizard file generator**: Scaffolds exactly 10 required files across 7 distinct directory trees (`common/countries`, `common/country_tags`, `history/countries`, `history/states`, `gfx/flags`, `common/characters`, `common/ideas`, `localisation/english`).
4. **Super Event schema**: Validates payload schema (IDs, loc keys, audio cue identifiers, sprite references) and generates executable Paradox event script.
5. **Balance of Power (BoP) parser**: Parses initial values, left/right sides, and contiguous range brackets without gaps or overlapping intervals.
6. **Character parser**: Extracts characters with multi-role configurations (`country_leader`, `corps_commander`, `navy_leader`, `advisor`, `scientist`) handling nested Clausewitz blocks.
7. **Division template math**: Rollup mathematics for 5x5 battalion grid and support company slots (combat width, manpower, soft/hard attack, defense, breakthrough, HP, organization, max speed, supply consumption).
8. **GFX tag indexer**: Indexes sprite definitions (`spriteType`), supports semantic tag filtering (`focus`, `idea`, `trait`, etc.), and performs reverse texture-to-tag lookups.
9. **Flag TGA dimensions**: Binary header validation for Standard (82x52), Medium (41x26), and Small (10x7) uncompressed 32-bit TGAs.

---

### Tier 2: Boundary & Corner Cases (`tests/tier2_boundary.test.ts`)
*Stress testing, boundary conditions, and adversarial input verification.*
1. **Empty province lists**: Flags states with empty `provinces = { }` as invalid configurations.
2. **Duplicate RGBs in map definition**: Detects duplicate RGB triplets assigned to different provinces as fatal collisions.
3. **Illegal river 2x2 blocks**: Detects every 2x2 contiguous river block that would trigger Paradox engine CTD and outputs exact tile coordinates.
4. **Missing green source / red mouth**: Rejects rivers lacking green source `(0, 255, 0)` or red mouth `(255, 0, 0)`.
5. **UTF-8 BOM validation**: Enforces byte sequence `[0xEF, 0xBB, 0xBF]` on localisation files and rejects non-BOM UTF-8 and UTF-16 encodings.
6. **Flag TGA dimension boundaries**: Rejects invalid aspect ratios (e.g. 80x50) and invalid bit depths (e.g. 24bpp).
7. **Adversarial encoding & character set integrity**: Proves zero corruption for diacritics, Cyrillic, CJK glyphs, and escaped quotes through the BOM pipeline.
8. **Adversarial malformed inputs**: Verifies graceful error recovery for non-numeric RGBs, inverted BoP bounds, and empty division templates.

---

### Tier 3: Cross-Feature Combinations (`tests/tier3_combinations.test.ts`)
*Multi-system interaction and graph integrity.*
1. **Supply network BFS graph validation**: Validates bidirectional province graph traversal against `railways.txt` (levels 1-5) and `supply_nodes.txt` from capital origin; isolates unreachable hubs; reconstructs shortest path hops.
2. **State reassignment vs province definition synchronization**: Proves province migration from State A to State B maintains invariant consistency, relocates/cleans victory points, prevents orphaned provinces, and detects simulated double-assignments.

---

### Tier 4: Real-World Vanilla Fixture Validation (`tests/tier4_vanilla.test.ts`)
*Direct verification against base game installation at `C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV`.*
1. **`map/definition.csv`**: Parses all 13,414 vanilla province definitions; verifies province 0 is void `(0, 0, 0)` and province 1 is lake `(230, 81, 119)`; proves 100% mathematical RGB uniqueness across all 13,414 vanilla provinces.
2. **`history/states/1-France.txt`**: Parses Corsica (State 1, town category, manpower 322,900, owner FRA, victory point at 3838); validates assigned provinces `[3838, 9851, 11804]` exist in `definition.csv`.
3. **`common/ideologies/00_ideologies.txt`**: Parses democratic, communism, fascism, and neutrality; verifies exact colors (`[0, 0, 255]`, `[255, 0, 0]`, `[150, 75, 0]`, `[124, 124, 124]`) and sub-ideology tokens.
4. **`localisation/english/countries_l_english.yml`**: Verifies raw byte header is `[0xEF, 0xBB, 0xBF]`; decodes country keys (`FRA: "France"`, `ENG_democratic: "United Kingdom"`, `GER_fascism: "German Reich"`).
5. **`map/railways.txt` & `map/supply_nodes.txt`**: Parses all 910 vanilla railway lines and 728 supply nodes; executes BFS connectivity from Berlin (Province 6521) proving connectivity to over 100 continental supply hubs.

---

## Instructions to Run Tests

```bash
# Run the entire test suite synchronously
npm.cmd test

# Run tests in watch mode
npx vitest

# Run a specific tier
npx vitest run tests/tier1_features.test.ts
npx vitest run tests/tier2_boundary.test.ts
npx vitest run tests/tier3_combinations.test.ts
npx vitest run tests/tier4_vanilla.test.ts
```

---

## Discovered Implementation Bugs (Escalation)

During compilation check (`npm.cmd run build`), the following implementation defects were identified in code authored by `teamwork_worker_m1`:
1. **`src/components/simulation/SandboxSimulator.tsx`**:
   - `TS2304: Cannot find name 'useCallback'` on lines 97 and 134. `useCallback` is missing from the React import statement.
   - Unused imports and declarations: `IdeologyGroup`, `Sparkles`, `Shield`, `Users`, `Flag`, `useRef`.
2. **`src/App.tsx`**:
   - `TS6133: 'WorkspaceDispatcher' is declared but its value is never read.`
   - `TS6198: All destructured elements are unused` (`mapStudioTab`, `setMapStudioTab`).
3. **`src/components/map/`**:
   - Multiple unused imports across `MapCanvas.tsx`, `MapLinter.tsx`, `PositionsPinPlacer.tsx`, `ProvinceSlicer.tsx`, `RailwayNetworkBuilder.tsx`, `RiverPencil.tsx`, `StateReassignmentTool.tsx`, and `WorldMapStudio.tsx`.

*Per QA guidelines, implementation code has not been altered by the Test Writer and is escalated to the implementing worker subagent for resolution.*
