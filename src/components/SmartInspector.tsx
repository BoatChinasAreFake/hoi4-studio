import React, { useState, useEffect } from 'react';
import type { FocusNodeData, FocusTemplate } from '../types/focus';
import Editor from '@monaco-editor/react';
import {
  Sliders,
  FileCode,
  Zap,
  Trash2,
  Copy,
  X,
  BookmarkPlus,
  Image as ImageIcon
} from 'lucide-react';
import { getCachedGoalIconUrl } from '../utils/goalIcons';
import { IconPickerModal } from './IconPickerModal';

interface SmartInspectorProps {
  selectedFocus: FocusNodeData | null;
  allFocuses: FocusNodeData[];
  width?: number;
  onUpdateFocus: (updated: FocusNodeData) => void;
  onDuplicateFocus: (focus: FocusNodeData) => void;
  onDeleteFocus: (focusId: string) => void;
  onSaveAsTemplate?: (template: FocusTemplate) => void;
  onTriggerHotReload: () => void;
  onClose: () => void;
}

export const SmartInspector: React.FC<SmartInspectorProps> = ({
  selectedFocus,
  allFocuses,
  width = 360,
  onUpdateFocus,
  onDuplicateFocus,
  onDeleteFocus,
  onSaveAsTemplate,
  onTriggerHotReload,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [localFocus, setLocalFocus] = useState<FocusNodeData | null>(selectedFocus);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    setLocalFocus(selectedFocus);
  }, [selectedFocus]);

  if (!localFocus) {
    return (
      <aside
        style={{ width: `${width}px` }}
        className="flex h-full flex-col items-center justify-center border-l border-[#30392e] bg-[#181e19] p-6 text-center text-[#909b88] select-none shrink-0 transition-[width] duration-75 relative"
      >
        <button
          onClick={onClose}
          title="Close Inspector"
          className="absolute top-3 right-3 rounded p-1 text-[#909b88] hover:bg-[#253023] hover:text-[#e3e5d9]"
        >
          <X className="h-4 w-4" />
        </button>
        <Sliders className="mb-3 h-10 w-10 text-[#3a4534]" />
        <h3 className="brand-serif text-lg font-bold text-[#e3e5d9]">Focus Inspector</h3>
        <p className="mt-1 text-xs text-[#909b88] leading-relaxed">
          Select a focus on the canvas to edit its properties, triggers, rewards, and connections.
        </p>
      </aside>
    );
  }

  const handleChange = (field: keyof FocusNodeData, value: any) => {
    const updated = { ...localFocus, [field]: value };
    setLocalFocus(updated);
    onUpdateFocus(updated);
  };

  const flatParents = localFocus.prerequisites.flat();

  const handleRemoveParent = (parentId: string) => {
    const nextPrereqs = localFocus.prerequisites
      .map((group) => group.filter((id) => id !== parentId))
      .filter((group) => group.length > 0);
    handleChange('prerequisites', nextPrereqs);
  };

  const handleRemoveExclusive = (exclId: string) => {
    const nextExclusive = localFocus.mutually_exclusive.filter((id) => id !== exclId);
    handleChange('mutually_exclusive', nextExclusive);
  };

  const handleSaveToPalette = () => {
    if (!onSaveAsTemplate) return;
    const tpl: FocusTemplate = {
      id: `tpl_${localFocus.id}`,
      name: localFocus.name || localFocus.id,
      symbol: localFocus.symbol || '★',
      icon: localFocus.icon,
      cost: localFocus.cost,
      reward: localFocus.reward || '',
    };
    onSaveAsTemplate(tpl);
  };

  const iconPreviewUrl = getCachedGoalIconUrl(localFocus.icon);

  // Raw block representation for Monaco
  const rawScriptBlock = `focus = {
    id = ${localFocus.id}
    icon = ${localFocus.icon}
    cost = ${localFocus.cost}
    x = ${localFocus.x}
    y = ${localFocus.y}
${localFocus.relative_position_id ? `    relative_position_id = ${localFocus.relative_position_id}\n` : ''}${
    flatParents.length > 0
      ? localFocus.prereqMode === 'any'
        ? `    prerequisite = { ${flatParents.map((id) => `focus = ${id}`).join(' ')} }\n`
        : flatParents.map((id) => `    prerequisite = { focus = ${id} }\n`).join('')
      : ''
  }${
    localFocus.mutually_exclusive.length > 0
      ? `    mutually_exclusive = { ${localFocus.mutually_exclusive.map((id) => `focus = ${id}`).join(' ')} }\n`
      : ''
  }${
    localFocus.available
      ? `    available = {\n${localFocus.available
          .split('\n')
          .map((l) => `        ${l}`)
          .join('\n')}\n    }\n`
      : ''
  }${
    localFocus.reward
      ? `    completion_reward = {\n${localFocus.reward
          .split('\n')
          .map((l) => `        ${l}`)
          .join('\n')}\n    }\n`
      : ''
  }${localFocus.ai !== undefined ? `    ai_will_do = { factor = ${localFocus.ai} }\n` : ''}}`;

  return (
    <aside
      style={{ width: `${width}px` }}
      className="flex h-full flex-col border-l border-[#30392e] bg-[#181e19] text-[#e3e5d9] select-none shadow-2xl shrink-0 transition-[width] duration-75"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#30392e] px-4 py-3 bg-[#1a211a]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[1.6px] uppercase text-[#909b88]">
            Focus Inspector
          </span>
          <span className="rounded border border-[#48583b] bg-[#111710] px-1.5 py-0.5 font-mono text-[10px] text-[#a6bd87]">
            {localFocus.x}, {localFocus.y}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTriggerHotReload}
            title="Fire 'reload focus' in HOI4"
            className="flex items-center gap-1 rounded bg-[#d6b878]/15 border border-[#d6b878]/40 px-2 py-0.5 text-[10px] font-semibold text-[#d6b878] hover:bg-[#d6b878]/25 transition"
          >
            <Zap className="h-3 w-3" />
            Reload
          </button>
          <button
            onClick={onClose}
            title="Close Inspector"
            className="rounded p-1 text-[#909b88] hover:bg-[#253023] hover:text-[#e3e5d9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#30392e] bg-[#141a15] text-xs">
        <button
          onClick={() => setActiveTab('visual')}
          className={`flex-1 py-2 font-medium transition ${
            activeTab === 'visual'
              ? 'border-b-2 border-[#d6b878] text-[#d6b878] bg-[#20281e]'
              : 'text-[#909b88] hover:text-[#e3e5d9]'
          }`}
        >
          Form Editor
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-2 font-medium transition flex items-center justify-center gap-1.5 ${
            activeTab === 'code'
              ? 'border-b-2 border-[#d6b878] text-[#d6b878] bg-[#20281e]'
              : 'text-[#909b88] hover:text-[#e3e5d9]'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" />
          Clausewitz Script
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'visual' ? (
          <>
            {/* Title / Name */}
            <div>
              <label className="block text-[11px] text-[#909b88] mb-1">Display Name</label>
              <input
                type="text"
                value={localFocus.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
              />
            </div>

            {/* Focus ID */}
            <div>
              <label className="block text-[11px] text-[#909b88] mb-1">Focus ID</label>
              <input
                type="text"
                value={localFocus.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* Coordinates and Cost */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-[#909b88] mb-1">Grid X</label>
                <input
                  type="number"
                  step="1"
                  value={localFocus.x}
                  onChange={(e) => handleChange('x', parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border border-[#364231] bg-[#111710] px-2 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#909b88] mb-1">Grid Y</label>
                <input
                  type="number"
                  step="1"
                  value={localFocus.y}
                  onChange={(e) => handleChange('y', parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border border-[#364231] bg-[#111710] px-2 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#909b88] mb-1">Cost (wks)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={localFocus.cost}
                  onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 10)}
                  className="w-full rounded border border-[#364231] bg-[#111710] px-2 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                />
              </div>
            </div>

            {/* Icon & Emblem */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] text-[#909b88]">Icon Sprite</label>
                <button
                  type="button"
                  onClick={() => setIconPickerOpen(true)}
                  className="flex items-center gap-1 text-[10px] text-[#d6b878] hover:underline"
                >
                  <ImageIcon className="h-3 w-3" />
                  Browse 1,300+ HOI4 Icons
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#364231] bg-[#111710] p-1">
                  {iconPreviewUrl ? (
                    <img
                      src={iconPreviewUrl}
                      alt={localFocus.icon}
                      className="max-h-full max-w-full object-contain filter drop-shadow"
                    />
                  ) : (
                    <span className="text-lg text-[#d6b878]">{localFocus.symbol || '★'}</span>
                  )}
                </div>

                <input
                  type="text"
                  value={localFocus.icon}
                  onChange={(e) => handleChange('icon', e.target.value)}
                  className="flex-1 rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Emblem Select */}
            <div>
              <label className="block text-[11px] text-[#909b88] mb-1">Fallback Emblem</label>
              <select
                value={localFocus.symbol || '★'}
                onChange={(e) => handleChange('symbol', e.target.value)}
                className="w-full rounded border border-[#364231] bg-[#111710] px-2 py-1.5 text-sm text-[#d6b878] focus:border-[#d6b878] focus:outline-none"
              >
                <option value="★">★ Star</option>
                <option value="⚒">⚒ Industry</option>
                <option value="⚑">⚑ Army</option>
                <option value="⚙">⚙ Gear</option>
                <option value="✦">✦ Diamond</option>
                <option value="⚓">⚓ Navy</option>
                <option value="✈">✈ Air</option>
                <option value="♜">♜ Defense</option>
                <option value="☀">☀ Sun</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] text-[#909b88] mb-1">
                Description (for Localization)
              </label>
              <textarea
                value={localFocus.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                placeholder="Historic background or narrative text..."
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
              />
            </div>

            <div className="border-t border-[#30392e]" />

            {/* Connections */}
            <div>
              <h2 className="text-[11px] font-semibold tracking-[1.6px] uppercase text-[#909b88] mb-2">
                Connections
              </h2>

              <label className="block text-[11px] text-[#909b88] mb-1">Prerequisite Rule</label>
              <select
                value={localFocus.prereqMode || 'all'}
                onChange={(e) => handleChange('prereqMode', e.target.value)}
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none mb-3"
              >
                <option value="all">All parents required (AND)</option>
                <option value="any">Any parent required (OR)</option>
              </select>

              <div className="space-y-1.5 text-xs">
                {flatParents.map((parentId) => {
                  const parentFocus = allFocuses.find((f) => f.id === parentId);
                  return (
                    <div
                      key={parentId}
                      className="flex items-center justify-between rounded bg-[#20281e] px-2.5 py-1.5 border border-[#3a4534]"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-[#a6bd87] truncate">
                        <span>↳</span>
                        <span className="text-[#e3e5d9]">{parentFocus?.name || parentId}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParent(parentId)}
                        className="text-[#909b88] hover:text-[#bd785c] px-1 font-bold text-sm"
                        title="Remove prerequisite"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {localFocus.mutually_exclusive.map((exclId) => {
                  const exclFocus = allFocuses.find((f) => f.id === exclId);
                  return (
                    <div
                      key={exclId}
                      className="flex items-center justify-between rounded bg-[#2a201c] px-2.5 py-1.5 border border-[#bd785c]/40"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-[#bd785c] truncate">
                        <span>⇄</span>
                        <span className="text-[#e3e5d9]">{exclFocus?.name || exclId}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusive(exclId)}
                        className="text-[#909b88] hover:text-[#bd785c] px-1 font-bold text-sm"
                        title="Remove mutual exclusion"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {flatParents.length === 0 && localFocus.mutually_exclusive.length === 0 && (
                  <p className="text-[11px] text-[#909b88] italic">
                    No connections yet. Use Prerequisite or Exclusive toolbar modes to link nodes.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-[#30392e]" />

            {/* Scripting */}
            <div>
              <h2 className="text-[11px] font-semibold tracking-[1.6px] uppercase text-[#909b88] mb-2">
                Scripting
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[#909b88] mb-1">
                    Completion Reward
                  </label>
                  <textarea
                    value={localFocus.reward || ''}
                    onChange={(e) => handleChange('reward', e.target.value)}
                    rows={4}
                    spellCheck={false}
                    className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-[11px] text-[#c4d3af] focus:border-[#d6b878] focus:outline-none"
                    placeholder="add_political_power = 120"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#909b88] mb-1">
                    Available Trigger (Optional)
                  </label>
                  <textarea
                    value={localFocus.available || ''}
                    onChange={(e) => handleChange('available', e.target.value)}
                    rows={2}
                    spellCheck={false}
                    className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-[11px] text-[#c4d3af] focus:border-[#d6b878] focus:outline-none"
                    placeholder="has_war = no"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#909b88] mb-1">AI Will Do Factor</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={localFocus.ai ?? 1}
                    onChange={(e) => handleChange('ai', parseFloat(e.target.value) || 1)}
                    className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[480px] overflow-hidden rounded border border-[#364231]">
            <Editor
              height="100%"
              defaultLanguage="yaml"
              theme="vs-dark"
              value={rawScriptBlock}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderWhitespace: 'none',
                readOnly: true,
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="flex flex-col gap-2 border-t border-[#30392e] bg-[#1a211a] p-3">
        <button
          type="button"
          onClick={handleSaveToPalette}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[#d6b878]/50 bg-[#d6b878]/15 py-1.5 text-xs font-semibold text-[#d6b878] hover:bg-[#d6b878]/25 transition"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save as Palette Template
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicateFocus(localFocus)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] py-1.5 text-xs font-semibold text-[#e3e5d9] hover:bg-[#354130] transition"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => onDeleteFocus(localFocus.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#bd785c]/40 bg-[#bd785c]/15 py-1.5 text-xs font-semibold text-[#e0a18d] hover:bg-[#bd785c]/30 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Icon Picker Modal */}
      {iconPickerOpen && (
        <IconPickerModal
          isOpen={true}
          currentIcon={localFocus.icon}
          onSelectIcon={(iconName) => {
            handleChange('icon', iconName);
            setIconPickerOpen(false);
          }}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
    </aside>
  );
};
