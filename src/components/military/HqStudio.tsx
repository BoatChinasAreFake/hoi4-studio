import React, { useState } from 'react';
import type { MilitaryHqDef, HqLevel, GeneralStaffTrait } from '../../types/military';
import { generateHqTemplate } from '../../utils/militaryExporters';
import {
  Plus,
  Trash2,
  Radio,
  Compass,
  Award,
  Code,
  Sliders,
} from 'lucide-react';

const STAFF_TRAITS: GeneralStaffTrait[] = [
  {
    id: 'logistics_master',
    name: 'Logistics Master General',
    description: 'Increases regional supply throughput and mitigates attrition in low-infrastructure zones.',
    supplyThroughputBonus: 0.20,
    planningSpeedMultiplier: 0.10,
    reinforceRateBonus: 0.05,
    commandPowerUpkeepCost: 0.15,
  },
  {
    id: 'deep_battle_coordinator',
    name: 'Deep Battle Coordinator',
    description: 'Greatly increases maximum planning values and divisional recovery rate inside the command bubble.',
    supplyThroughputBonus: 0.10,
    planningSpeedMultiplier: 0.35,
    reinforceRateBonus: 0.10,
    commandPowerUpkeepCost: 0.25,
  },
  {
    id: 'blitzkrieg_staff_officer',
    name: 'Mobile Warfare Chief of Staff',
    description: 'Imparts divisional movement speed and breakthrough bonuses to mechanized and armored columns.',
    supplyThroughputBonus: 0.05,
    planningSpeedMultiplier: 0.25,
    reinforceRateBonus: 0.08,
    commandPowerUpkeepCost: 0.20,
  },
  {
    id: 'fortress_defense_expert',
    name: 'Static Defense & Fortress Engineer',
    description: 'Increases entrenchment speed and defensive combat bonuses for infantry inside the command aura.',
    supplyThroughputBonus: 0.15,
    planningSpeedMultiplier: 0.05,
    reinforceRateBonus: 0.12,
    commandPowerUpkeepCost: 0.10,
  },
];

const DEFAULT_HQS: MilitaryHqDef[] = [
  {
    id: 'army_group_center_hq',
    name: 'Army Group Center Headquarters',
    level: 'army_group_hq',
    auraRadiusProvinces: 5,
    staffTraits: ['deep_battle_coordinator', 'logistics_master'],
    assignedCommanderName: 'Fedor von Bock',
    baseSupplyBonus: 0.20,
    basePlanningMultiplier: 0.25,
    locationProvinceId: 6521,
  },
  {
    id: 'first_army_hq',
    name: 'First Field Army Headquarters',
    level: 'army_hq',
    auraRadiusProvinces: 3,
    staffTraits: ['blitzkrieg_staff_officer'],
    assignedCommanderName: 'Heinz Guderian',
    baseSupplyBonus: 0.15,
    basePlanningMultiplier: 0.30,
    locationProvinceId: 3412,
  },
  {
    id: 'western_theater_command',
    name: 'Western Theater Strategic Command',
    level: 'theater_command',
    auraRadiusProvinces: 8,
    staffTraits: ['logistics_master', 'fortress_defense_expert'],
    assignedCommanderName: 'Gerd von Rundstedt',
    baseSupplyBonus: 0.25,
    basePlanningMultiplier: 0.15,
    locationProvinceId: 11500,
  },
];

