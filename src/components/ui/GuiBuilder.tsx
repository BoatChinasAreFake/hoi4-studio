import React, { useState, useCallback, useMemo } from 'react';
import type { GuiElementDef, GuiElementType } from '../../types/ui';
import {
  Layers,
  Square,
  Type,
  Image as ImageIcon,
  MousePointer,
  Trash2,
  Copy,
  Code2,
  Sliders,
  Grid,
} from 'lucide-react';

interface GuiBuilderProps {
  onNotify?: (msg: string) => void;
  initialElements?: GuiElementDef[];
}

export const DEFAULT_GUI_ELEMENTS: GuiElementDef[] = [
  {
    id: 'win_main',
    type: 'containerWindowType',
    name: 'custom_diplo_window',
    position: { x: 40, y: 30 },
    size: { width: 480, height: 320 },
    orientation: 'center',
    children: [
      {
        id: 'bg_icon',
        type: 'iconType',
        name: 'window_background',
        position: { x: 0, y: 0 },
        size: { width: 480, height: 320 },
        spriteType: 'GFX_tiled_window_thin_border',
      },
      {
        id: 'header_txt',
        type: 'instantTextBoxType',
        name: 'window_title',
        position: { x: 20, y: 15 },
        size: { width: 440, height: 28 },
        font: 'hoi_24header',
        format: 'center',
        text: 'DIPLOMATIC SUMMIT OF LIBERTALIA',
      },
      {
        id: 'emblem_icon',
        type: 'iconType',
        name: 'national_emblem',
        position: { x: 200, y: 60 },
        size: { width: 80, height: 80 },
        spriteType: 'GFX_shield_medium',
      },
      {
        id: 'desc_txt',
        type: 'instantTextBoxType',
        name: 'summit_description',
        position: { x: 40, y: 155 },
        size: { width: 400, height: 70 },
        font: 'hoi_16mbs',
        format: 'left',
        text: 'The delegates of all democratic factions convene to ratify mutual defense treaties.',
      },
      {
        id: 'confirm_btn',
        type: 'buttonType',
        name: 'sign_treaty_button',
        position: { x: 160, y: 245 },
        size: { width: 160, height: 38 },
        font: 'hoi_18mbs',
        format: 'center',
        text: 'SIGN ACCORD',
        spriteType: 'GFX_button_148x34',
        clickSound: 'click_default',
      },
    ],
  },
];

