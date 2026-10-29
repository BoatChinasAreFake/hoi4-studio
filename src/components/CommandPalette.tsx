import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Zap,
  Map,
  Shield,
  Palette,
  Play,
  Film,
  FileCheck,
  FolderSync,
  RotateCcw,
  Paintbrush,
  Scissors,
  Waves,
  MapPin,
  TrainTrack,
  ShieldAlert,
  AlertOctagon,
  FlaskConical,
  Users,
  Globe,
  Scale,
  Compass,
  Layers,
  Handshake,
  Languages,
  Replace as ReplaceIcon,
  FolderTree,
  Atom,
  Crosshair,
  ShoppingBag,
  Gem,
  Radio,
  BookOpen,
  Flag,
  Package,
  HardDrive,
  GitMerge,
  Landmark,
  Cpu,
} from 'lucide-react';
import type { ActivityHub } from '../types/focus';
import type { PoliticsTab } from './politics/PoliticsStudio';
import type { MilitaryTab } from './military/MilitaryStudio';
import type { EconomyTab } from './economy/EconomyStudio';
import type { UiStudioTab, SimulationStudioTab } from '../types/ui';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHub: (hub: ActivityHub) => void;
  onTriggerHotReload: () => void;
  onRunSandbox: () => void;
  onAddFocus: () => void;
  onResetDefault?: () => void;
  onOpenExport?: () => void;
  onOpenValidate?: () => void;
  onSelectMapTab?: (tab: 'canvas' | 'states' | 'slicer' | 'river' | 'pins' | 'railways' | 'linter') => void;
  onSelectPoliticsTab?: (tab: PoliticsTab) => void;
  onSelectMilitaryTab?: (tab: MilitaryTab) => void;
  onSelectEconomyTab?: (tab: EconomyTab) => void;
  onSelectNarrativeTab?: (tab: 'focus_tree' | 'super_events') => void;
  onSelectUiTab?: (tab: UiStudioTab) => void;
  onSelectSimulationTab?: (tab: SimulationStudioTab) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectHub,
  onTriggerHotReload,
  onRunSandbox,
  onAddFocus,
  onResetDefault,
  onOpenExport,
  onOpenValidate,
  onSelectMapTab,
  onSelectPoliticsTab,
  onSelectMilitaryTab,
  onSelectEconomyTab,
  onSelectNarrativeTab,
  onSelectUiTab,
  onSelectSimulationTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = [
    // 7 Activity Hub Quick Switches (Hotkeys 1-7)
    {
      id: 'switch_hub_1_map',
      title: 'Switch to Hub 1: World & Map Studio (Hotkey 1)',
      category: 'Navigation',
      icon: <Map className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('map');
        onClose();
      },
    },
    {
      id: 'switch_hub_2_politics',
      title: 'Switch to Hub 2: Politics Studio (Hotkey 2)',
      category: 'Navigation',
      icon: <Landmark className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onSelectHub('politics');
        onClose();
      },
    },
    {
      id: 'switch_hub_3_military',
      title: 'Switch to Hub 3: Military Studio (Hotkey 3)',
      category: 'Navigation',
      icon: <Shield className="h-4 w-4 text-[#bd785c]" />,
      action: () => {
        onSelectHub('military');
        onClose();
      },
    },
    {
      id: 'switch_hub_4_economy',
      title: 'Switch to Hub 4: Economy Studio (Hotkey 4)',
      category: 'Navigation',
      icon: <Cpu className="h-4 w-4 text-amber-400" />,
      action: () => {
        onSelectHub('economy');
        onClose();
      },
    },
    {
      id: 'switch_hub_5_narrative',
      title: 'Switch to Hub 5: Narrative Studio (Hotkey 5)',
      category: 'Navigation',
      icon: <BookOpen className="h-4 w-4 text-purple-400" />,
      action: () => {
        onSelectHub('narrative');
        onClose();
      },
    },
    {
      id: 'switch_hub_6_ui',
      title: 'Switch to Hub 6: UI Studio (Hotkey 6)',
      category: 'Navigation',
      icon: <Palette className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('ui');
        onClose();
      },
    },
    {
      id: 'switch_hub_7_simulation',
      title: 'Switch to Hub 7: Simulation Studio (Hotkey 7)',
      category: 'Navigation',
      icon: <FlaskConical className="h-4 w-4 text-[#a6bd87]" />,
      action: () => {
        onSelectHub('simulation');
        onClose();
      },
    },
    // Focus Tree & Narrative Studio Actions
    {
      id: 'focus_tree_canvas',
      title: 'Open National Focus Tree Visual Canvas',
      category: 'Narrative Studio',
      icon: <BookOpen className="h-4 w-4 text-purple-400" />,
      action: () => {
        onSelectHub('narrative');
        onSelectNarrativeTab?.('focus_tree');
        onClose();
      },
    },
    {
      id: 'add_focus',
      title: 'Add New National Focus',
      category: 'Focus Tree Studio',
      icon: <Sparkles className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onAddFocus();
        onClose();
      },
    },
    {
      id: 'hub_map',
      title: 'Open 2D Vector Map Canvas',
      category: 'World & Map Studio',
      icon: <Map className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('canvas');
        onClose();
      },
    },
    {
      id: 'map_state_reassignment',
      title: 'State Reassignment Tool (Lasso / Brush)',
      category: 'World & Map Studio',
      icon: <Paintbrush className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('states');
        onClose();
      },
    },
    {
      id: 'map_slice_province',
      title: 'Visual Province Slicer & Unique RGB Generator',
      category: 'World & Map Studio',
      icon: <Scissors className="h-4 w-4 text-[#a6bd87]" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('slicer');
        onClose();
      },
    },
    {
      id: 'map_river_pencil',
      title: 'Smart 1px Vector River Pencil',
      category: 'World & Map Studio',
      icon: <Waves className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('river');
        onClose();
      },
    },
    {
      id: 'map_positions_pins',
      title: 'Map Positions Pin Placer (3D Cities, Ports, VPs, Stacks)',
      category: 'World & Map Studio',
      icon: <MapPin className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('pins');
        onClose();
      },
    },
    {
      id: 'map_railway_builder',
      title: 'Railway & Supply Hub Network Builder',
      category: 'World & Map Studio',
      icon: <TrainTrack className="h-4 w-4 text-[#d1a742]" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('railways');
        onClose();
      },
    },
    {
      id: 'map_linter',
      title: 'Run Low-Level Map Linter & Diagnostics',
      category: 'World & Map Studio',
      icon: <ShieldAlert className="h-4 w-4 text-[#bd785c]" />,
      action: () => {
        onSelectHub('map');
        onSelectMapTab?.('linter');
        onClose();
      },
    },
    {
      id: 'open_sandbox_simulator',
      title: 'Open Game Logic Simulator Sandbox',
      category: 'Simulation',
      icon: <FlaskConical className="h-4 w-4 text-[#a6bd87]" />,
      action: () => {
        onSelectHub('simulation');
        onClose();
      },
    },
    {
      id: 'tarjan_deadlock_solver',
      title: 'Tarjan SCC Deadlock & Dependency Cycle Solver',
      category: 'Simulation',
      icon: <AlertOctagon className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('simulation');
        onClose();
      },
    },
    {
      id: 'reset_default_tree',
      title: 'Reset to Example Tree (A New Republic)',
      category: 'Project Presets',
      icon: <RotateCcw className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onResetDefault?.();
        onClose();
      },
    },
    {
      id: 'validate_tree',
      title: 'Validate Tree (Check Cycles & Coordinate Overlaps)',
      category: 'Diagnostics',
      icon: <FileCheck className="h-4 w-4 text-[#a6bd87]" />,
      action: () => {
        onOpenValidate?.();
        onClose();
      },
    },
    {
      id: 'export_mod',
      title: 'Export Mod Files (.txt & UTF-8 BOM .yml)',
      category: 'Packaging',
      icon: <FolderSync className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onOpenExport?.();
        onClose();
      },
    },
    {
      id: 'hot_reload',
      title: 'Trigger Live Hot-Reload (reload focus in HOI4)',
      category: 'Developer Tools',
      icon: <Zap className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onTriggerHotReload();
        onClose();
      },
    },
    {
      id: 'run_sandbox',
      title: 'Play / Sandbox Simulation Mode',
      category: 'Simulation',
      icon: <Play className="h-4 w-4 text-[#a6bd87]" />,
      action: () => {
        onRunSandbox();
        onClose();
      },
    },
    {
      id: 'hub_military',
      title: 'Switch to Military & Warfare (Divisions, Tanks, Planes, MIOs)',
      category: 'Navigation',
      icon: <Shield className="h-4 w-4 text-[#bd785c]" />,
      action: () => {
        onSelectHub('military');
        onClose();
      },
    },
    {
      id: 'super_event',
      title: 'Open Super Event Studio (TNO & Kaiserreich Style)',
      category: 'Narrative Studio',
      icon: <Film className="h-4 w-4 text-purple-400" />,
      action: () => {
        onSelectHub('narrative');
        onSelectNarrativeTab?.('super_events');
        onClose();
      },
    },
    {
      id: 'country_wizard',
      title: 'Create New Country Wizard (10 Files / 7 Dirs)',
      category: 'Politics Studio',
      icon: <Globe className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('wizard');
        onClose();
      },
    },
    {
      id: 'character_studio',
      title: 'Character & Leader Studio (Ship Captains & Naval Traits)',
      category: 'Politics Studio',
      icon: <Users className="h-4 w-4 text-cyan-400" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('characters');
        onClose();
      },
    },
    {
      id: 'bop_studio',
      title: 'Balance of Power (BoP) Studio (BBA Dynamic Tension)',
      category: 'Politics Studio',
      icon: <Scale className="h-4 w-4 text-amber-400" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('bop');
        onClose();
      },
    },
    {
      id: 'faction_studio',
      title: 'Faction Rules & Goals Studio (NCNS Alliance Dynamics)',
      category: 'Politics Studio',
      icon: <ShieldAlert className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('factions');
        onClose();
      },
    },
    {
      id: 'ideology_studio',
      title: 'Ideology & Sub-Ideology Studio (00_ideologies.txt)',
      category: 'Politics Studio',
      icon: <Compass className="h-4 w-4 text-red-400" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('ideology');
        onClose();
      },
    },
    {
      id: 'autonomy_studio',
      title: 'Autonomy Progression & Puppet Studio (common/autonomous_states/)',
      category: 'Politics Studio',
      icon: <Layers className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('autonomy');
        onClose();
      },
    },
    {
      id: 'diplo_studio',
      title: 'Scripted Diplomatic Actions & Timed Activities',
      category: 'Politics Studio',
      icon: <Handshake className="h-4 w-4 text-[#a6bd87]" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('diplo');
        onClose();
      },
    },
    {
      id: 'loc_matrix',
      title: 'Multi-Language Localization Matrix (UTF-8 BOM Enforced)',
      category: 'Politics Studio',
      icon: <Languages className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('loc');
        onClose();
      },
    },
    {
      id: 'symbol_refactor',
      title: 'Project-wide Symbol Refactoring Engine (AST Diff Preview)',
      category: 'Politics Studio',
      icon: <ReplaceIcon className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('politics');
        onSelectPoliticsTab?.('refactor');
        onClose();
      },
    },
    // Phase 4: Military Studio Actions
    {
      id: 'military_chassis_designer',
      title: 'Modular Equipment Chassis Designer (Tanks, Planes, Ships)',
      category: 'Military Studio',
      icon: <Shield className="h-4 w-4 text-[#bd785c]" />,
      action: () => {
        onSelectHub('military');
        onSelectMilitaryTab?.('chassis');
        onClose();
      },
    },
    {
      id: 'military_division_designer',
      title: '5x5 Division Template Grid & Support Battalions',
      category: 'Military Studio',
      icon: <Layers className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('military');
        onSelectMilitaryTab?.('division');
        onClose();
      },
    },
    {
      id: 'military_hq_studio',
      title: 'Military Headquarters (HQs) & Operational Command Auras',
      category: 'Military Studio',
      icon: <Radio className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onSelectHub('military');
        onSelectMilitaryTab?.('hq');
        onClose();
      },
    },
    {
      id: 'military_doctrines',
      title: 'Doctrines & Special Forces Trees (Land, Naval, Air)',
      category: 'Military Studio',
      icon: <BookOpen className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('military');
        onSelectMilitaryTab?.('doctrines');
        onClose();
      },
    },
    // Phase 4: Economy & Tech Studio Actions
    {
      id: 'economy_tech_tree',
      title: 'Technology & Research Tree Spatial Grid Canvas (120x150)',
      category: 'Economy Studio',
      icon: <FolderTree className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('economy');
        onSelectEconomyTab?.('techtree');
        onClose();
      },
    },
    {
      id: 'economy_special_projects',
      title: 'Special Projects, Facilities & Scientists (Götterdämmerung)',
      category: 'Economy Studio',
      icon: <Atom className="h-4 w-4 text-amber-400" />,
      action: () => {
        onSelectHub('economy');
        onSelectEconomyTab?.('special_projects');
        onClose();
      },
    },
    {
      id: 'economy_raids',
      title: 'Tactical Raids & Strategic Locations Studio',
      category: 'Economy Studio',
      icon: <Crosshair className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onSelectHub('economy');
        onSelectEconomyTab?.('raids');
        onClose();
      },
    },
    {
      id: 'economy_market',
      title: 'International Arms Market & Subsidies (Arms Against Tyranny)',
      category: 'Economy Studio',
      icon: <ShoppingBag className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('economy');
        onSelectEconomyTab?.('market');
        onClose();
      },
    },
    {
      id: 'economy_resources',
      title: 'Strategic Resources & Custom Buildings Studio',
      category: 'Economy Studio',
      icon: <Gem className="h-4 w-4 text-purple-400" />,
      action: () => {
        onSelectHub('economy');
        onSelectEconomyTab?.('resources');
        onClose();
      },
    },
    {
      id: 'gfx_search',
      title: 'Search GFX Assets (15,000+ Vanilla & Mod Sprites)',
      category: 'UI & Media',
      icon: <Palette className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('ui');
        onSelectUiTab?.('gfx_browser');
        onClose();
      },
    },
    {
      id: 'ui_gui_builder',
      title: 'Open WYSIWYG .gui Layout Builder',
      category: 'UI & Media',
      icon: <Layers className="h-4 w-4 text-emerald-400" />,
      action: () => {
        onSelectHub('ui');
        onSelectUiTab?.('gui_builder');
        onClose();
      },
    },
    {
      id: 'ui_minigames',
      title: 'Open Minigame Templates (Parliament, BoP, Influence Grid)',
      category: 'UI & Media',
      icon: <Landmark className="h-4 w-4 text-amber-400" />,
      action: () => {
        onSelectHub('ui');
        onSelectUiTab?.('minigames');
        onClose();
      },
    },
    {
      id: 'ui_flag_studio',
      title: 'Automated 1-Click Flag Studio (82x52, 41x26, 10x7 TGAs)',
      category: 'UI & Media',
      icon: <Flag className="h-4 w-4 text-rose-400" />,
      action: () => {
        onSelectHub('ui');
        onSelectUiTab?.('flag_studio');
        onClose();
      },
    },
    {
      id: 'ui_music_station',
      title: 'Music Station & Radio Studio (.ogg Player & Scaffolder)',
      category: 'UI & Media',
      icon: <Radio className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('ui');
        onSelectUiTab?.('music_station');
        onClose();
      },
    },
    {
      id: 'ui_workshop_packager',
      title: 'Steam Workshop Publisher & descriptor.mod Packager',
      category: 'UI & Media',
      icon: <Package className="h-4 w-4 text-purple-400" />,
      action: () => {
        onSelectHub('ui');
        onSelectUiTab?.('workshop_packager');
        onClose();
      },
    },
    {
      id: 'sim_optimizer',
      title: 'Mod Asset Optimizer & Purger (Unused Textures, Audio, Loc)',
      category: 'Simulation Studio',
      icon: <HardDrive className="h-4 w-4 text-[#d6b878]" />,
      action: () => {
        onSelectHub('simulation');
        onSelectSimulationTab?.('optimizer');
        onClose();
      },
    },
    {
      id: 'sim_patch_upgrader',
      title: 'Vanilla Patch & Version Upgrader (3-Way Merge & AST Diff)',
      category: 'Simulation Studio',
      icon: <GitMerge className="h-4 w-4 text-teal-400" />,
      action: () => {
        onSelectHub('simulation');
        onSelectSimulationTab?.('patch_upgrader');
        onClose();
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-xs pt-24 p-4 select-none">
      <div className="flex w-full max-w-xl flex-col rounded-lg border border-[#526044] bg-[#181e19] text-[#e3e5d9] shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#30392e] px-4 py-3 bg-[#1a211a]">
          <Search className="h-4 w-4 text-[#d6b878]" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search symbols (e.g. 'map', 'politics', 'chassis', 'reload')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#e3e5d9] placeholder-[#909b88] focus:outline-none"
          />
          <kbd className="rounded border border-[#3b4936] bg-[#111710] px-2 py-0.5 text-[10px] text-[#909b88]">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#909b88]">
              No actions matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition group ${
                    isSelected
                      ? 'bg-[#2a3627] ring-1 ring-[#d6b878]/60 shadow-inner'
                      : 'hover:bg-[#20281e]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`rounded p-1 border transition ${
                        isSelected
                          ? 'bg-[#354130] border-[#d6b878]/80 text-[#d6b878]'
                          : 'bg-[#111710] border-[#30392e]'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <span
                        className={`text-xs font-medium transition ${
                          isSelected ? 'text-[#d6b878] font-bold' : 'text-[#e3e5d9] group-hover:text-[#d6b878]'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider transition ${
                      isSelected ? 'text-[#d6b878]' : 'text-[#909b88]'
                    }`}
                  >
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#30392e] bg-[#141a15] px-4 py-2 text-[10px] text-[#909b88]">
          <span>Universal Command Palette</span>
          <span>
            Navigate with <kbd className="text-[#d6b878]">↑</kbd> <kbd className="text-[#d6b878]">↓</kbd> · Select with <kbd className="text-[#d6b878]">↵</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
