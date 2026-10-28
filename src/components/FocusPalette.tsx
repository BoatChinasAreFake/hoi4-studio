import React, { useState } from 'react';
import { CheckCheck, RotateCcw, Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import type { FocusProject, FocusTemplate } from '../types/focus';
import { getCachedGoalIconUrl } from '../utils/goalIcons';
import { IconPickerModal } from './IconPickerModal';

export const DEFAULT_TEMPLATES: FocusTemplate[] = [
  {
    id: 'tpl_political',
    name: 'Political',
    symbol: '★',
    icon: 'GFX_goal_generic_political_pressure',
    cost: 10,
    reward: 'add_political_power = 120',
  },
  {
    id: 'tpl_industrial',
    name: 'Industrial',
    symbol: '⚒',
    icon: 'GFX_goal_generic_construct_civ_factory',
    cost: 10,
    reward: 'add_political_power = 50\nrandom_owned_controlled_state = {\n    limit = { free_building_slots = { building = industrial_complex size > 0 } }\n    add_building_construction = { type = industrial_complex level = 1 instant_build = yes }\n}',
  },
  {
    id: 'tpl_army',
    name: 'Army',
    symbol: '⚑',
    icon: 'GFX_goal_generic_army_doctrines',
    cost: 10,
    reward: 'add_army_experience = 25',
  },
  {
    id: 'tpl_naval',
    name: 'Naval',
    symbol: '⚓',
    icon: 'GFX_goal_generic_navy_doctrines',
    cost: 10,
    reward: 'add_navy_experience = 25',
  },
  {
    id: 'tpl_air',
    name: 'Air Force',
    symbol: '✈',
    icon: 'GFX_goal_generic_air_doctrine',
    cost: 10,
    reward: 'add_air_experience = 25',
  },
];

interface FocusPaletteProps {
  project: FocusProject;
  width?: number;
  onUpdateProject: (updates: Partial<FocusProject>) => void;
  onAddFromTemplate: (template: FocusTemplate) => void;
  onValidate: () => void;
  onResetDefault: () => void;
  onNewProject: () => void;
}

export const FocusPalette: React.FC<FocusPaletteProps> = ({
  project,
  width = 240,
  onUpdateProject,
  onAddFromTemplate,
  onValidate,
  onResetDefault,
  onNewProject,
}) => {
  const templates = project.templates && project.templates.length > 0
    ? project.templates
    : DEFAULT_TEMPLATES;

  const [editingTemplate, setEditingTemplate] = useState<FocusTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const prereqCount = project.nodes.reduce(
    (acc, n) => acc + n.prerequisites.reduce((sum, g) => sum + g.length, 0),
    0
  );

  const handleDragStart = (e: React.DragEvent, template: FocusTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleSaveTemplate = (tpl: FocusTemplate) => {
    const exists = templates.some((t) => t.id === tpl.id);
    let next: FocusTemplate[];
    if (exists) {
      next = templates.map((t) => (t.id === tpl.id ? tpl : t));
    } else {
      next = [...templates, tpl];
    }
    onUpdateProject({ templates: next });
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (templates.length <= 1) {
      alert('You must keep at least one template.');
      return;
    }
    const next = templates.filter((t) => t.id !== id);
    onUpdateProject({ templates: next });
  };

  const handleResetTemplates = () => {
    if (confirm('Reset focus templates to defaults?')) {
      onUpdateProject({ templates: DEFAULT_TEMPLATES });
    }
  };

  const handleStartCreate = () => {
    const newTpl: FocusTemplate = {
      id: `tpl_custom_${Date.now().toString().slice(-4)}`,
      name: 'Custom Focus',
      symbol: '✦',
      icon: 'GFX_goal_generic_political_pressure',
      cost: 10,
      reward: 'add_political_power = 50',
    };
    setEditingTemplate(newTpl);
    setIsCreating(true);
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="flex flex-col border-r border-[#30392e] bg-[#181e19] text-[#e3e5d9] select-none overflow-y-auto shrink-0 transition-[width] duration-75"
    >
      <div className="p-4 space-y-5">
        {/* Project Header */}
        <div>
          <h2 className="text-[11px] font-semibold tracking-[1.6px] uppercase text-[#909b88] mb-1">
            Project
          </h2>
          <h3 className="brand-serif text-lg font-bold text-[#e3e5d9] leading-tight truncate">
            {project.title || project.treeId.replace(/_/g, ' ')}
          </h3>
          <p className="text-[11px] text-[#909b88] mt-0.5">National focus tree</p>

          <div className="mt-3 space-y-2">
            <div>
              <label className="block text-[10px] text-[#909b88] uppercase tracking-wider mb-1">
                Tree ID
              </label>
              <input
                type="text"
                value={project.treeId}
                onChange={(e) => onUpdateProject({ treeId: e.target.value })}
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#909b88] uppercase tracking-wider mb-1">
                Country Tag
              </label>
              <input
                type="text"
                maxLength={3}
                value={project.tag}
                onChange={(e) => onUpdateProject({ tag: e.target.value.toUpperCase() })}
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest text-[#d6b878] focus:border-[#d6b878] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#30392e]" />

        {/* Focus Palette */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[11px] font-semibold tracking-[1.6px] uppercase text-[#909b88]">
              Focus Palette
            </h2>
            <button
              onClick={handleStartCreate}
              title="Add custom focus template"
              className="flex items-center gap-1 rounded border border-[#3b4936] bg-[#242d23] px-2 py-0.5 text-[10px] font-medium text-[#d6b878] hover:bg-[#354130] transition"
            >
              <Plus className="h-3 w-3" />
              Custom
            </button>
          </div>
          <p className="text-[11px] text-[#909b88] mb-2.5">
            Drag or double-click to add to tree.
          </p>

          <div className="space-y-2">
            {templates.map((tpl) => {
              const iconUrl = getCachedGoalIconUrl(tpl.icon);
              return (
                <div
                  key={tpl.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, tpl)}
                  onDoubleClick={() => onAddFromTemplate(tpl)}
                  title="Double click or drag onto canvas"
                  className="flex items-center gap-2.5 rounded border border-[#3a4534] bg-[#20281e] p-2 transition hover:border-[#d6b878] cursor-grab active:cursor-grabbing group relative"
                >
                  {/* Icon Thumbnail or Symbol */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#111710] border border-[#364231]">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={tpl.name}
                        className="max-h-8 max-w-8 object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <span className="text-xl text-[#d6b878] font-serif">
                        {tpl.symbol}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <b className="block text-[12px] font-medium text-[#e3e5d9] leading-tight truncate">
                      {tpl.name}
                    </b>
                    <span className="block text-[9px] text-[#909b88] tracking-wider mt-0.5 uppercase">
                      {Math.round(tpl.cost * 7)} Days · Drag to add
                    </span>
                  </div>

                  {/* Edit / Delete Buttons on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTemplate(tpl);
                        setIsCreating(false);
                      }}
                      title="Edit template"
                      className="rounded p-1 text-[#909b88] hover:bg-[#354130] hover:text-[#d6b878]"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                      title="Delete template"
                      className="rounded p-1 text-[#909b88] hover:bg-[#354130] hover:text-[#bd785c]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              onClick={handleResetTemplates}
              className="text-[10px] text-[#909b88] hover:text-[#e3e5d9] underline underline-offset-2"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="border-t border-[#30392e]" />

        {/* Workspace Stats & Validation */}
        <div>
          <h2 className="text-[11px] font-semibold tracking-[1.6px] uppercase text-[#909b88] mb-1">
            Your Workspace
          </h2>
          <div className="text-[11px] leading-relaxed text-[#909b88]">
            <span className="font-medium text-[#e3e5d9]">{project.nodes.length}</span> focuses ·{' '}
            <span className="font-medium text-[#e3e5d9]">{prereqCount}</span> prerequisites
          </div>

          <button
            onClick={onValidate}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-3 py-2 text-xs font-semibold text-[#e3e5d9] hover:bg-[#354130] hover:border-[#d6b878] transition"
          >
            <CheckCheck className="h-3.5 w-3.5 text-[#a6bd87]" />
            Validate Tree
          </button>

          {/* Quick Guide Box */}
          <div className="mt-3 rounded border-l-2 border-[#777951] bg-[#22291e] p-2.5 text-[11px] leading-relaxed text-[#aab39f]">
            <div>• Drag canvas to pan</div>
            <div>• Scroll mouse to zoom</div>
            <div>• Connect: click parent, then child</div>
            <div>• Delete removes selected focus</div>
            <div>• <kbd className="text-[#d6b878]">Ctrl+Z</kbd> to undo</div>
          </div>

          <button
            onClick={onResetDefault}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-3 py-1.5 text-xs font-semibold text-[#d6b878] hover:text-[#e0c587] hover:bg-[#354130] transition"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Example Tree
          </button>

          <button
            onClick={onNewProject}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-[#3b4936] bg-[#1a211a] px-3 py-1.5 text-xs text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#20281e] transition"
          >
            <RotateCcw className="h-3 w-3" />
            New Blank Tree
          </button>
        </div>
      </div>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
          <div className="flex w-full max-w-md flex-col rounded-lg border border-[#526044] bg-[#181e19] text-[#e3e5d9] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#30392e] pb-3">
              <h3 className="brand-serif text-base font-bold text-[#e3e5d9]">
                {isCreating ? 'Create Focus Template' : 'Edit Focus Template'}
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-[#909b88] mb-1">Template Name</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#909b88] mb-1">Emblem Symbol</label>
                <select
                  value={editingTemplate.symbol}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, symbol: e.target.value })
                  }
                  className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 text-sm text-[#d6b878] focus:border-[#d6b878] focus:outline-none"
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

              <div>
                <label className="block text-[11px] text-[#909b88] mb-1">Cost (Weeks)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={editingTemplate.cost}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      cost: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-[#909b88]">Icon Sprite</label>
                <button
                  type="button"
                  onClick={() => setIconPickerOpen(true)}
                  className="flex items-center gap-1 text-[10px] text-[#d6b878] hover:underline"
                >
                  <ImageIcon className="h-3 w-3" />
                  Browse Icons
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTemplate.icon}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, icon: e.target.value })
                  }
                  className="flex-1 rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                />
                {getCachedGoalIconUrl(editingTemplate.icon) && (
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-[#364231] bg-[#111710] p-1">
                    <img
                      src={getCachedGoalIconUrl(editingTemplate.icon)!}
                      alt="preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#909b88] mb-1">
                Default Completion Reward Script
              </label>
              <textarea
                rows={3}
                value={editingTemplate.reward}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, reward: e.target.value })
                }
                className="w-full rounded border border-[#364231] bg-[#111710] px-2.5 py-1.5 font-mono text-[11px] text-[#c4d3af] focus:border-[#d6b878] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30392e]">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="rounded border border-[#3b4936] bg-[#242d23] px-3 py-1.5 text-xs text-[#e3e5d9] hover:bg-[#354130]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveTemplate(editingTemplate)}
                className="rounded bg-[#d6b878] px-4 py-1.5 text-xs font-bold text-[#1c2119] hover:bg-[#e0c587]"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon Picker for Template */}
      {iconPickerOpen && editingTemplate && (
        <IconPickerModal
          isOpen={true}
          currentIcon={editingTemplate.icon}
          onSelectIcon={(iconName) => {
            setEditingTemplate({ ...editingTemplate, icon: iconName });
            setIconPickerOpen(false);
          }}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
    </aside>
  );
};
