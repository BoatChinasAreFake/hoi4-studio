import React, { useState, useEffect } from 'react';
import { ChassisDesigner } from './ChassisDesigner';
import { DivisionDesigner } from './DivisionDesigner';
import { HqStudio } from './HqStudio';
import { DoctrineStudio } from './DoctrineStudio';
import {
  Shield,
  Layers,
  Radio,
  BookOpen,
} from 'lucide-react';

export type MilitaryTab =
  | 'chassis'
  | 'division'
  | 'hq'
  | 'doctrines';

interface MilitaryStudioProps {
  initialTab?: MilitaryTab;
  onNotify?: (msg: string) => void;
}

export const MilitaryStudio: React.FC<MilitaryStudioProps> = ({
  initialTab = 'chassis',
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<MilitaryTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const TABS: { id: MilitaryTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'chassis',
      label: 'Modular Equipment Designer (NSB / BBA / MtG)',
      icon: <Shield className="h-3.5 w-3.5" />,
    },
    {
      id: 'division',
      label: '5x5 Division Template Grid',
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      id: 'hq',
      label: 'Military Headquarters (HQs) & Auras',
      icon: <Radio className="h-3.5 w-3.5" />,
    },
    {
      id: 'doctrines',
      label: 'Doctrines & Special Forces',
      icon: <BookOpen className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Navigation Sub-Strip for Military Hub */}
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
          <Shield className="h-3.5 w-3.5 text-[#bd785c]" />
          <span>Hub 2 · Military & Warfare</span>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chassis' && <ChassisDesigner onNotify={onNotify} />}
        {activeTab === 'division' && <DivisionDesigner onNotify={onNotify} />}
        {activeTab === 'hq' && <HqStudio onNotify={onNotify} />}
        {activeTab === 'doctrines' && <DoctrineStudio onNotify={onNotify} />}
      </div>
    </div>
  );
};
