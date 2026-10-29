import React, { useState } from 'react';
import type {
  SpecialProjectDef,
  SpecialProjectType,
  SpecialProjectComplexity,
  ScientistTalent,
} from '../../types/economy';
import {
  Plus,
  Trash2,
  Atom,
  Award,
  Code,
  Users,
  Sliders,
} from 'lucide-react';

const DEFAULT_SCIENTISTS: ScientistTalent[] = [
  {
    id: 'werner_heisenberg',
    name: 'Werner Heisenberg',
    trait: 'theoretical_physicist',
    specialization: 'nuclear',
    skillLevel: 5,
    speedBonus: 0.25,
  },
  {
    id: 'wernher_von_braun',
    name: 'Wernher von Braun',
    trait: 'rocket_engineer_pioneer',
    specialization: 'rocket',
    skillLevel: 5,
    speedBonus: 0.30,
  },
  {
    id: 'ferdinand_porsche',
    name: 'Ferdinand Porsche',
    trait: 'super_heavy_visionary',
    specialization: 'land_cruiser',
    skillLevel: 4,
    speedBonus: 0.20,
  },
  {
    id: 'helmut_walther',
    name: 'Hellmuth Walter',
    trait: 'closed_cycle_turbine_specialist',
    specialization: 'stealth_submarine',
    skillLevel: 4,
    speedBonus: 0.20,
  },
  {
    id: 'hans_von_ohain',
    name: 'Hans von Ohain',
    trait: 'turbojet_designer',
    specialization: 'jet_propulsion',
    skillLevel: 5,
    speedBonus: 0.25,
  },
];

const DEFAULT_PROJECTS: SpecialProjectDef[] = [
  {
    id: 'special_project_atomic_bomb',
    name: 'Uranprojekt Atomic Warhead',
    projectType: 'nuclear',
    facilityType: 'nuclear_facility',
    prototypeCostResources: { steel: 12, chromium: 8, tungsten: 6 },
    prototypeCostCivFactories: 5,
    prototypeTimeDays: 180,
    complexity: 'insane',
    assignedScientistId: 'werner_heisenberg',
    unlockedBreakthroughs: ['heavy_water_separation', 'plutonium_breeding'],
    rewardOutput: {
      enableEquipment: 'nuclear_bomb',
      customEffectTooltip: 'Enables strategic atomic bombings that eliminate provincial infrastructure.',
      bonusTechSpeed: 0.20,
    },
  },
  {
    id: 'special_project_p1000_ratte',
    name: 'P.1000 Land Cruiser Ratte',
    projectType: 'land_cruiser',
    facilityType: 'heavy_tank_facility',
    prototypeCostResources: { steel: 25, chromium: 15, tungsten: 12 },
    prototypeCostCivFactories: 6,
    prototypeTimeDays: 240,
    complexity: 'insane',
    assignedScientistId: 'ferdinand_porsche',
    unlockedBreakthroughs: ['naval_gun_turret_mounting', 'multi_engine_traction'],
    rewardOutput: {
      enableEquipment: 'land_cruiser_super_heavy_battalion',
      customEffectTooltip: 'Deploys 1,000-tonne mobile fortress division with 280mm dual cannons.',
      bonusTechSpeed: 0.15,
    },
  },
  {
    id: 'special_project_me262_schwalbe',
    name: 'Messerschmitt Me 262 Jet Fighter',
    projectType: 'jet_propulsion',
    facilityType: 'aerospace_proving_grounds',
    prototypeCostResources: { aluminum: 14, tungsten: 8, chromium: 6 },
    prototypeCostCivFactories: 4,
    prototypeTimeDays: 140,
    complexity: 'complex',
    assignedScientistId: 'hans_von_ohain',
    unlockedBreakthroughs: ['axial_flow_compressor', 'swept_wing_aerodynamics'],
    rewardOutput: {
      enableEquipment: 'jet_fighter_equipment_1',
      customEffectTooltip: 'Unlocks first generation operational turbojet fighter aircraft.',
      bonusTechSpeed: 0.25,
    },
  },
  {
    id: 'special_project_type_xxi_elektroboot',
    name: 'Type XXI Elektroboot Stealth Submarine',
    projectType: 'stealth_submarine',
    facilityType: 'naval_pen_proving_facility',
    prototypeCostResources: { steel: 16, rubber: 8, chromium: 4 },
    prototypeCostCivFactories: 4,
    prototypeTimeDays: 160,
    complexity: 'complex',
    assignedScientistId: 'helmut_walther',
    unlockedBreakthroughs: ['snort_mast_air_intake', 'high_capacity_battery_grids'],
    rewardOutput: {
      enableEquipment: 'advanced_submarine_hull_xxi',
      customEffectTooltip: 'Grants continuous submerged patrol endurance and sub-surface concealment.',
      bonusTechSpeed: 0.20,
    },
  },
];

