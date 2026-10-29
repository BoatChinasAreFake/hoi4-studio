import React, { useState, useEffect } from 'react';
import type { UiStudioTab, GuiElementDef } from '../../types/ui';
import { GuiBuilder } from './GuiBuilder';
import { MinigameTemplates } from './MinigameTemplates';
import { GfxBrowser } from './GfxBrowser';
import { FlagStudio } from './FlagStudio';
import { MusicStationStudio } from './MusicStationStudio';
import { WorkshopPackager } from './WorkshopPackager';
import { ProjectCheck } from './ProjectCheck';
import { AssetImport } from './AssetImport';
import {
  Layers,
  Landmark,
  Search,
  Flag,
  Radio,
  Package,
  ShieldCheck,
  ImagePlus,
} from 'lucide-react';

interface UiStudioProps {
  initialTab?: UiStudioTab;
  onNotify?: (msg: string) => void;
}

export const UiStudio: React.FC<UiStudioProps> = ({ initialTab = 'gui_builder', onNotify }) => {
  const [activeTab, setActiveTab] = useState<UiStudioTab>(initialTab);
  const [injectedGuiElements, setInjectedGuiElements] = useState<GuiElementDef[] | undefined>(undefined);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs: Array<{ id: UiStudioTab; label: string; icon: React.ReactNode }> = [
    { id: 'gui_builder', label: 'WYSIWYG .gui Builder', icon: <Layers className="h-4 w-4" /> },
    { id: 'minigames', label: 'Minigame Templates', icon: <Landmark className="h-4 w-4" /> },
    { id: 'gfx_browser', label: 'GFX Asset Browser', icon: <Search className="h-4 w-4" /> },
    { id: 'flag_studio', label: '1-Click Flag Studio', icon: <Flag className="h-4 w-4" /> },
    { id: 'music_station', label: 'Music Station & Radio', icon: <Radio className="h-4 w-4" /> },
    { id: 'workshop_packager', label: 'Steam Workshop Packager', icon: <Package className="h-4 w-4" /> },
    { id: 'project_check', label: 'Validate & Import/Export', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'asset_import', label: 'Image Import (Flags & Icons)', icon: <ImagePlus className="h-4 w-4" /> },
  ];

  const handleInjectFromMinigames = (elements: GuiElementDef[]) => {
    setInjectedGuiElements(elements);
    setActiveTab('gui_builder');
    onNotify?.('Injected template into GUI Builder canvas!');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#101512]">
      {/* Sub-Header Navigation Bar */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                    : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[10px] text-[#71806b] font-mono hidden md:inline">
          Hub 6 · UI & Media Studio
        </span>
      </div>

      {/* Active Studio View */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'gui_builder' && (
          <GuiBuilder onNotify={onNotify} initialElements={injectedGuiElements} />
        )}
        {activeTab === 'minigames' && (
          <MinigameTemplates onNotify={onNotify} onInjectTemplate={handleInjectFromMinigames} />
        )}
        {activeTab === 'gfx_browser' && (
          <GfxBrowser onNotify={onNotify} />
        )}
        {activeTab === 'flag_studio' && (
          <FlagStudio onNotify={onNotify} />
        )}
        {activeTab === 'music_station' && (
          <MusicStationStudio onNotify={onNotify} />
        )}
        {activeTab === 'project_check' && <ProjectCheck onNotify={onNotify} />}
        {activeTab === 'asset_import' && <AssetImport onNotify={onNotify} />}
        {activeTab === 'workshop_packager' && (
          <WorkshopPackager onNotify={onNotify} />
        )}
      </div>
    </div>
  );
};
