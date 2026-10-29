import React, { useState, useEffect } from 'react';
import { CharacterStudio } from './CharacterStudio';
import { CountryWizard } from './CountryWizard';
import { BopStudio } from './BopStudio';
import { FactionStudio } from './FactionStudio';
import { IdeologyStudio } from './IdeologyStudio';
import { AutonomyStudio } from './AutonomyStudio';
import { DiploActionsStudio } from './DiploActionsStudio';
import { LocalizationMatrix } from './LocalizationMatrix';
import { SymbolRefactorEngine } from './SymbolRefactorEngine';
import {
  Users,
  Globe,
  Scale,
  ShieldAlert,
  Compass,
  Layers,
  Handshake,
  Languages,
  Replace,
} from 'lucide-react';

export type PoliticsTab =
  | 'characters'
  | 'wizard'
  | 'bop'
  | 'factions'
  | 'ideology'
  | 'autonomy'
  | 'diplo'
  | 'loc'
  | 'refactor';

interface PoliticsStudioProps {
  initialTab?: PoliticsTab;
  onNotify?: (msg: string) => void;
}

export const PoliticsStudio: React.FC<PoliticsStudioProps> = ({
  initialTab = 'characters',
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<PoliticsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const TABS: { id: PoliticsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'characters',
      label: 'Characters & Captains',
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      id: 'wizard',
      label: 'Country Wizard',
      icon: <Globe className="h-3.5 w-3.5" />,
    },
    {
      id: 'bop',
      label: 'Balance of Power (BoP)',
      icon: <Scale className="h-3.5 w-3.5" />,
    },
    {
      id: 'factions',
      label: 'Factions (NCNS)',
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
    },
    {
      id: 'ideology',
      label: 'Ideology & Types',
      icon: <Compass className="h-3.5 w-3.5" />,
    },
    {
      id: 'autonomy',
      label: 'Autonomy & Puppets',
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      id: 'diplo',
      label: 'Scripted Diplo',
      icon: <Handshake className="h-3.5 w-3.5" />,
    },
    {
      id: 'loc',
      label: 'Localization Matrix (BOM)',
      icon: <Languages className="h-3.5 w-3.5" />,
    },
    {
      id: 'refactor',
      label: 'Symbol Refactoring',
      icon: <Replace className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      {/* Studio Tab Navigation Strip */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-3 flex items-center gap-1 shrink-0 overflow-x-auto select-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-[#d6b878] text-[#1c2119] shadow font-bold'
                : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Studio View */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'characters' && <CharacterStudio onNotify={onNotify} />}
        {activeTab === 'wizard' && <CountryWizard onNotify={onNotify} />}
        {activeTab === 'bop' && <BopStudio onNotify={onNotify} />}
        {activeTab === 'factions' && <FactionStudio onNotify={onNotify} />}
        {activeTab === 'ideology' && <IdeologyStudio onNotify={onNotify} />}
        {activeTab === 'autonomy' && <AutonomyStudio onNotify={onNotify} />}
        {activeTab === 'diplo' && <DiploActionsStudio onNotify={onNotify} />}
        {activeTab === 'loc' && <LocalizationMatrix onNotify={onNotify} />}
        {activeTab === 'refactor' && <SymbolRefactorEngine onNotify={onNotify} />}
      </div>
    </div>
  );
};
