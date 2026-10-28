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
  RotateCcw
} from 'lucide-react';
import type { ActivityHub } from '../types/focus';

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
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
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
      id: 'hub_map',
      title: 'Switch to World & Map Studio (Province Slicer & River Pencil)',
      category: 'Navigation',
      icon: <Map className="h-4 w-4 text-sky-400" />,
      action: () => {
        onSelectHub('map');
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
      category: 'Content',
      icon: <Film className="h-4 w-4 text-purple-400" />,
      action: () => {
        onSelectHub('narrative');
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
        onClose();
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-xs pt-24 p-4 select-none">
      <div className="flex w-full max-w-xl flex-col rounded-lg border border-[#526044] bg-[#181e19] text-[#e3e5d9] shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#30392e] px-4 py-3 bg-[#1a211a]">
          <Search className="h-4 w-4 text-[#d6b878]" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search symbols (e.g. 'reload', 'export', 'validate', 'focus')..."
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
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left transition hover:bg-[#20281e] group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded p-1 bg-[#111710] border border-[#30392e]">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[#e3e5d9] group-hover:text-[#d6b878]">
                      {item.title}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#909b88]">
                  {item.category}
                </span>
              </button>
            ))
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
