# HOI4 Studio 🎖️
### Visual Integrated Modding Suite for Hearts of Iron IV

**HOI4 Studio** is a desktop IDE and visual development suite for [Hearts of Iron IV](https://www.paradoxinteractive.com/games/hearts-of-iron-iv) modding. Powered by **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and a **Rust / Tauri v2** native backend, HOI4 Studio provides a complete, modern development environment across 7 dedicated activity hubs with lossless Clausewitz CST parsing, visual canvas design, and deep game asset integration.

---

## 🌟 Activity Hubs & Features

HOI4 Studio organizes mod creation into **7 Activity Hubs**, accessible instantly via keyboard shortcuts (`1`–`7`) or the universal Command Palette (<kbd>Ctrl+K</kbd>):

### 1. 🗺️ World & Map Studio (`Hotkey: 1`)
- **Interactive 2D Map Canvas**: High-performance SVG/Canvas vector map rendering with zoom, pan, and province inspection.
- **State Reassignment Tool**: Click, brush, and lasso multi-province selection tools for fast territorial reassignment.
- **Province Slicer**: Split provinces along custom cutlines with 24-bit unique collision-free RGB generation for `provinces.bmp` and `definition.csv`.
- **Topological 1px River Pencil**: 8-connected Bresenham river rasterizer with automatic 2×2 cluster pruning, green source `[0, 255, 0]`, and red mouth `[255, 0, 0]` palette constraints.
- **Map Positions Pin Placer**: Visual 3D coordinates editor for cities, ports, victory points, and unit counters in `map/positions.txt`.
- **Railway & Supply Network Builder**: Draw level 1–5 railways, place supply hubs, and run breadth-first search (BFS) capital connectivity validation.
- **Map Linter**: Automated diagnostics with 1-click auto-fix for duplicate RGB definitions, ocean lake misclassifications, and disconnected supply lines.

### 2. 🏛️ Politics & Diplomacy (`Hotkey: 2`)
- **Country Creation Wizard**: 1-click scaffolding generating all 10 required vanilla files across 7 directories with automated palette generation, history, bookmarks, and OOB files.
- **Unified Character & Leader Studio**: Visual portrait assigner and trait matrix for country leaders, generals, admirals, advisors, and ship captains.
- **Balance of Power (BoP) Studio**: Visual dual-power balance slider (-1.0 to 1.0) with custom range thresholds, decisions, and modifier curves.
- **Faction Rules & Goals (NCNS)**: Custom faction alliances, rules (`can_create_factions`, ideological alignment), and faction goal structures.
- **Ideology & Autonomy Studio**: Visual ideology hierarchy, sub-ideology configuration, autonomy progression ladders, and subject levels.
- **Scripted Diplomatic Actions**: Design custom war goals, treaties, and diplomatic actions with interactive trigger/effect builders.
- **Localization Matrix & Refactor Engine**: Project-wide UTF-8 BOM (`[0xEF, 0xBB, 0xBF]`) multi-language translation matrix and AST word-boundary symbol refactoring.

### 3. ⚔️ Military & Warfare (`Hotkey: 3`)
- **Modular Chassis Designer**: Full visual designer for Tanks (NSB), Aircraft (BBA), and Ships (MtG) with real-time stats, engine/armor sliders, and plane thrust-vs-weight validation.
- **5×5 Division Template Designer**: Drag-and-drop division grid with regimental support companies, Paradox weighted armor (`0.3*max + 0.7*avg`), piercing (`0.4*max + 0.6*avg`), and speed bottleneck math.
- **Headquarters (HQs) & Command Auras**: Divisional command hierarchy, corps attachment, and commander aura radius configuration.
- **Doctrines & Special Forces**: Custom land, naval, air, and special forces doctrine trees with mutual exclusion paths and branch prerequisites.

### 4. ⚙️ Economy & Tech (`Hotkey: 4`)
- **Technology & Research Tree Canvas**: Infinite 120×150px grid canvas with Kahn's DAG cycle detection, XOR branch mutual exclusions, ahead-of-time (AOT) penalty curves, and research bonus calculations.
- **Raids & Strategic Targets Studio**: Setup and simulate sabotage missions, nuclear strikes, port strikes, and commando raids.
- **Special Projects & Facilities**: Design secret research facilities, scientists, and advanced prototypes (*Götterdämmerung* wunderwaffe mechanics).
- **International Market & Equipment Subsidies**: Define export quotas, purchase contracts, and state subsidies (*Arms Against Tyranny*).
- **Strategic Resources & Custom Buildings**: Add novel raw resources (oil, rubber, titanium), provincial buildings, and state-level infrastructure.

### 5. 📜 Narrative & Content (`Hotkey: 5`)
- **National Focus Tree Studio**: React Flow infinite canvas with integer grid snapping (120×150px), golden prerequisite bezier curves, red dashed mutual exclusions, and search filters.
- **Clausewitz CST Parser & Surgical Mutator**: Lossless Clausewitz Concrete Syntax Tree (CST) parser and mutator that preserves comments, indentations, and whitespace on edits.
- **1,300+ Real HOI4 Goal Icons**: Pre-converted and indexed WebP goal icons from Hearts of Iron IV v1.19.4 Postern with an integrated Icon Browser.
- **Smart Inspector & Monaco Editor**: Collapsible inspector sidebar with synchronized visual form and Monaco syntax-highlighted Clausewitz code editor.
- **Focus Palette & Custom Templates**: Drag-and-drop focus templates with custom user-defined template creation and save/delete actions.
- **Super Event Studio**: Create dramatic super events with 4 visual layout presets, sound effect preview with automatic music ducking, and 1-click code export.

### 6. 🎨 UI & Media (`Hotkey: 6`)
- **Visual GFX Browser & Tag Search**: Semantic search and reverse lookup across 15,000+ vanilla sprite definitions (`spriteTypes`).
- **WYSIWYG .gui Layout Builder**: Visual canvas for Paradox `.gui` interfaces with drag-and-drop positioning, container trees, and instant `.gui` code serialization.
- **Parliament & Minigame Templates**: Mathematical semicircular parliament arc seat distribution generator and regional influence grid builder.
- **Automated 1-Click Flag Studio**: Batch exporter generating authentic 32-bit uncompressed BGRA TGAs in 3 exact Paradox dimensions (Standard: 82×52, Medium: 41×26, Small: 10×7) across 4 ideologies.
- **Music Station & Radio Studio**: Sound effect registry, music stations, and asset packager.
- **Steam Workshop Packager**: Descriptor validator (`v2.0` syntax) and release builder with automatic build artifact / test exclusions.

### 7. 🧪 Simulation & Diagnostics (`Hotkey: 7`)
- **Day-by-Day Tick Sandbox Simulator**: Headless simulation sandbox that resolves focus completion, AI priorities, and deadlocks using Tarjan's Strongly Connected Components (SCC) algorithm.
- **Mod Asset Optimizer & Purger**: Deep analyzer detecting unreferenced textures, dead audio, duplicate files, and orphaned localization keys with path deduplication.
- **Vanilla Patch & Version Upgrader**: 3-Way AST diffing and merge conflict engine with Add/Add collision detection, deprecated syntax migration, and word-boundary province ID realignment.

---

## ⌨️ Universal Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>1</kbd> | Switch to **World & Map Studio** |
| <kbd>2</kbd> | Switch to **Politics & Diplomacy** |
| <kbd>3</kbd> | Switch to **Military & Warfare** |
| <kbd>4</kbd> | Switch to **Economy & Tech** |
| <kbd>5</kbd> | Switch to **Narrative & Content** |
| <kbd>6</kbd> | Switch to **UI & Media** |
| <kbd>7</kbd> | Switch to **Simulation & Tools** |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Toggle **Universal Command Palette** |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo canvas action |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo canvas action |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected focus or node |
| <kbd>Esc</kbd> | Deselect / Return to select mode |

*(Hotkeys `1`–`7` are protected by boundary guards to avoid triggering when typing in inputs, textareas, or the Monaco editor).*

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [@xyflow/react](https://reactflow.dev/), [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react), [Lucide React](https://lucide.dev/).
- **Desktop Runtime**: [Tauri v2](https://tauri.app/) native desktop integration with secure IPC commands.
- **Backend (Rust)**: Native Rust modules in `src-tauri/src/` for map computation, 3-way AST diffing, 32-bit TGA flag generation, and high-speed asset optimization.
- **Testing**: [Vitest](https://vitest.dev/) frontend test harness & Cargo integration test harness.

---

## 🧪 Comprehensive Verification & Test Suite

The codebase has undergone multi-agent verification and adversarial stress-testing with 100% pass rates:

```powershell
# Run frontend test suite (20 suites, 303 tests)
npm.cmd test -- --run

# Run Rust unit & integration test suite (55 tests)
cargo.exe test --manifest-path src-tauri/Cargo.toml

# Production TypeScript and Vite build check
npm.cmd run build

# Cargo check
cargo.exe check --manifest-path src-tauri/Cargo.toml
```

- **Vitest**: **303 passing tests** across 20 test files (0 failures).
- **Cargo**: **55 passing tests** across 6 test suites (0 failures).
- **Build**: Zero TypeScript or compilation errors.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) and `npm`
- [Rust toolchain](https://rustup.rs/) (v1.75+)
- *(Optional)* Local installation of Hearts of Iron IV for live asset import and testing.

### Installation

```bash
# Clone the repository
git clone https://github.com/BoatChinasAreFake/hoi4-studio.git
cd hoi4-studio

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Running with Tauri Desktop App
```bash
npm run tauri dev
```

---

## 📄 License
MIT License. Hearts of Iron IV is a registered trademark of Paradox Interactive AB. HOI4 Studio is an independent modding tool suite.