export const SpecialProjectsStudio: React.FC<{ onNotify?: (msg: string) => void }> = ({
  onNotify,
}) => {
  const [projects, setProjects] = useState<SpecialProjectDef[]>(DEFAULT_PROJECTS);
  const [scientists] = useState<ScientistTalent[]>(DEFAULT_SCIENTISTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(DEFAULT_PROJECTS[0].id);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const assignedScientist = scientists.find(
    (s) => s.id === selectedProject.assignedScientistId
  );

  const handleUpdateProject = (updates: Partial<SpecialProjectDef>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === selectedProject.id ? { ...p, ...updates } : p))
    );
  };

  const handleAddProject = () => {
    const newId = `special_project_${Date.now().toString().slice(-4)}`;
    const newProj: SpecialProjectDef = {
      id: newId,
      name: 'New Wunderwaffe Facility Project',
      projectType: 'nuclear',
      facilityType: 'nuclear_facility',
      prototypeCostResources: { steel: 10, chromium: 5 },
      prototypeCostCivFactories: 3,
      prototypeTimeDays: 150,
      complexity: 'medium',
      unlockedBreakthroughs: ['initial_breakthrough'],
      rewardOutput: {
        customEffectTooltip: 'Breakthrough rewards for prototype completion.',
        bonusTechSpeed: 0.10,
      },
    };
    setProjects((prev) => [...prev, newProj]);
    setSelectedProjectId(newId);
    onNotify?.(`Created special project: ${newProj.name}`);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    setSelectedProjectId(next[0].id);
    onNotify?.(`Deleted project: ${id}`);
  };

  const paradoxScript = `special_project = {
    name = "${selectedProject.id}"
    special_project_type = ${selectedProject.projectType}
    facility_model = "${selectedProject.facilityType}"
    allowed = { has_dlc = "Gotterdammerung" }
    
    prototype_cost = {
        civilian_factories = ${selectedProject.prototypeCostCivFactories}
        resources = { ${Object.entries(selectedProject.prototypeCostResources)
          .map(([res, amt]) => `${res} = ${amt}`)
          .join(' ')} }
    }
    prototype_time = ${selectedProject.prototypeTimeDays}
    complexity = ${selectedProject.complexity}
    
    project_output = {
        name = ${selectedProject.id}_output
        effects = {
            ${selectedProject.rewardOutput.enableEquipment ? `enable_equipment = ${selectedProject.rewardOutput.enableEquipment}` : ''}
            custom_effect_tooltip = "${selectedProject.rewardOutput.customEffectTooltip}"
        }
    }
}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Atom className="h-4 w-4 text-[#d6b878]" />
          <span className="text-xs font-bold text-[#e3e5d9]">
            Special Projects, Facilities & Scientists Studio (Götterdämmerung)
          </span>
          <span className="text-[10px] text-[#71806b] font-mono">
            ({projects.length} Wunderwaffe projects)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddProject}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New Wunderwaffe
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

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Project List */}
        <div className="w-72 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto">
          <div className="p-2 border-b border-[#232c21] text-[11px] font-semibold text-[#8b9983]">
            Active Research Facilities
          </div>
          <div className="p-2 space-y-1">
            {projects.map((p) => {
              const isSelected = p.id === selectedProject.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-3 rounded cursor-pointer transition border text-left ${
                    isSelected
                      ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                      : 'bg-[#18201a] border-transparent hover:bg-[#1d261f] text-[#a4b39c]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#788871] mt-1.5 font-mono">
                    <span className="capitalize">{p.projectType.replace('_', ' ')}</span>
                    <span className="text-[#d6b878]">{p.prototypeTimeDays}d</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-[#a6bd87] mt-1">
                    Complexity: {p.complexity}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Editor */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Information */}
          <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
                <Atom className="h-4 w-4" />
                {selectedProject.name}
              </h2>
              {projects.length > 1 && (
                <button
                  onClick={() => handleDeleteProject(selectedProject.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-950/40"
                  title="Delete Project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Project Display Name</label>
                <input
                  type="text"
                  value={selectedProject.name}
                  onChange={(e) => handleUpdateProject({ name: e.target.value })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Special Project Archetype</label>
                <select
                  value={selectedProject.projectType}
                  onChange={(e) =>
                    handleUpdateProject({ projectType: e.target.value as SpecialProjectType })
                  }
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                >
                  <option value="nuclear">Nuclear & Atomic Weapons</option>
                  <option value="land_cruiser">Land Cruiser Super-Heavy Armor</option>
                  <option value="jet_propulsion">Jet Propulsion & Turbojets</option>
                  <option value="stealth_submarine">Type XXI Stealth Submarine</option>
                  <option value="electronics">Advanced Radar & Computing</option>
                  <option value="rocket">V-Weapons & Ballistic Missiles</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#232f21]">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Facility Entity Model</label>
                <input
                  type="text"
                  value={selectedProject.facilityType}
                  onChange={(e) => handleUpdateProject({ facilityType: e.target.value })}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Assigned Leading Scientist</label>
                <select
                  value={selectedProject.assignedScientistId || ''}
                  onChange={(e) =>
                    handleUpdateProject({ assignedScientistId: e.target.value || undefined })
                  }
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                >
                  <option value="">-- No Scientist Assigned --</option>
                  {scientists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.specialization} · Skill {s.skillLevel} · +{(s.speedBonus * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Prototype Costs & Time Sliders */}
          <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-4">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#d6b878]" />
              Prototype Iteration Timers & Factory Subsidies
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8b9983]">Prototype Iteration Time:</span>
                    <span className="font-mono text-[#d6b878] font-bold">
                      {selectedProject.prototypeTimeDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={360}
                    step={10}
                    value={selectedProject.prototypeTimeDays}
                    onChange={(e) =>
                      handleUpdateProject({ prototypeTimeDays: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#d6b878]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8b9983]">Civilian Factory Allocation:</span>
                    <span className="font-mono text-[#a6bd87] font-bold">
                      {selectedProject.prototypeCostCivFactories} Civ Factories
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={selectedProject.prototypeCostCivFactories}
                    onChange={(e) =>
                      handleUpdateProject({ prototypeCostCivFactories: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#a6bd87]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-[#8b9983]">Complexity Classification</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['simple', 'medium', 'complex', 'insane'] as SpecialProjectComplexity[]).map(
                    (comp) => (
                      <button
                        key={comp}
                        onClick={() => handleUpdateProject({ complexity: comp })}
                        className={`py-1.5 rounded text-[10px] font-bold uppercase transition ${
                          selectedProject.complexity === comp
                            ? 'bg-[#d6b878] text-[#141a14] shadow'
                            : 'bg-[#1a221b] border border-[#303f2e] text-[#8b9983] hover:text-[#e3e5d9]'
                        }`}
                      >
                        {comp}
                      </button>
                    )
                  )}
                </div>

                <div className="pt-2 text-[10px] text-[#788871] leading-relaxed">
                  Insane complexity requires Tier-5 scientists to prevent prototype catastrophe rolls
                  and factory explosions during test firings.
                </div>
              </div>
            </div>
          </div>

          {/* Breakthrough Rewards */}
          <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-3">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-400" />
              Breakthrough Rewards & Unlocked Equipment
            </h3>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Unlocked Equipment Token</label>
                <input
                  type="text"
                  value={selectedProject.rewardOutput.enableEquipment || ''}
                  onChange={(e) =>
                    handleUpdateProject({
                      rewardOutput: {
                        ...selectedProject.rewardOutput,
                        enableEquipment: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                  placeholder="e.g. nuclear_bomb, jet_fighter_equipment_1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Custom Effect Tooltip</label>
                <input
                  type="text"
                  value={selectedProject.rewardOutput.customEffectTooltip}
                  onChange={(e) =>
                    handleUpdateProject({
                      rewardOutput: {
                        ...selectedProject.rewardOutput,
                        customEffectTooltip: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Scientist Dossier */}
        <div className="w-80 bg-[#141a15] border-l border-[#30392e] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-[#253223] pb-2">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Scientific Talent Allocation
              </span>
            </div>

            {assignedScientist ? (
              <div className="bg-[#101512] border border-[#2c392a] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#e3e5d9]">
                    {assignedScientist.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#202920] text-[#d6b878]">
                    Skill {assignedScientist.skillLevel}
                  </span>
                </div>
                <div className="text-[10px] text-[#a6bd87] font-mono">
                  {assignedScientist.trait}
                </div>
                <div className="text-[11px] text-[#8b9983]">
                  Specialization: <span className="capitalize">{assignedScientist.specialization}</span>
                </div>
                <div className="pt-2 border-t border-[#212b20] flex justify-between text-xs font-bold text-[#d6b878]">
                  <span>Iteration Speed Buff:</span>
                  <span>+{(assignedScientist.speedBonus * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#101512] rounded border border-dashed border-[#2d3a2a] text-center text-xs text-[#71806b]">
                No scientist assigned. Progress will suffer -30% speed penalty.
              </div>
            )}

            <div className="p-3 bg-[#111712] border border-[#232f22] rounded space-y-1.5 text-xs">
              <span className="font-semibold text-[#8b9983]">Required Resources:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#e3e5d9]">
                {Object.entries(selectedProject.prototypeCostResources).map(([res, amt]) => (
                  <div key={res} className="flex justify-between bg-[#19221b] px-2 py-1 rounded">
                    <span className="capitalize">{res}:</span>
                    <span className="text-[#d6b878]">{amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#71806b] text-center border-t border-[#253223] pt-3">
            Götterdämmerung Special Projects DLC Spec
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported Special Project ({selectedProject.id}.txt)
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
                  onNotify?.('Copied special project script to clipboard');
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
