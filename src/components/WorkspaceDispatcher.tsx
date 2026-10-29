import React, { useState, useEffect } from 'react';
import type { ActivityHub, FocusNodeData } from '../types/focus';
import { WorldMapStudio, type MapStudioTab } from './map/WorldMapStudio';
import { SandboxSimulator } from './simulation/SandboxSimulator';
import { PoliticsStudio, type PoliticsTab } from './politics/PoliticsStudio';
import { SuperEventStudio } from './narrative/SuperEventStudio';
import { MilitaryStudio, type MilitaryTab } from './military/MilitaryStudio';
import { EconomyStudio, type EconomyTab } from './economy/EconomyStudio';
import { UiStudio } from './ui/UiStudio';
import { ModOptimizer } from './ui/ModOptimizer';
import { PatchUpgrader } from './ui/PatchUpgrader';
import type { UiStudioTab, SimulationStudioTab } from '../types/ui';
import { GitBranch, Film, FlaskConical, HardDrive, GitMerge } from 'lucide-react';

interface WorkspaceDispatcherProps {
  activeHub: ActivityHub;
  narrativeView: React.ReactNode;
  focuses: FocusNodeData[];
  mapInitialTab?: MapStudioTab;
  politicsInitialTab?: PoliticsTab;
  militaryInitialTab?: MilitaryTab;
  economyInitialTab?: EconomyTab;
  uiInitialTab?: UiStudioTab;
  simulationInitialTab?: SimulationStudioTab;
  narrativeTab?: 'focus_tree' | 'super_events';
  onNotify?: (msg: string) => void;
  onSelectHub?: (hub: ActivityHub) => void;
}

export const WorkspaceDispatcher: React.FC<WorkspaceDispatcherProps> = ({
  activeHub,
  narrativeView,
  focuses,
  mapInitialTab = 'canvas',
  politicsInitialTab = 'characters',
  militaryInitialTab = 'chassis',
  economyInitialTab = 'techtree',
  uiInitialTab = 'gui_builder',
  simulationInitialTab = 'sandbox',
  narrativeTab = 'focus_tree',
  onNotify,
  onSelectHub: _onSelectHub,
}) => {
  const [internalNarrativeTab, setInternalNarrativeTab] = useState<'focus_tree' | 'super_events'>(
    narrativeTab
  );
  const [internalSimulationTab, setInternalSimulationTab] = useState<SimulationStudioTab>(
    simulationInitialTab
  );

  useEffect(() => {
    if (narrativeTab) setInternalNarrativeTab(narrativeTab);
  }, [narrativeTab]);

  useEffect(() => {
    if (simulationInitialTab) setInternalSimulationTab(simulationInitialTab);
  }, [simulationInitialTab]);

  switch (activeHub) {
    case 'narrative':
      // Hub 1: Focus Tree Canvas (Phase 1) + Super Event Studio (Phase 3)
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Sub-Header Tab Bar to Switch Between Focus Tree and Super Events */}
          <div className="h-9 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0 select-none z-20">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInternalNarrativeTab('focus_tree')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  internalNarrativeTab === 'focus_tree'
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" /> National Focus Tree
              </button>
              <button
                onClick={() => setInternalNarrativeTab('super_events')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  internalNarrativeTab === 'super_events'
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
                }`}
              >
                <Film className="h-3.5 w-3.5" /> Super Event Studio
              </button>
            </div>
            <span className="text-[10px] text-[#71806b] font-mono">
              Hub 5 · Narrative & Events
            </span>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {internalNarrativeTab === 'focus_tree' ? (
              <>{narrativeView}</>
            ) : (
              <SuperEventStudio onNotify={onNotify} />
            )}
          </div>
        </div>
      );

    case 'politics':
      // Hub 4: Politics, Leadership & Narrative Studio (Phase 3)
      return (
        <PoliticsStudio
          initialTab={politicsInitialTab}
          onNotify={onNotify}
        />
      );

    case 'map':
      // Hub 3: World & Map Studio (Phase 2)
      return (
        <WorldMapStudio
          initialTab={mapInitialTab}
          onNotify={onNotify}
        />
      );

    case 'simulation':
      // Hub 7: Game Logic Sandbox, Deadlock Solver, Mod Optimizer, and Patch Upgrader
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Sub-Header Tab Bar to Switch Between Sandbox, Optimizer, and Patch Upgrader */}
          <div className="h-9 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0 select-none z-20">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInternalSimulationTab('sandbox')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  internalSimulationTab === 'sandbox'
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5" /> Game Logic Sandbox
              </button>
              <button
                onClick={() => setInternalSimulationTab('optimizer')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  internalSimulationTab === 'optimizer'
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
                }`}
              >
                <HardDrive className="h-3.5 w-3.5" /> Mod Asset Optimizer
              </button>
              <button
                onClick={() => setInternalSimulationTab('patch_upgrader')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  internalSimulationTab === 'patch_upgrader'
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
                }`}
              >
                <GitMerge className="h-3.5 w-3.5" /> Vanilla Patch Upgrader
              </button>
            </div>
            <span className="text-[10px] text-[#71806b] font-mono">
              Hub 7 · Simulation & Tooling
            </span>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {internalSimulationTab === 'sandbox' && (
              <SandboxSimulator focuses={focuses} onNotify={onNotify} />
            )}
            {internalSimulationTab === 'optimizer' && (
              <ModOptimizer onNotify={onNotify} />
            )}
            {internalSimulationTab === 'patch_upgrader' && (
              <PatchUpgrader onNotify={onNotify} />
            )}
          </div>
        </div>
      );

    case 'military':
      // Hub 2: Military & Warfare Studio (Phase 4)
      return (
        <MilitaryStudio
          initialTab={militaryInitialTab}
          onNotify={onNotify}
        />
      );

    case 'economy':
      // Hub 5: Economy & Technology Studio (Phase 4)
      return (
        <EconomyStudio
          initialTab={economyInitialTab}
          onNotify={onNotify}
        />
      );

    case 'ui':
      // Hub 6: UI & Media Studio (Phase 5)
      return (
        <UiStudio
          initialTab={uiInitialTab}
          onNotify={onNotify}
        />
      );

    default:
      return <>{narrativeView}</>;
  }
};
