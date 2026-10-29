import React, { useState } from 'react';
import type { RaidMissionDef, RaidCategory } from '../../types/economy';
import {
  Crosshair,
  Plus,
  Trash2,
  Clock,
  Radio,
  Flame,
  Play,
  Code,
  Target,
  Plane,
  Anchor,
  Bomb,
} from 'lucide-react';

const DEFAULT_RAIDS: RaidMissionDef[] = [
  {
    id: 'heavy_water_sabotage',
    name: 'Heavy Water Plant Sabotage',
    category: 'commando_raid',
    arrowType: 'land',
    commandPower: 25,
    targetStateId: 112, // Telemark, Norway
    targetProvinceId: 3412,
    detectionRisk: 35,
    prepPhases: [
      { name: 'Infiltration & Resistance Liaison', durationDays: 14, requiredIntel: 40, commandPowerCost: 10 },
      { name: 'Explosive Charge Rigging', durationDays: 3, requiredIntel: 65, commandPowerCost: 15 },
    ],
    requiredEquipment: { infantry_equipment: 100, support_equipment: 20 },
    successEffect: {
      damageBuildingType: 'nuclear_facility',
      damageBuildingLevel: 2,
      damageInfrastructure: 1,
      addWarSupport: 0.05,
    },
    criticalSuccessEffect: {
      damageBuildingType: 'nuclear_facility',
      damageBuildingLevel: 3,
      captureTechBonus: 'nuclear_research_boost',
    },
    failureEffect: {
      addWarSupport: -0.02,
      killOperativesChance: 50,
    },
  },
  {
    id: 'operation_chastise_dambusters',
    name: 'Operation Chastise (Dambusters)',
    category: 'air_raid',
    arrowType: 'air',
    commandPower: 30,
    targetStateId: 54, // Ruhr Valley
    targetProvinceId: 6521,
    detectionRisk: 55,
    prepPhases: [
      { name: 'Low-Altitude Night Flight Training', durationDays: 20, requiredIntel: 50, commandPowerCost: 10 },
      { name: 'Upkeep Bouncing Bomb Rigging', durationDays: 5, requiredIntel: 70, commandPowerCost: 20 },
    ],
    requiredEquipment: { strategic_bomber_equipment: 20 },
    successEffect: {
      damageBuildingType: 'industrial_complex',
      damageBuildingLevel: 4,
      damageInfrastructure: 3,
      addWarSupport: 0.08,
    },
    failureEffect: {
      addWarSupport: -0.05,
    },
  },
  {
    id: 'st_nazaire_dock_raid',
    name: 'Operation Chariot (St. Nazaire)',
    category: 'naval_raid',
    arrowType: 'naval',
    commandPower: 40,
    targetStateId: 19, // Brittany
    targetProvinceId: 9811,
    detectionRisk: 60,
    prepPhases: [
      { name: 'Campbeltown Destroyer Disguise & Prep', durationDays: 25, requiredIntel: 60, commandPowerCost: 15 },
      { name: 'Estuary Night Penetration', durationDays: 2, requiredIntel: 80, commandPowerCost: 25 },
    ],
    requiredEquipment: { destroyer: 1, infantry_equipment: 300 },
    successEffect: {
      damageBuildingType: 'naval_base',
      damageBuildingLevel: 5,
      addWarSupport: 0.10,
    },
    failureEffect: {
      addWarSupport: -0.04,
      killOperativesChance: 75,
    },
  },
  {
    id: 'trinity_nuclear_strike',
    name: 'Strategic Atomic Demonstration',
    category: 'nuclear_raid',
    arrowType: 'ballistic',
    commandPower: 50,
    targetStateId: 382,
    targetProvinceId: 10420,
    detectionRisk: 20,
    prepPhases: [
      { name: 'Nuclear Core Assembly & Yield Calibration', durationDays: 30, requiredIntel: 30, commandPowerCost: 20 },
      { name: 'Air Superiority Corridor Clearing', durationDays: 7, requiredIntel: 90, commandPowerCost: 30 },
    ],
    requiredEquipment: { nuclear_bomb: 1, strategic_bomber_equipment: 1 },
    successEffect: {
      damageBuildingType: 'all',
      damageBuildingLevel: 10,
      damageInfrastructure: 5,
      addWarSupport: -0.20,
      addStability: -0.30,
    },
    failureEffect: {
      addWarSupport: -0.10,
    },
  },
];

