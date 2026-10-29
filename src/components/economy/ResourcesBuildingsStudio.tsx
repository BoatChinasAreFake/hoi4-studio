import React, { useState } from 'react';
import type { StrategicResourceDef, CustomBuildingDef } from '../../types/economy';
import { generateResourcesScript, generateBuildingsScript } from '../../utils/exporters';
import {
  Gem,
  Building,
  Plus,
  Trash2,
  Code,
} from 'lucide-react';

const DEFAULT_RESOURCES: StrategicResourceDef[] = [
  { id: 'oil', name: 'Crude Oil', icon: '🛢️', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
  { id: 'aluminium', name: 'Aluminium', icon: '🪨', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
  { id: 'rubber', name: 'Rubber', icon: '🌲', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
  { id: 'tungsten', name: 'Tungsten', icon: '⛏️', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
  { id: 'steel', name: 'Steel', icon: '🔩', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
  { id: 'chromium', name: 'Chromium', icon: '⚙️', baseCicCost: 1, isCustom: false, convoysRequiredPerUnit: 1 },
  { id: 'uranium', name: 'Uranium Ore', icon: '☢️', baseCicCost: 2, isCustom: true, convoysRequiredPerUnit: 2 },
];

const DEFAULT_BUILDINGS: CustomBuildingDef[] = [
  {
    id: 'industrial_complex',
    name: 'Civilian Factory',
    icon: '🏭',
    isProvincial: false,
    baseCost: 10800,
    perLevelExtraCost: 0,
    maxLevel: 20,
    sharesSlots: true,
    showOnMap: true,
    damageFactor: 1.0,
  },
  {
    id: 'arms_factory',
    name: 'Military Factory',
    icon: '🛠️',
    isProvincial: false,
    baseCost: 7200,
    perLevelExtraCost: 0,
    maxLevel: 20,
    sharesSlots: true,
    showOnMap: true,
    damageFactor: 1.0,
  },
  {
    id: 'dockyard',
    name: 'Naval Dockyard',
    icon: '⚓',
    isProvincial: false,
    baseCost: 6400,
    perLevelExtraCost: 0,
    maxLevel: 20,
    sharesSlots: true,
    showOnMap: true,
    damageFactor: 1.0,
  },
  {
    id: 'synthetic_refinery',
    name: 'Synthetic Refinery',
    icon: '🧪',
    isProvincial: false,
    baseCost: 14500,
    perLevelExtraCost: 0,
    maxLevel: 3,
    sharesSlots: true,
    showOnMap: true,
    damageFactor: 1.25,
  },
  {
    id: 'nuclear_facility',
    name: 'Heavy Water Reactor',
    icon: '☢️',
    isProvincial: false,
    baseCost: 30000,
    perLevelExtraCost: 5000,
    maxLevel: 3,
    sharesSlots: true,
    showOnMap: true,
    damageFactor: 2.0,
  },
  {
    id: 'bunker',
    name: 'Land Fort / Bunker',
    icon: '🏰',
    isProvincial: true,
    baseCost: 500,
    perLevelExtraCost: 500,
    maxLevel: 10,
    sharesSlots: false,
    showOnMap: true,
    damageFactor: 0.5,
  },
  {
    id: 'coastal_bunker',
    name: 'Coastal Fort',
    icon: '🌊',
    isProvincial: true,
    baseCost: 500,
    perLevelExtraCost: 500,
    maxLevel: 10,
    sharesSlots: false,
    showOnMap: true,
    damageFactor: 0.5,
  },
  {
    id: 'naval_base',
    name: 'Naval Base & Port',
    icon: '⚓',
    isProvincial: true,
    baseCost: 3000,
    perLevelExtraCost: 0,
    maxLevel: 10,
    sharesSlots: false,
    showOnMap: true,
    damageFactor: 0.8,
  },
];

export const ResourcesBuildingsStudio: React.FC<{ onNotify?: (msg: string) => void }> = ({
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'resources' | 'buildings'>('resources');
  const [resources, setResources] = useState<StrategicResourceDef[]>(DEFAULT_RESOURCES);
  const [buildings, setBuildings] = useState<CustomBuildingDef[]>(DEFAULT_BUILDINGS);

  const [selectedResourceId, setSelectedResourceId] = useState<string>(DEFAULT_RESOURCES[0].id);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(DEFAULT_BUILDINGS[0].id);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const selectedResource =
    resources.find((r) => r.id === selectedResourceId) || resources[0];
  const selectedBuilding =
    buildings.find((b) => b.id === selectedBuildingId) || buildings[0];

  const handleUpdateResource = (updates: Partial<StrategicResourceDef>) => {
    setResources((prev) =>
      prev.map((r) => (r.id === selectedResource.id ? { ...r, ...updates } : r))
    );
  };

  const handleAddResource = () => {
    const newId = `custom_resource_${Date.now().toString().slice(-4)}`;
    const newRes: StrategicResourceDef = {
      id: newId,
      name: 'New Strategic Resource',
      icon: '💎',
      baseCicCost: 1,
      isCustom: true,
      convoysRequiredPerUnit: 1,
    };
    setResources((prev) => [...prev, newRes]);
    setSelectedResourceId(newId);
    onNotify?.(`Added resource token: ${newRes.name}`);
  };

  const handleDeleteResource = (id: string) => {
    if (resources.length <= 1) return;
    const next = resources.filter((r) => r.id !== id);
    setResources(next);
    setSelectedResourceId(next[0].id);
  };

  const handleUpdateBuilding = (updates: Partial<CustomBuildingDef>) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === selectedBuilding.id ? { ...b, ...updates } : b))
    );
  };

  const handleAddBuilding = () => {
    const newId = `custom_building_${Date.now().toString().slice(-4)}`;
    const newB: CustomBuildingDef = {
      id: newId,
      name: 'New Custom Facility',
      icon: '🏢',
      isProvincial: false,
      baseCost: 8000,
      perLevelExtraCost: 0,
      maxLevel: 5,
      sharesSlots: true,
      showOnMap: true,
      damageFactor: 1.0,
    };
    setBuildings((prev) => [...prev, newB]);
    setSelectedBuildingId(newId);
    onNotify?.(`Added building definition: ${newB.name}`);
  };

  const handleDeleteBuilding = (id: string) => {
    if (buildings.length <= 1) return;
    const next = buildings.filter((b) => b.id !== id);
    setBuildings(next);
    setSelectedBuildingId(next[0].id);
  };

  const paradoxResourcesScript = generateResourcesScript(resources);
  const paradoxBuildingsScript = generateBuildingsScript(buildings);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubTab('resources')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                subTab === 'resources'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <Gem className="h-3.5 w-3.5" /> Strategic Resources ({resources.length})
            </button>
            <button
              onClick={() => setSubTab('buildings')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                subTab === 'buildings'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <Building className="h-3.5 w-3.5" /> Custom Buildings ({buildings.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={subTab === 'resources' ? handleAddResource : handleAddBuilding}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {subTab === 'resources' ? 'Resource' : 'Building'}
          </button>
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e271c] border border-[#30392e] text-xs text-[#909b88] hover:text-[#e3e5d9] transition"
          >
            <Code className="h-3.5 w-3.5" />
            Export Script
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {subTab === 'resources' ? (
          /* Resources View */
          <>
            <div className="w-72 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto p-2 space-y-1">
              {resources.map((r) => {
                const isSelected = r.id === selectedResource.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResourceId(r.id)}
                    className={`p-2.5 rounded cursor-pointer transition border text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                        : 'bg-[#18201a] border-transparent hover:bg-[#1d261f] text-[#a4b39c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{r.icon}</span>
                      <div>
                        <div className="text-xs font-bold">{r.name}</div>
                        <div className="text-[10px] text-[#71806b] font-mono">{r.id}</div>
                      </div>
                    </div>
                    {r.isCustom && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2a2418] text-[#d6b878] border border-[#4d3e23]">
                        Custom
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
                    <span className="text-lg">{selectedResource.icon}</span>
                    Resource Token: {selectedResource.name} ({selectedResource.id})
                  </h2>
                  {selectedResource.isCustom && (
                    <button
                      onClick={() => handleDeleteResource(selectedResource.id)}
                      className="p-1 rounded text-red-400 hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Resource Name</label>
                    <input
                      type="text"
                      value={selectedResource.name}
                      onChange={(e) => handleUpdateResource({ name: e.target.value })}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Emoji / Icon Token</label>
                    <input
                      type="text"
                      value={selectedResource.icon}
                      onChange={(e) => handleUpdateResource({ icon: e.target.value })}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#253223]">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">CIC Factory Purchase Cost</label>
                    <input
                      type="number"
                      value={selectedResource.baseCicCost}
                      onChange={(e) =>
                        handleUpdateResource({ baseCicCost: parseInt(e.target.value) || 1 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                    <span className="text-[10px] text-[#71806b]">
                      Number of civilian factories needed per 8 units imported (default: 1)
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Convoys Required Per Unit</label>
                    <input
                      type="number"
                      value={selectedResource.convoysRequiredPerUnit}
                      onChange={(e) =>
                        handleUpdateResource({
                          convoysRequiredPerUnit: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Buildings View */
          <>
            <div className="w-72 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto p-2 space-y-1">
              {buildings.map((b) => {
                const isSelected = b.id === selectedBuilding.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBuildingId(b.id)}
                    className={`p-2.5 rounded cursor-pointer transition border text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                        : 'bg-[#18201a] border-transparent hover:bg-[#1d261f] text-[#a4b39c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{b.icon}</span>
                      <div>
                        <div className="text-xs font-bold">{b.name}</div>
                        <div className="text-[10px] text-[#71806b] font-mono">
                          {b.isProvincial ? 'Provincial' : 'State Building'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#d6b878]">Lvl {b.maxLevel}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
                    <span className="text-lg">{selectedBuilding.icon}</span>
                    Building Specification: {selectedBuilding.name} ({selectedBuilding.id})
                  </h2>
                  <button
                    onClick={() => handleDeleteBuilding(selectedBuilding.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Building Name</label>
                    <input
                      type="text"
                      value={selectedBuilding.name}
                      onChange={(e) => handleUpdateBuilding({ name: e.target.value })}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Classification Scope</label>
                    <select
                      value={selectedBuilding.isProvincial ? 'provincial' : 'state'}
                      onChange={(e) =>
                        handleUpdateBuilding({ isProvincial: e.target.value === 'provincial' })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    >
                      <option value="state">State Building (Shared Slots / Shared Industry)</option>
                      <option value="provincial">Provincial Building (Forts, Ports, Radars)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#253223]">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Base Construction Cost (IC)</label>
                    <input
                      type="number"
                      value={selectedBuilding.baseCost}
                      onChange={(e) =>
                        handleUpdateBuilding({ baseCost: parseInt(e.target.value) || 1000 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Per-Level Extra Cost</label>
                    <input
                      type="number"
                      value={selectedBuilding.perLevelExtraCost}
                      onChange={(e) =>
                        handleUpdateBuilding({ perLevelExtraCost: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8b9983]">Max Level Cap</label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={selectedBuilding.maxLevel}
                      onChange={(e) =>
                        handleUpdateBuilding({ maxLevel: parseInt(e.target.value) || 1 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>

                {/* Flags: Shares slots, show on map, damage factor */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#253223]">
                  <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBuilding.sharesSlots}
                      onChange={(e) => handleUpdateBuilding({ sharesSlots: e.target.checked })}
                      className="accent-[#d6b878]"
                    />
                    Shares Building Slots
                  </label>

                  <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBuilding.showOnMap}
                      onChange={(e) => handleUpdateBuilding({ showOnMap: e.target.checked })}
                      className="accent-[#d6b878]"
                    />
                    Show 3D Asset on Map
                  </label>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8b9983]">Bomb Damage Factor</label>
                    <input
                      type="number"
                      step={0.1}
                      value={selectedBuilding.damageFactor}
                      onChange={(e) =>
                        handleUpdateBuilding({ damageFactor: parseFloat(e.target.value) || 1.0 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported Paradox Script ({subTab === 'resources' ? 'resources.txt' : 'buildings.txt'})
              </span>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕ Close
              </button>
            </div>
            <pre className="p-4 bg-[#0d120f] text-[#a6bd87] text-xs font-mono overflow-auto max-h-96 select-text">
              {subTab === 'resources' ? paradoxResourcesScript : paradoxBuildingsScript}
            </pre>
            <div className="p-3 bg-[#131a14] border-t border-[#303f2e] flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    subTab === 'resources' ? paradoxResourcesScript : paradoxBuildingsScript
                  );
                  onNotify?.('Copied script to clipboard');
                  setShowScriptModal(false);
                }}
                className="px-3 py-1 rounded bg-[#d6b878] text-[#141a14] text-xs font-bold"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