export const GuiBuilder: React.FC<GuiBuilderProps> = ({ onNotify, initialElements }) => {
  const [elements, setElements] = useState<GuiElementDef[]>(initialElements || DEFAULT_GUI_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string>('win_main');
  const [snapToGrid, setSnapToGrid] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');

  // Flattened elements lookup
  const findElementRecursive = useCallback(
    (list: GuiElementDef[], id: string): GuiElementDef | null => {
      for (const el of list) {
        if (el.id === id) return el;
        if (el.children) {
          const found = findElementRecursive(el.children, id);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  const selectedElement = useMemo(
    () => findElementRecursive(elements, selectedId),
    [elements, selectedId, findElementRecursive]
  );

  // Update element property
  const handleUpdateElement = (id: string, updates: Partial<GuiElementDef>) => {
    const updateRecursive = (list: GuiElementDef[]): GuiElementDef[] => {
      return list.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        if (item.children) {
          return { ...item, children: updateRecursive(item.children) };
        }
        return item;
      });
    };

    setElements((prev) => updateRecursive(prev));
  };

  // Add new element
  const handleAddElement = (type: GuiElementType) => {
    const newId = `elem_${Date.now().toString().slice(-4)}`;
    const newEl: GuiElementDef = {
      id: newId,
      type,
      name: `${type}_${newId}`,
      position: { x: 50, y: 50 },
      size:
        type === 'containerWindowType'
          ? { width: 350, height: 200 }
          : type === 'instantTextBoxType'
          ? { width: 200, height: 24 }
          : type === 'buttonType'
          ? { width: 140, height: 34 }
          : { width: 64, height: 64 },
      font: type === 'instantTextBoxType' ? 'hoi_18mbs' : undefined,
      text: type === 'instantTextBoxType' ? 'Sample Text' : type === 'buttonType' ? 'Button' : undefined,
      spriteType:
        type === 'iconType'
          ? 'GFX_generic_icon'
          : type === 'buttonType'
          ? 'GFX_button_148x34'
          : undefined,
    };

    // If a container window is selected, append as child; otherwise top-level
    if (selectedElement && selectedElement.type === 'containerWindowType') {
      handleUpdateElement(selectedElement.id, {
        children: [...(selectedElement.children || []), newEl],
      });
    } else {
      setElements((prev) => [...prev, newEl]);
    }

    setSelectedId(newId);
    onNotify?.(`Added ${type}`);
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    const removeRecursive = (list: GuiElementDef[]): GuiElementDef[] => {
      return list
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: item.children ? removeRecursive(item.children) : undefined,
        }));
    };

    setElements((prev) => removeRecursive(prev));
    setSelectedId('win_main');
    onNotify?.(`Deleted element: ${id}`);
  };

  // Serialize to Clausewitz .gui syntax
  const serializeGuiElements = (list: GuiElementDef[], depth = 0): string => {
    const indent = '\t'.repeat(depth);
    let out = '';

    for (const el of list) {
      out += `${indent}${el.type} = {\n`;
      out += `${indent}\tname = "${el.name}"\n`;
      out += `${indent}\tposition = { x = ${el.position.x} y = ${el.position.y} }\n`;
      out += `${indent}\tsize = { width = ${el.size.width} height = ${el.size.height} }\n`;

      if (el.orientation) out += `${indent}\torientation = ${el.orientation}\n`;
      if (el.spriteType) out += `${indent}\tspriteType = "${el.spriteType}"\n`;
      if (el.font) out += `${indent}\tfont = "${el.font}"\n`;
      if (el.format) out += `${indent}\tformat = ${el.format}\n`;
      if (el.text) out += `${indent}\ttext = "${el.text}"\n`;
      if (el.pdxTooltip) out += `${indent}\tpdx_tooltip = "${el.pdxTooltip}"\n`;
      if (el.clickSound) out += `${indent}\tclicksound = "${el.clickSound}"\n`;

      if (el.children && el.children.length > 0) {
        out += serializeGuiElements(el.children, depth + 1);
      }

      out += `${indent}}\n\n`;
    }

    return out;
  };

  const serializedScript = useMemo(() => {
    return `# PARADOX CLAUSEWITZ .GUI SCRIPT GENERATOR\n# Created in HOI4 Studio GUI Builder\n\nguiTypes = {\n${serializeGuiElements(
      elements,
      1
    )}}`;
  }, [elements]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="border-b border-[#30392e] bg-[#141a15] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#1e271c] border border-[#3b4936]">
            <Layers className="h-5 w-5 text-[#d6b878]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#e3e5d9] flex items-center gap-2">
              WYSIWYG .gui Layout Builder
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20281e] text-[#d6b878] font-mono border border-[#3b4936]">
                Pixel-Perfect Canvas
              </span>
            </h2>
            <p className="text-xs text-[#909b88]">
              Interactive visual layout designer for containerWindowType, iconType, instantTextBoxType, and buttonType.
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* Snap Grid Toggle */}
          <div className="flex items-center gap-1 bg-[#181e19] px-2 py-1 rounded border border-[#30392e] text-xs">
            <Grid className="h-3.5 w-3.5 text-[#909b88]" />
            <span className="text-[#909b88]">Snap:</span>
            <select
              value={snapToGrid}
              onChange={(e) => setSnapToGrid(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-[#d6b878] focus:outline-none cursor-pointer"
            >
              <option value="1" className="bg-[#181e19]">1px</option>
              <option value="5" className="bg-[#181e19]">5px</option>
              <option value="10" className="bg-[#181e19]">10px</option>
              <option value="20" className="bg-[#181e19]">20px</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#181e19] p-1 rounded border border-[#30392e]">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'visual'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Visual Canvas
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'code'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Clausewitz Script (.gui)
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      {activeTab === 'visual' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbox */}
          <div className="w-56 border-r border-[#30392e] bg-[#141a15] p-3 flex flex-col gap-3 select-none">
            <span className="text-xs font-bold text-[#909b88] uppercase tracking-wider">
              GUI Widgets
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleAddElement('containerWindowType')}
                className="flex items-center gap-2 px-3 py-2 rounded bg-[#181e19] border border-[#2b3527] hover:border-[#d6b878] text-xs text-[#e3e5d9] transition"
              >
                <Square className="h-4 w-4 text-[#d6b878]" /> Container Window
              </button>
              <button
                onClick={() => handleAddElement('iconType')}
                className="flex items-center gap-2 px-3 py-2 rounded bg-[#181e19] border border-[#2b3527] hover:border-[#d6b878] text-xs text-[#e3e5d9] transition"
              >
                <ImageIcon className="h-4 w-4 text-sky-400" /> Icon / Sprite
              </button>
              <button
                onClick={() => handleAddElement('instantTextBoxType')}
                className="flex items-center gap-2 px-3 py-2 rounded bg-[#181e19] border border-[#2b3527] hover:border-[#d6b878] text-xs text-[#e3e5d9] transition"
              >
                <Type className="h-4 w-4 text-amber-400" /> Formatted Text Box
              </button>
              <button
                onClick={() => handleAddElement('buttonType')}
                className="flex items-center gap-2 px-3 py-2 rounded bg-[#181e19] border border-[#2b3527] hover:border-[#d6b878] text-xs text-[#e3e5d9] transition"
              >
                <MousePointer className="h-4 w-4 text-emerald-400" /> Interactive Button
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2b3527]">
              <span className="text-[11px] text-[#71806b] block">Hierarchy Tree:</span>
              <div className="mt-2 space-y-1 overflow-y-auto max-h-60">
                {elements.map((el) => (
                  <div key={el.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => setSelectedId(el.id)}
                      className={`text-left text-xs px-2 py-1 rounded font-mono truncate ${
                        selectedId === el.id ? 'bg-[#d6b878] text-[#101411] font-bold' : 'text-[#909b88] hover:text-[#e3e5d9]'
                      }`}
                    >
                      {el.name}
                    </button>
                    {el.children?.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setSelectedId(ch.id)}
                        className={`text-left text-xs pl-4 pr-2 py-0.5 rounded font-mono truncate ${
                          selectedId === ch.id ? 'bg-[#d6b878] text-[#101411] font-bold' : 'text-[#71806b] hover:text-[#e3e5d9]'
                        }`}
                      >
                        └ {ch.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Visual Canvas (Simulated Paradox Window) */}
          <div className="flex-1 bg-[#0c100e] p-8 flex items-center justify-center overflow-auto relative">
            {/* Visual Canvas Board */}
            <div className="relative w-[580px] h-[400px] bg-[#141a15] border-2 border-[#3b4936] rounded shadow-2xl overflow-hidden">
              {/* Grid pattern overlay */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, #3b4936 1px, transparent 1px), linear-gradient(to bottom, #3b4936 1px, transparent 1px)`,
                  backgroundSize: `${snapToGrid * 2}px ${snapToGrid * 2}px`,
                }}
              />

              {/* Render Elements */}
              {elements.map((el) => (
                <div
                  key={el.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(el.id);
                  }}
                  style={{
                    left: `${el.position.x}px`,
                    top: `${el.position.y}px`,
                    width: `${el.size.width}px`,
                    height: `${el.size.height}px`,
                  }}
                  className={`absolute rounded border transition cursor-move ${
                    selectedId === el.id
                      ? 'border-[#d6b878] bg-[#1e271c]/80 shadow-md z-20'
                      : 'border-[#30392e] bg-[#182019]/60 hover:border-[#526044]'
                  }`}
                >
                  {/* Container label */}
                  <span className="absolute top-1 left-2 text-[9px] font-mono text-[#d6b878] opacity-75">
                    {el.name}
                  </span>

                  {/* Render Children inside container */}
                  {el.children?.map((child) => (
                    <div
                      key={child.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(child.id);
                      }}
                      style={{
                        left: `${child.position.x}px`,
                        top: `${child.position.y}px`,
                        width: `${child.size.width}px`,
                        height: `${child.size.height}px`,
                      }}
                      className={`absolute rounded p-1 transition cursor-move ${
                        selectedId === child.id
                          ? 'border border-[#d6b878] bg-[#d6b878]/10 shadow-lg z-30'
                          : 'border border-dashed border-[#3b4936] hover:border-[#71806b]'
                      }`}
                    >
                      {child.type === 'instantTextBoxType' && (
                        <span
                          className={`block truncate text-xs ${
                            child.font === 'hoi_24header'
                              ? 'text-sm font-black text-[#d6b878]'
                              : 'text-xs text-[#e3e5d9]'
                          } ${
                            child.format === 'center'
                              ? 'text-center'
                              : child.format === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          {child.text}
                        </span>
                      )}

                      {child.type === 'iconType' && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#101512]/60 rounded">
                          <ImageIcon className="h-5 w-5 text-[#d6b878] opacity-70" />
                          <span className="text-[8px] font-mono text-[#909b88] truncate">
                            {child.spriteType}
                          </span>
                        </div>
                      )}

                      {child.type === 'buttonType' && (
                        <button className="w-full h-full rounded bg-[#2b3729] border border-[#d6b878]/70 text-[#d6b878] font-bold text-xs uppercase shadow hover:bg-[#354332]">
                          {child.text}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Right Property Inspector */}
          {selectedElement && (
            <div className="w-80 border-l border-[#30392e] bg-[#141a15] p-4 flex flex-col gap-4 select-none overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#2d372c] pb-2">
                <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                  <Sliders className="h-4 w-4" /> Element Inspector
                </span>
                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  title="Delete element"
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Element Name */}
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-[11px] text-[#909b88]">Element Identifier:</span>
                <input
                  type="text"
                  value={selectedElement.name}
                  onChange={(e) => handleUpdateElement(selectedElement.id, { name: e.target.value })}
                  className="bg-[#101411] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs font-mono text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              {/* Coordinates (x, y) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#909b88]">Position X:</span>
                  <input
                    type="number"
                    step={snapToGrid}
                    value={selectedElement.position.x}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        position: { ...selectedElement.position, x: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="bg-[#101411] border border-[#3b4936] rounded px-2 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#909b88]">Position Y:</span>
                  <input
                    type="number"
                    step={snapToGrid}
                    value={selectedElement.position.y}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        position: { ...selectedElement.position, y: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="bg-[#101411] border border-[#3b4936] rounded px-2 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
              </div>

              {/* Dimensions (width, height) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#909b88]">Width (px):</span>
                  <input
                    type="number"
                    step={snapToGrid}
                    value={selectedElement.size.width}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        size: { ...selectedElement.size, width: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="bg-[#101411] border border-[#3b4936] rounded px-2 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#909b88]">Height (px):</span>
                  <input
                    type="number"
                    step={snapToGrid}
                    value={selectedElement.size.height}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        size: { ...selectedElement.size, height: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="bg-[#101411] border border-[#3b4936] rounded px-2 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
              </div>

              {/* Text Property for instantTextBoxType or buttonType */}
              {(selectedElement.type === 'instantTextBoxType' || selectedElement.type === 'buttonType') && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-[11px] text-[#909b88]">Display Text / Loc Token:</span>
                  <input
                    type="text"
                    value={selectedElement.text || ''}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { text: e.target.value })}
                    className="bg-[#101411] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9]"
                  />
                </div>
              )}

              {/* Font Picker */}
              {(selectedElement.type === 'instantTextBoxType' || selectedElement.type === 'buttonType') && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-[11px] text-[#909b88]">Paradox Font:</span>
                  <select
                    value={selectedElement.font || 'hoi_18mbs'}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { font: e.target.value })}
                    className="bg-[#101411] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9] cursor-pointer"
                  >
                    <option value="hoi_16mbs">hoi_16mbs (Small Body)</option>
                    <option value="hoi_18mbs">hoi_18mbs (Standard UI)</option>
                    <option value="hoi_20bs">hoi_20bs (Bold Subheader)</option>
                    <option value="hoi_24header">hoi_24header (Section Header)</option>
                    <option value="hoi_30header">hoi_30header (Title Large)</option>
                    <option value="hoi_36header">hoi_36header (Display Headline)</option>
                  </select>
                </div>
              )}

              {/* SpriteType picker */}
              {(selectedElement.type === 'iconType' || selectedElement.type === 'buttonType') && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-[11px] text-[#909b88]">Sprite Definition (GFX):</span>
                  <input
                    type="text"
                    value={selectedElement.spriteType || ''}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { spriteType: e.target.value })}
                    placeholder="GFX_..."
                    className="bg-[#101411] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs font-mono text-[#a6bd87]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Code View */
        <div className="flex-1 flex flex-col bg-[#101411] overflow-hidden">
          <div className="p-3 border-b border-[#30392e] bg-[#141a15] flex items-center justify-between text-xs">
            <span className="font-bold text-[#d6b878] flex items-center gap-1.5">
              <Code2 className="h-4 w-4" /> Paradox .gui Clausewitz Definition
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(serializedScript);
                onNotify?.('Copied .gui script to clipboard');
              }}
              className="text-xs text-[#a6bd87] hover:underline flex items-center gap-1 font-mono"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Code
            </button>
          </div>
          <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-[#a6bd87] leading-relaxed">
            {serializedScript}
          </pre>
        </div>
      )}
    </div>
  );
};