const CATEGORIES: { id: RaidCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'commando_raid', label: 'Commando & Sabotage', icon: <Crosshair className="h-4 w-4 text-emerald-400" /> },
  { id: 'air_raid', label: 'Tactical Air Raid', icon: <Plane className="h-4 w-4 text-sky-400" /> },
  { id: 'naval_raid', label: 'Naval Port Penetration', icon: <Anchor className="h-4 w-4 text-cyan-400" /> },
  { id: 'nuclear_raid', label: 'Atomic / Nuclear Strike', icon: <Bomb className="h-4 w-4 text-amber-400" /> },
  { id: 'paratrooper_raid', label: 'Airborne Infiltration', icon: <Target className="h-4 w-4 text-indigo-400" /> },
  { id: 'infiltration_raid', label: 'Deep Asset Extraction', icon: <Radio className="h-4 w-4 text-purple-400" /> },
];

export const RaidsStudio: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [raids, setRaids] = useState<RaidMissionDef[]>(DEFAULT_RAIDS);
  const [selectedRaidId, setSelectedRaidId] = useState<string>(DEFAULT_RAIDS[0].id);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const selectedRaid = raids.find((r) => r.id === selectedRaidId) || raids[0];

  const handleUpdateRaid = (updates: Partial<RaidMissionDef>) => {
    setRaids((prev) =>
      prev.map((r) => (r.id === selectedRaid.id ? { ...r, ...updates } : r))
    );
  };

  const handleAddRaid = () => {
    const newId = `raid_operation_${Date.now().toString().slice(-4)}`;
    const newRaid: RaidMissionDef = {
      id: newId,
      name: 'New Tactical Operation',
      category: 'commando_raid',
      arrowType: 'land',
      commandPower: 20,
      targetStateId: 1,
      targetProvinceId: 101,
      detectionRisk: 40,
      prepPhases: [
        { name: 'Initial Infiltration', durationDays: 10, requiredIntel: 50, commandPowerCost: 10 },
      ],
      requiredEquipment: { infantry_equipment: 50 },
      successEffect: {
        damageBuildingType: 'arms_factory',
        damageBuildingLevel: 1,
        addWarSupport: 0.03,
      },
      failureEffect: {
        addWarSupport: -0.01,
      },
    };
    setRaids((prev) => [...prev, newRaid]);
    setSelectedRaidId(newId);
    onNotify?.(`Created raid operation: ${newRaid.name}`);
  };

  const handleDeleteRaid = (id: string) => {
    if (raids.length <= 1) return;
    const next = raids.filter((r) => r.id !== id);
    setRaids(next);
    setSelectedRaidId(next[0].id);
    onNotify?.(`Deleted raid: ${id}`);
  };

  const handleSimulateRaid = () => {
    setIsSimulating(true);
    setSimulationLog('Initializing operation launch...');

    setTimeout(() => {
      setSimulationLog(`Executing Phase 1: ${selectedRaid.prepPhases[0]?.name || 'Preparation'}...`);
    }, 400);

    setTimeout(() => {
      const roll = Math.random() * 100;
      if (roll > selectedRaid.detectionRisk + 20) {
        setSimulationLog(
          `★ CRITICAL SUCCESS! Operation executed flawlessly. Target building neutralized (${selectedRaid.successEffect.damageBuildingType}). War Support +${selectedRaid.successEffect.addWarSupport || 0.05}.`
        );
      } else if (roll > selectedRaid.detectionRisk) {
        setSimulationLog(
          `✓ SUCCESS: Objective damaged. Target state ${selectedRaid.targetStateId} sustained severe disruptions.`
        );
      } else {
        setSimulationLog(
          `✕ DETECTED & INTERCEPTED: Enemy counter-sabotage active. Detection risk was ${selectedRaid.detectionRisk}%. Operational retreat signaled.`
        );
      }
      setIsSimulating(false);
    }, 1200);
  };

  const paradoxScript = `raid_type = {
    name = "${selectedRaid.id}"
    category = ${selectedRaid.category}
    command_power = ${selectedRaid.commandPower}
    arrow = {
        type = ${selectedRaid.arrowType}
    }
    targeting = {
        state = ${selectedRaid.targetStateId || 1}
        ${selectedRaid.targetProvinceId ? `province = ${selectedRaid.targetProvinceId}` : ''}
    }
    detection_risk = ${(selectedRaid.detectionRisk / 100).toFixed(2)}
    success_effect = {
        ${selectedRaid.successEffect.damageBuildingType ? `damage_building = { type = ${selectedRaid.successEffect.damageBuildingType} damage = ${selectedRaid.successEffect.damageBuildingLevel || 1} }` : ''}
        ${selectedRaid.successEffect.addWarSupport ? `add_war_support = ${selectedRaid.successEffect.addWarSupport}` : ''}
    }
    failure_effect = {
        ${selectedRaid.failureEffect.addWarSupport ? `add_war_support = ${selectedRaid.failureEffect.addWarSupport}` : ''}
        ${selectedRaid.failureEffect.killOperativesChance ? `kill_country_leader = no` : ''}
    }
}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-[#d6b878]" />
          <span className="text-xs font-bold text-[#e3e5d9]">
            Raids & Strategic Strike Operations Studio
          </span>
          <span className="text-[10px] text-[#71806b] font-mono">
            ({raids.length} operations configured)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRaid}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New Raid Mission
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

      {/* Main Layout: Mission List + Editor + Launch Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Mission List */}
        <div className="w-64 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto">
          <div className="p-2 border-b border-[#232c21] text-[11px] font-semibold text-[#8b9983]">
            Tactical Operations
          </div>
          <div className="p-2 space-y-1">
            {raids.map((r) => {
              const isSelected = r.id === selectedRaid.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRaidId(r.id)}
                  className={`p-2.5 rounded cursor-pointer transition border text-left ${
                    isSelected
                      ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                      : 'bg-[#18201a] border-transparent hover:bg-[#1d261f] text-[#a4b39c]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate">{r.name}</span>
                    <span className="text-[10px] font-mono text-[#d6b878]">
                      {r.commandPower} CP
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#788871] mt-1">
                    <span className="capitalize">{r.category.replace('_', ' ')}</span>
                    <span>State {r.targetStateId}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Editor */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mission Header */}
          <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
                <Target className="h-4 w-4" />
                Operation Parameters: {selectedRaid.name}
              </h2>
              {raids.length > 1 && (
                <button
                  onClick={() => handleDeleteRaid(selectedRaid.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-950/40"
                  title="Delete Raid"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Operation Name</label>
                <input
                  type="text"
                  value={selectedRaid.name}
                  onChange={(e) => handleUpdateRaid({ name: e.target.value })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Mission Category</label>
                <select
                  value={selectedRaid.category}
                  onChange={(e) => handleUpdateRaid({ category: e.target.value as RaidCategory })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Coordinates & Requirements */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#253223]">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Target State ID</label>
                <input
                  type="number"
                  value={selectedRaid.targetStateId || 1}
                  onChange={(e) => handleUpdateRaid({ targetStateId: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Target Province ID</label>
                <input
                  type="number"
                  value={selectedRaid.targetProvinceId || 0}
                  onChange={(e) =>
                    handleUpdateRaid({ targetProvinceId: parseInt(e.target.value) || undefined })
                  }
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Command Power Upkeep</label>
                <input
                  type="number"
                  value={selectedRaid.commandPower}
                  onChange={(e) => handleUpdateRaid({ commandPower: parseInt(e.target.value) || 10 })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>
            </div>
          </div>

          {/* Preparation Phases */}
          <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-3">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-sky-400" />
              Preparation Phases
            </h3>

            <div className="space-y-2">
              {selectedRaid.prepPhases.map((phase, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111712] border border-[#293626] rounded-md grid grid-cols-4 gap-3 items-center"
                >
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] text-[#7b8a74]">Phase {idx + 1} Name</span>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => {
                        const updated = [...selectedRaid.prepPhases];
                        updated[idx].name = e.target.value;
                        handleUpdateRaid({ prepPhases: updated });
                      }}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#7b8a74]">Duration (Days)</span>
                    <input
                      type="number"
                      value={phase.durationDays}
                      onChange={(e) => {
                        const updated = [...selectedRaid.prepPhases];
                        updated[idx].durationDays = parseInt(e.target.value) || 1;
                        handleUpdateRaid({ prepPhases: updated });
                      }}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#7b8a74]">Intel Required (%)</span>
                    <input
                      type="number"
                      value={phase.requiredIntel}
                      onChange={(e) => {
                        const updated = [...selectedRaid.prepPhases];
                        updated[idx].requiredIntel = parseInt(e.target.value) || 0;
                        handleUpdateRaid({ prepPhases: updated });
                      }}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome Effects & Risk Sliders */}
          <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-4">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-[#bd785c]" />
              Outcome Effects & Detection Risk
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[#111712] border border-[#293626] rounded space-y-2">
                <span className="text-xs font-semibold text-emerald-400">Success Effects</span>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8b9983]">Damage Building Type</label>
                  <input
                    type="text"
                    value={selectedRaid.successEffect.damageBuildingType || 'industrial_complex'}
                    onChange={(e) =>
                      handleUpdateRaid({
                        successEffect: {
                          ...selectedRaid.successEffect,
                          damageBuildingType: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8b9983]">Damage Building Level</label>
                  <input
                    type="number"
                    value={selectedRaid.successEffect.damageBuildingLevel || 1}
                    onChange={(e) =>
                      handleUpdateRaid({
                        successEffect: {
                          ...selectedRaid.successEffect,
                          damageBuildingLevel: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#111712] border border-[#293626] rounded space-y-2">
                <span className="text-xs font-semibold text-red-400">Failure Penalties</span>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8b9983]">War Support Penalty</label>
                  <input
                    type="number"
                    step={0.01}
                    value={selectedRaid.failureEffect.addWarSupport || -0.02}
                    onChange={(e) =>
                      handleUpdateRaid({
                        failureEffect: {
                          ...selectedRaid.failureEffect,
                          addWarSupport: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8b9983]">Detection Risk</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={selectedRaid.detectionRisk}
                      onChange={(e) => handleUpdateRaid({ detectionRisk: parseInt(e.target.value) })}
                      className="flex-1 accent-[#bd785c]"
                    />
                    <span className="text-xs font-mono font-bold text-[#bd785c]">
                      {selectedRaid.detectionRisk}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Simulation Console */}
        <div className="w-80 bg-[#141a15] border-l border-[#30392e] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#253223] pb-2">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Radio className="h-4 w-4" />
                Operational Trajectory
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#202920] text-emerald-400">
                Ready
              </span>
            </div>

            {/* Tactical Compass Visualizer */}
            <div className="h-44 bg-[#0d120f] border border-[#2b3829] rounded-lg relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a6bd87_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute w-28 h-28 border border-[#3b4c37] rounded-full animate-ping opacity-25" />
              <div className="absolute w-20 h-20 border border-[#d6b878]/40 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-[#d6b878]" />
              </div>
              <div className="absolute bottom-2 left-2 text-[10px] font-mono text-[#788871]">
                Target: State #{selectedRaid.targetStateId}
              </div>
              <div className="absolute top-2 right-2 text-[10px] font-mono text-[#bd785c]">
                Risk: {selectedRaid.detectionRisk}%
              </div>
            </div>

            {/* Simulation Log */}
            <div className="p-3 bg-[#0d120f] border border-[#253223] rounded min-h-[90px] text-xs font-mono text-[#a6bd87] flex items-center">
              {simulationLog ? (
                <div>{simulationLog}</div>
              ) : (
                <div className="text-[#657560] text-center w-full">
                  Click Launch to simulate real-time raid probability roll.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSimulateRaid}
            disabled={isSimulating}
            className="w-full py-2.5 rounded bg-[#d6b878] hover:bg-[#e0c587] text-[#141a14] font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition"
          >
            <Play className="h-4 w-4 fill-current" />
            {isSimulating ? 'Simulating...' : 'Simulate Raid Strike'}
          </button>
        </div>
      </div>

      {/* Script Export Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported Raid Definition ({selectedRaid.id}.txt)
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
                  onNotify?.('Copied raid definition to clipboard');
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
