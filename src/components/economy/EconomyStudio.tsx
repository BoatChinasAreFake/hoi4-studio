import React, { useState, useEffect } from 'react';
import { TechTreeCanvas } from './TechTreeCanvas';
import { SpecialProjectsStudio } from './SpecialProjectsStudio';
import { RaidsStudio } from './RaidsStudio';
import { MarketStudio } from './MarketStudio';
import { ResourcesBuildingsStudio } from './ResourcesBuildingsStudio';
import { ResearchFolderTool } from './ResearchFolderTool';
import {
  FolderTree,
  Atom,
  Crosshair,
  ShoppingBag,
  Gem,
  Cpu,
  FolderPlus
} from 'lucide-react';

export type EconomyTab =
  | 'techtree'
  | 'special_projects'
  | 'raids'
  | 'market'
  | 'resources'
  | 'research_folder';

interface EconomyStudioProps {
  initialTab?: EconomyTab;
  onNotify?: (msg: string) => void;
}

export const EconomyStudio: React.FC<EconomyStudioProps> = ({
  initialTab = 'techtree',
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<EconomyTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const TABS: { id: EconomyTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'techtree',
      label: 'Technology Tree (120x150 Grid)',
      icon: <FolderTree className="h-3.5 w-3.5" />,
    },
    {
      id: 'special_projects',
      label: 'Special Projects (Götterdämmerung)',
      icon: <Atom className="h-3.5 w-3.5" />,
    },
    {
      id: 'raids',
      label: 'Tactical Raids Studio',
      icon: <Crosshair className="h-3.5 w-3.5" />,
    },
    {
      id: 'market',
      label: 'International Market & Subsidies (AAT)',
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
    },
    {
      id: 'resources',
      label: 'Resources & Custom Buildings',
      icon: <Gem className="h-3.5 w-3.5" />,
    },
    {
      id: 'research_folder',
      label: 'Custom Research Folder',
      icon: <FolderPlus className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Navigation Sub-Strip for Economy Hub */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#71806b] font-mono">
          <Cpu className="h-3.5 w-3.5 text-sky-400" />
          <span>Hub 5 · Economy & Technology</span>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'techtree' && <TechTreeCanvas onNotify={onNotify} />}
        {activeTab === 'special_projects' && <SpecialProjectsStudio onNotify={onNotify} />}
        {activeTab === 'raids' && <RaidsStudio onNotify={onNotify} />}
        {activeTab === 'market' && <MarketStudio onNotify={onNotify} />}
        {activeTab === 'resources' && <ResourcesBuildingsStudio onNotify={onNotify} />}
        {activeTab === 'research_folder' && <ResearchFolderTool onNotify={onNotify} />}
      </div>
    </div>
  );
};