export const HqStudio: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [hqs, setHqs] = useState<MilitaryHqDef[]>(DEFAULT_HQS);
  const [selectedHqId, setSelectedHqId] = useState<string>(DEFAULT_HQS[0].id);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const selectedHq = hqs.find((h) => h.id === selectedHqId) || hqs[0];

  const handleUpdateHq = (updates: Partial<MilitaryHqDef>) => {
    setHqs((prev) =>
      prev.map((h) => (h.id === selectedHq.id ? { ...h, ...updates } : h))
    );
  };

  const handleAddHq = () => {
    const newId = `hq_unit_${Date.now().toString().slice(-4)}`;
    const newHq: MilitaryHqDef = {
      id: newId,
      name: 'New Army Headquarters',
      level: 'army_hq',
      auraRadiusProvinces: 3,
      staffTraits: ['logistics_master'],
      assignedCommanderName: 'General Staff',
      baseSupplyBonus: 0.15,
      basePlanningMultiplier: 0.20,
      locationProvinceId: 101,
    };
    setHqs((prev) => [...prev, newHq]);
    setSelectedHqId(newId);
    onNotify?.(`Created HQ unit: ${newHq.name}`);
  };

  const handleDeleteHq = (id: string) => {
    if (hqs.length <= 1) return;
    const next = hqs.filter((h) => h.id !== id);
    setHqs(next);
    setSelectedHqId(next[0].id);
  };

  const handleToggleStaffTrait = (traitId: string) => {
    const exists = selectedHq.staffTraits.includes(traitId);
    const updated = exists
      ? selectedHq.staffTraits.filter((t) => t !== traitId)
      : [...selectedHq.staffTraits, traitId];
    handleUpdateHq({ staffTraits: updated });
  };

  const paradoxScript = generateHqTemplate(selectedHq);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[#d6b878]" />
          <span className="text-xs font-bold text-[#e3e5d9]">
            Military Headquarters (HQs) & Command Auras Studio (Thunder At Our Gates)
          </span>
          <span className="text-[10px] text-[#71806b] font-mono">
            ({hqs.length} HQs established)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddHq}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New HQ Unit
          </button>
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e271c] border border-[#30392e] text-xs text-[#909b88] hover:text-[#e3e5d9] transition"
          >
            <Code className="h-3.5 w-3.5" />
            Export HQ Script
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left HQ List */}
        <div className="w-72 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto p-2 space-y-1">
          {hqs.map((h) => {
            const isSelected = h.id === selectedHq.id;
            return (
              <div
                key={h.id}
                onClick={() => setSelectedHqId(h.id)}
                className={`p-3 rounded cursor-pointer transition border text-left ${
                  isSelected
                    ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                    : 'bg-[#18201a] border-transparent hover:bg-[#1d261f] text-[#a4b39c]'
                }`}
              >
                <div className="text-xs font-bold truncate">{h.name}</div>
                <div className="flex items-center justify-between text-[10px] text-[#788871] font-mono mt-1">
                  <span className="capitalize">{h.level.replace('_', ' ')}</span>
                  <span className="text-[#d6b878]">{h.auraRadiusProvinces} Prov Radius</span>
                </div>
                <div className="text-[10px] text-[#a6bd87] mt-0.5 truncate">
                  General: {h.assignedCommanderName}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: HQ Configuration */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
                <Radio className="h-4 w-4" />
                {selectedHq.name}
              </h2>

              {hqs.length > 1 && (
                <button
                  onClick={() => handleDeleteHq(selectedHq.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">HQ Designation Name</label>
                <input
                  type="text"
                  value={selectedHq.name}
                  onChange={(e) => handleUpdateHq({ name: e.target.value })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Headquarters Hierarchy Level</label>
                <select
                  value={selectedHq.level}
                  onChange={(e) => handleUpdateHq({ level: e.target.value as HqLevel })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                >
                  <option value="corps_hq">Corps Headquarters (Tactical)</option>
                  <option value="army_hq">Field Army Headquarters (Operational)</option>
                  <option value="army_group_hq">Army Group Headquarters (Strategic)</option>
                  <option value="theater_command">Theater Strategic Command (Continental)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#232f21]">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Assigned Commander / General</label>
                <input
                  type="text"
                  value={selectedHq.assignedCommanderName}
                  onChange={(e) => handleUpdateHq({ assignedCommanderName: e.target.value })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">HQ Location Province ID</label>
                <input
                  type="number"
                  value={selectedHq.locationProvinceId}
                  onChange={(e) =>
                    handleUpdateHq({ locationProvinceId: parseInt(e.target.value) || 1 })
                  }
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>
            </div>
          </div>

          {/* Aura Radius & Bonuses Sliders */}
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#d6b878]" />
              Command Aura Radius & Regional Buffs
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9983]">Operational Aura Radius (Provinces):</span>
                  <span className="font-mono text-[#d6b878] font-bold">
                    {selectedHq.auraRadiusProvinces} Provinces
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={selectedHq.auraRadiusProvinces}
                  onChange={(e) =>
                    handleUpdateHq({ auraRadiusProvinces: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#d6b878]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#232f21]">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8b9983]">Supply Throughput Bonus:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      +{(selectedHq.baseSupplyBonus * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={Math.round(selectedHq.baseSupplyBonus * 100)}
                    onChange={(e) =>
                      handleUpdateHq({ baseSupplyBonus: parseInt(e.target.value) / 100 })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8b9983]">Planning Speed Multiplier:</span>
                    <span className="font-mono text-sky-400 font-bold">
                      +{(selectedHq.basePlanningMultiplier * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={Math.round(selectedHq.basePlanningMultiplier * 100)}
                    onChange={(e) =>
                      handleUpdateHq({ basePlanningMultiplier: parseInt(e.target.value) / 100 })
                    }
                    className="w-full accent-sky-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General Staff Traits */}
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-3">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#a6bd87]" />
              Assigned General Staff Traits
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {STAFF_TRAITS.map((trait) => {
                const isAssigned = selectedHq.staffTraits.includes(trait.id);
                return (
                  <div
                    key={trait.id}
                    onClick={() => handleToggleStaffTrait(trait.id)}
                    className={`p-3 rounded border cursor-pointer transition space-y-1.5 text-xs ${
                      isAssigned
                        ? 'bg-[#212c1f] border-[#d6b878] text-[#e3e5d9]'
                        : 'bg-[#121813] border-[#293626] text-[#7e8d78] hover:border-[#4d6349]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{trait.name}</span>
                      <span className="text-[10px] font-mono text-[#d6b878]">
                        {isAssigned ? '✓ Assigned' : '+ Add'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8b9983] leading-relaxed">
                      {trait.description}
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-[#a6bd87] pt-1 border-t border-[#253223]">
                      <span>Supply: +{(trait.supplyThroughputBonus * 100).toFixed(0)}%</span>
                      <span>Plan: +{(trait.planningSpeedMultiplier * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Radar / Aura Range Visualizer */}
        <div className="w-80 bg-[#141a15] border-l border-[#30392e] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-[#253223] pb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Compass className="h-4 w-4" />
                Operational Aura Radar
              </span>
              <span className="text-[10px] font-mono text-[#a6bd87]">
                Prov #{selectedHq.locationProvinceId}
              </span>
            </div>

            {/* Aura Radar Graphic */}
            <div className="h-64 bg-[#0d120f] border border-[#2b3829] rounded-lg relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#a6bd87_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Concentric Aura Rings corresponding to radius */}
              {Array.from({ length: selectedHq.auraRadiusProvinces }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: `${(i + 1) * (200 / selectedHq.auraRadiusProvinces)}px`,
                    height: `${(i + 1) * (200 / selectedHq.auraRadiusProvinces)}px`,
                  }}
                  className="absolute border border-[#d6b878]/30 rounded-full pointer-events-none"
                />
              ))}

              <div className="w-10 h-10 rounded-full bg-[#d6b878]/20 border border-[#d6b878] flex items-center justify-center z-10">
                <Radio className="h-5 w-5 text-[#d6b878]" />
              </div>

              <div className="absolute bottom-2 left-2 text-[10px] font-mono text-[#788871]">
                Aura: {selectedHq.auraRadiusProvinces} Provinces
              </div>
            </div>

            <div className="p-3 bg-[#101512] border border-[#232e21] rounded text-xs space-y-1.5">
              <div className="font-bold text-[#d6b878]">Regional Command Benefits</div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8b9983]">Supply Throughput:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  +{(selectedHq.baseSupplyBonus * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8b9983]">Planning Speed:</span>
                <span className="font-mono text-sky-400 font-bold">
                  +{(selectedHq.basePlanningMultiplier * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8b9983]">Active Staff Traits:</span>
                <span className="font-mono text-[#e3e5d9]">
                  {selectedHq.staffTraits.length} traits
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#71806b] text-center border-t border-[#253223] pt-3">
            Deployable General Headquarters Framework
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported Military HQ Script
              </span>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕ Close
              </button>
            </div>
            <pre className="p-4 bg-[#0d120f] text-[#a6bd87] text-xs font-mono overflow-auto max-h-96 select-text">
              {paradoxScript}
            </pre>
            <div className="p-3 bg-[#131a14] border-t border-[#303f2e] flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(paradoxScript);
                  onNotify?.('Copied military HQ script to clipboard');
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
