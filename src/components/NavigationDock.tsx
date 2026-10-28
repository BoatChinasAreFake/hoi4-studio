import React from 'react';
import {
  BookOpen,
  Shield,
  Map,
  Landmark,
  Cpu,
  Palette,
  FlaskConical,
  Zap,
  Search,
  CheckCircle2
} from 'lucide-react';
import type { ActivityHub } from '../types/focus';

interface NavigationDockProps {
  activeHub: ActivityHub;
  onSelectHub: (hub: ActivityHub) => void;
  onOpenPalette: () => void;
  onTriggerHotReload: () => void;
}

export const NavigationDock: React.FC<NavigationDockProps> = ({
  activeHub,
  onSelectHub,
  onOpenPalette,
  onTriggerHotReload,
}) => {
  const hubs: { id: ActivityHub; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'narrative', label: 'Narrative & Content', icon: <BookOpen className="h-5 w-5" />, shortcut: '1' },
    { id: 'military', label: 'Military & Warfare', icon: <Shield className="h-5 w-5" />, shortcut: '2' },
    { id: 'map', label: 'World & Map Studio', icon: <Map className="h-5 w-5" />, shortcut: '3' },
    { id: 'politics', label: 'Politics & Diplomacy', icon: <Landmark className="h-5 w-5" />, shortcut: '4' },
    { id: 'economy', label: 'Economy & Tech', icon: <Cpu className="h-5 w-5" />, shortcut: '5' },
    { id: 'ui', label: 'UI & Media', icon: <Palette className="h-5 w-5" />, shortcut: '6' },
    { id: 'simulation', label: 'Simulation & Tools', icon: <FlaskConical className="h-5 w-5" />, shortcut: '7' },
  ];

  return (
    <aside className="flex w-14 flex-col items-center justify-between border-r border-[#30392e] bg-[#101512] py-3 select-none z-20">
      {/* Top: Logo / Branding */}
      <div className="flex flex-col items-center">
        <div
          title="HOI4 Studio"
          className="flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-[#a88e55] to-[#536044] text-[#101512] font-black text-base shadow border border-[#d6b878]/60 cursor-pointer"
        >
          <span>✥</span>
        </div>
      </div>

      {/* Middle: 7 Activity Hubs */}
      <nav className="flex flex-col gap-2 my-auto">
        {hubs.map((hub) => {
          const isActive = activeHub === hub.id;
          return (
            <button
              key={hub.id}
              onClick={() => onSelectHub(hub.id)}
              title={`${hub.label} (Hub ${hub.shortcut})`}
              className={`relative flex h-10 w-10 items-center justify-center rounded transition duration-150 group ${
                isActive
                  ? 'bg-[#354130] text-[#d6b878] border border-[#d6b878]/60 shadow-inner'
                  : 'text-[#909b88] hover:bg-[#1f281d] hover:text-[#e3e5d9]'
              }`}
            >
              {hub.icon}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#d6b878]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Tools & Hot-Reload */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onTriggerHotReload}
          title="Live Game Hot-Reload (reload focus in HOI4)"
          className="flex h-9 w-9 items-center justify-center rounded bg-[#1f281d] text-[#d6b878] border border-[#3b4936] hover:bg-[#354130] hover:border-[#d6b878] transition"
        >
          <Zap className="h-4 w-4" />
        </button>

        <button
          onClick={onOpenPalette}
          title="Command Palette (Ctrl+K)"
          className="flex h-9 w-9 items-center justify-center rounded bg-[#1f281d] text-[#909b88] border border-[#30392e] hover:bg-[#253023] hover:text-[#e3e5d9] transition"
        >
          <Search className="h-4 w-4" />
        </button>

        <div title="Paradox error.log: Clean - No syntax errors" className="flex items-center justify-center p-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#a6bd87]" />
        </div>
      </div>
    </aside>
  );
};
