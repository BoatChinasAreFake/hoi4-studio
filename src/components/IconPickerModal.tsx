import React, { useState, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { searchGoalIcons } from '../utils/goalIcons';

interface IconPickerModalProps {
  isOpen: boolean;
  currentIcon: string;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  currentIcon,
  onSelectIcon,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const icons = useMemo(() => {
    return searchGoalIcons(query, 120);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-lg border border-[#526044] bg-[#181e19] text-[#e3e5d9] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30392e] px-5 py-3.5 bg-[#1a211a]">
          <div>
            <h3 className="brand-serif text-lg font-bold text-[#e3e5d9]">
              HOI4 GFX Icon Browser
            </h3>
            <p className="text-xs text-[#909b88]">
              Select an authentic Hearts of Iron IV goal icon for your focus or template.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#909b88] hover:bg-[#253023] hover:text-[#e3e5d9]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center gap-2 border-b border-[#30392e] bg-[#141a15] px-4 py-2.5">
          <Search className="h-4 w-4 text-[#d6b878]" />
          <input
            type="text"
            autoFocus
            placeholder="Search icons (e.g. 'tank', 'industry', 'trade', 'navy', 'plane', 'ger')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#e3e5d9] placeholder-[#909b88] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Grid Gallery */}
        <div className="flex-1 overflow-y-auto p-4">
          {icons.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-[#909b88]">
              No icons matching "{query}"
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {icons.map((item) => {
                const isSelected = item.name === currentIcon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      onSelectIcon(item.name);
                      onClose();
                    }}
                    title={item.name}
                    className={`group relative flex flex-col items-center justify-center rounded border p-2 transition text-center ${
                      isSelected
                        ? 'border-[#d6b878] bg-[#d6b878]/15 ring-2 ring-[#d6b878]/50'
                        : 'border-[#364231] bg-[#111710] hover:border-[#a6bd87] hover:bg-[#20281e]'
                    }`}
                  >
                    <div className="h-12 w-12 flex items-center justify-center">
                      <img
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="mt-1 block w-full truncate font-mono text-[8px] text-[#909b88] group-hover:text-[#e3e5d9]">
                      {item.name.replace(/^GFX_goal_|^GFX_focus_|^GFX_/, '')}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 rounded-full bg-[#d6b878] p-0.5 text-[#101512]">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#30392e] bg-[#1a211a] px-5 py-2.5 text-xs text-[#909b88]">
          <span>Showing {icons.length} goal icons</span>
          <button
            onClick={onClose}
            className="rounded border border-[#3b4936] bg-[#242d23] px-3 py-1 text-xs font-semibold text-[#e3e5d9] hover:bg-[#354130]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
