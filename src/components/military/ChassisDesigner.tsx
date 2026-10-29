import React, { useState, useMemo } from 'react';
import type {
  EquipmentChassisCategory,
  EquipmentModuleDef,
  ModularChassisDesign,
  CompositeChassisStats,
} from '../../types/military';
import {
  Shield,
  Plane,
  Anchor,
  Sliders,
  Plus,
  Trash2,
  AlertTriangle,
  Gauge,
  Code,
} from 'lucide-react';

const MODULE_DATABASE: EquipmentModuleDef[] = [
  // Tank Modules
  {
    id: 'medium_cannon_1',
    name: 'Medium Cannon I',
    category: 'tank',
    allowedSlotTypes: ['main_armament'],
    stats: { softAttack: 25, hardAttack: 15, piercing: 45, productionCost: 4 },
  },
  {
    id: 'heavy_howitzer_1',
    name: 'Heavy Howitzer I',
    category: 'tank',
    allowedSlotTypes: ['main_armament'],
    stats: { softAttack: 40, hardAttack: 5, piercing: 20, productionCost: 5 },
  },
  {
    id: 'high_velocity_cannon_1',
    name: 'High-Velocity Cannon I',
    category: 'tank',
    allowedSlotTypes: ['main_armament'],
    stats: { softAttack: 15, hardAttack: 30, piercing: 75, productionCost: 5.5 },
  },
  {
    id: 'three_man_medium_turret',
    name: 'Three-Man Medium Turret',
    category: 'tank',
    allowedSlotTypes: ['turret'],
    stats: { breakthrough: 18, productionCost: 3 },
    multipliers: { reliability: -0.10 },
  },
  {
    id: 'two_man_light_turret',
    name: 'Two-Man Light Turret',
    category: 'tank',
    allowedSlotTypes: ['turret'],
    stats: { breakthrough: 10, productionCost: 1.5 },
  },
  {
    id: 'diesel_engine',
    name: 'Diesel Engine',
    category: 'tank',
    allowedSlotTypes: ['engine'],
    stats: { maximumSpeed: 2.0, productionCost: 2 },
    multipliers: { reliability: 0.25 },
  },
  {
    id: 'gasoline_engine',
    name: 'Gasoline Engine',
    category: 'tank',
    allowedSlotTypes: ['engine'],
    stats: { maximumSpeed: 3.5, productionCost: 2.5 },
    multipliers: { reliability: -0.10 },
  },
  {
    id: 'welded_armor',
    name: 'Welded Armor',
    category: 'tank',
    allowedSlotTypes: ['armor_type'],
    stats: { armor: 15, productionCost: 2 },
    multipliers: { armor: 0.20 },
  },
  {
    id: 'cast_armor',
    name: 'Cast Armor',
    category: 'tank',
    allowedSlotTypes: ['armor_type'],
    stats: { armor: 25, productionCost: 4 },
    multipliers: { armor: 0.35, productionCost: 0.10 },
  },
  {
    id: 'radio_3',
    name: 'Advanced Radio III',
    category: 'tank',
    allowedSlotTypes: ['special_1', 'special_2', 'special_3', 'special_4'],
    stats: { defense: 6, breakthrough: 12, productionCost: 1.5 },
  },
  {
    id: 'wet_ammo_storage',
    name: 'Wet Ammunition Storage',
    category: 'tank',
    allowedSlotTypes: ['special_1', 'special_2', 'special_3', 'special_4'],
    stats: { productionCost: 1 },
    multipliers: { reliability: 0.15 },
  },
  {
    id: 'smoke_launchers',
    name: 'Smoke Launchers',
    category: 'tank',
    allowedSlotTypes: ['special_1', 'special_2', 'special_3', 'special_4'],
    stats: { defense: 4, breakthrough: 4, productionCost: 0.5 },
  },

  // Plane Modules
  {
    id: 'single_engine_2',
    name: 'Single Engine II',
    category: 'plane',
    allowedSlotTypes: ['engine'],
    stats: { thrust: 22, maximumSpeed: 520, productionCost: 6 },
  },
  {
    id: 'twin_engine_2',
    name: 'Twin Engine II',
    category: 'plane',
    allowedSlotTypes: ['engine'],
    stats: { thrust: 42, maximumSpeed: 500, productionCost: 12, fuelConsumption: 0.3 },
  },
  {
    id: 'lmg_4x',
    name: '4x Light Machine Guns',
    category: 'plane',
    allowedSlotTypes: ['weapon_1', 'weapon_2', 'weapon_3'],
    stats: { airAttack: 16, weight: 3, productionCost: 2 },
  },
  {
    id: 'cannon_20mm_2x',
    name: '2x 20mm Aircraft Cannons',
    category: 'plane',
    allowedSlotTypes: ['weapon_1', 'weapon_2', 'weapon_3'],
    stats: { airAttack: 26, weight: 6, productionCost: 4.5 },
  },
  {
    id: 'bomb_locks',
    name: 'Close Air Support Bomb Locks',
    category: 'plane',
    allowedSlotTypes: ['weapon_1', 'weapon_2', 'weapon_3'],
    stats: { softAttack: 18, hardAttack: 10, weight: 7, productionCost: 3 },
  },
  {
    id: 'armor_plate_plane',
    name: 'Pilot Armor Plate',
    category: 'plane',
    allowedSlotTypes: ['special_1', 'special_2', 'special_3'],
    stats: { airDefense: 6, weight: 3, productionCost: 1.5 },
  },
  {
    id: 'drop_tanks',
    name: 'External Drop Tanks',
    category: 'plane',
    allowedSlotTypes: ['special_1', 'special_2', 'special_3'],
    stats: { weight: 2, productionCost: 1 },
  },

  // Ship Modules
  {
    id: 'heavy_battery_3',
    name: 'Heavy Battery 380mm (Battleship)',
    category: 'ship',
    allowedSlotTypes: ['ship_battery'],
    stats: { hardAttack: 38, piercing: 42, productionCost: 1200 },
  },
  {
    id: 'light_battery_3',
    name: 'Light Battery 127mm Dual Purpose',
    category: 'ship',
    allowedSlotTypes: ['ship_battery'],
    stats: { softAttack: 12, airDefense: 8, piercing: 14, productionCost: 250 },
  },
  {
    id: 'depth_charges_3',
    name: 'Depth Charges III',
    category: 'ship',
    allowedSlotTypes: ['depth_charge'],
    stats: { subDetection: 15, productionCost: 80 },
  },
  {
    id: 'ship_radar_3',
    name: 'Surface Search Radar III',
    category: 'ship',
    allowedSlotTypes: ['radar_sonar'],
    stats: { surfaceDetection: 24, productionCost: 120 },
  },
  {
    id: 'naval_engine_3',
    name: 'High Pressure Steam Turbines III',
    category: 'ship',
    allowedSlotTypes: ['engine'],
    stats: { maximumSpeed: 32, productionCost: 450 },
  },
];

const DEFAULT_DESIGNS: ModularChassisDesign[] = [
  {
    id: 'panzer_iv_ausf_h',
    name: 'Panzer IV Ausf. H (Medium Tank)',
    category: 'tank',
    chassisType: 'medium_tank_chassis',
    year: 1941,
    baseStats: {
      armor: 40,
      piercing: 10,
      maximumSpeed: 4.5,
      productionCost: 9,
      reliability: 0.0,
    },
    slots: {
      main_armament: 'medium_cannon_1',
      turret: 'three_man_medium_turret',
      engine: 'diesel_engine',
      armor_type: 'welded_armor',
      special_1: 'radio_3',
      special_2: 'smoke_launchers',
    },
    armorLevel: 4,
    engineLevel: 4,
    roleTag: 'medium_tank',
  },
  {
    id: 'bf109_f4_friedrich',
    name: 'Bf 109 F-4 Friedrich (Fighter)',
    category: 'plane',
    chassisType: 'small_plane_airframe',
    year: 1941,
    baseStats: {
      weight: 10,
      thrust: 0,
      airDefense: 10,
      maximumSpeed: 480,
      productionCost: 14,
      reliability: 0.0,
    },
    slots: {
      engine: 'single_engine_2',
      weapon_1: 'cannon_20mm_2x',
      weapon_2: 'lmg_4x',
      special_1: 'armor_plate_plane',
      special_2: 'drop_tanks',
    },
    armorLevel: 0,
    engineLevel: 0,
    roleTag: 'fighter',
  },
  {
    id: 'fletcher_destroyer_class',
    name: 'Fletcher-class Destroyer',
    category: 'ship',
    chassisType: 'ship_hull_light',
    year: 1942,
    baseStats: {
      surfaceDetection: 12,
      subDetection: 8,
      maximumSpeed: 28,
      productionCost: 800,
      reliability: 0.0,
    },
    slots: {
      ship_battery: 'light_battery_3',
      engine: 'naval_engine_3',
      depth_charge: 'depth_charges_3',
      radar_sonar: 'ship_radar_3',
    },
    armorLevel: 1,
    engineLevel: 2,
    roleTag: 'screen_ship',
  },
];

export const ChassisDesigner: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [designs, setDesigns] = useState<ModularChassisDesign[]>(DEFAULT_DESIGNS);
  const [selectedDesignId, setSelectedDesignId] = useState<string>(DEFAULT_DESIGNS[0].id);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<EquipmentChassisCategory>('tank');
  const [slotDrawer, setSlotDrawer] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const selectedDesign =
    designs.find((d) => d.id === selectedDesignId) || designs[0];

  const handleUpdateDesign = (updates: Partial<ModularChassisDesign>) => {
    setDesigns((prev) =>
      prev.map((d) => (d.id === selectedDesign.id ? { ...d, ...updates } : d))
    );
  };

  const handleAddDesign = () => {
    const newId = `custom_chassis_${Date.now().toString().slice(-4)}`;
    const newDesign: ModularChassisDesign = {
      id: newId,
      name: `New Custom ${activeCategoryFilter.toUpperCase()} Design`,
      category: activeCategoryFilter,
      chassisType:
        activeCategoryFilter === 'tank'
          ? 'medium_tank_chassis'
          : activeCategoryFilter === 'plane'
          ? 'small_plane_airframe'
          : 'ship_hull_light',
      year: 1940,
      baseStats: {
        maximumSpeed: activeCategoryFilter === 'plane' ? 450 : 5.0,
        productionCost: activeCategoryFilter === 'ship' ? 1000 : 12,
        weight: activeCategoryFilter === 'plane' ? 10 : undefined,
      },
      slots: {},
      armorLevel: 2,
      engineLevel: 2,
    };
    setDesigns((prev) => [...prev, newDesign]);
    setSelectedDesignId(newId);
    onNotify?.(`Created chassis template: ${newDesign.name}`);
  };

  const handleDeleteDesign = (id: string) => {
    if (designs.length <= 1) return;
    const next = designs.filter((d) => d.id !== id);
    setDesigns(next);
    setSelectedDesignId(next[0].id);
  };

  // Real-time Composite Stat Calculation
  const stats: CompositeChassisStats = useMemo(() => {
    let softAttack = selectedDesign.baseStats.softAttack || 0;
    let hardAttack = selectedDesign.baseStats.hardAttack || 0;
    let defense = selectedDesign.baseStats.defense || 0;
    let breakthrough = selectedDesign.baseStats.breakthrough || 0;
    let armor = (selectedDesign.baseStats.armor || 0) + selectedDesign.armorLevel * 2.5;
    let piercing = selectedDesign.baseStats.piercing || 0;
    let speed = (selectedDesign.baseStats.maximumSpeed || 0) + selectedDesign.engineLevel * 0.4;
    let reliability = 100.0 + (selectedDesign.baseStats.reliability || 0) * 100.0;
    let cost =
      (selectedDesign.baseStats.productionCost || 0) +
      selectedDesign.armorLevel * 0.5 +
      selectedDesign.engineLevel * 0.4;
    let airDefense = selectedDesign.baseStats.airDefense || 0;
    let airAttack = selectedDesign.baseStats.airAttack || 0;
    let thrust = selectedDesign.baseStats.thrust || 0;
    let weight = selectedDesign.baseStats.weight || 0;
    let surfaceDetection = selectedDesign.baseStats.surfaceDetection || 0;
    let subDetection = selectedDesign.baseStats.subDetection || 0;
    let surfaceVisibility = selectedDesign.baseStats.surfaceVisibility || 0;
    let fuelConsumption = selectedDesign.baseStats.fuelConsumption || 0;
    let manpower = selectedDesign.baseStats.manpower || 0;

    let speedMult = 1.0;
    let armorMult = 1.0;
    let costMult = 1.0;
    let reliabilityModSum = 0.0;

    const validationErrors: string[] = [];

    // Sum assigned modules
    Object.values(selectedDesign.slots).forEach((modId) => {
      const mod = MODULE_DATABASE.find((m) => m.id === modId);
      if (!mod) return;

      softAttack += mod.stats.softAttack || 0;
      hardAttack += mod.stats.hardAttack || 0;
      defense += mod.stats.defense || 0;
      breakthrough += mod.stats.breakthrough || 0;
      armor += mod.stats.armor || 0;
      piercing += mod.stats.piercing || 0;
      speed += mod.stats.maximumSpeed || 0;
      reliability += (mod.stats.reliability || 0) * 100.0;
      cost += mod.stats.productionCost || 0;
      airDefense += mod.stats.airDefense || 0;
      airAttack += mod.stats.airAttack || 0;
      thrust += mod.stats.thrust || 0;
      weight += mod.stats.weight || 0;
      surfaceDetection += mod.stats.surfaceDetection || 0;
      subDetection += mod.stats.subDetection || 0;
      surfaceVisibility += mod.stats.surfaceVisibility || 0;
      fuelConsumption += mod.stats.fuelConsumption || 0;
      manpower += mod.stats.manpower || 0;

      if (mod.multipliers?.maximumSpeed) speedMult *= 1.0 + mod.multipliers.maximumSpeed;
      if (mod.multipliers?.armor) armorMult *= 1.0 + mod.multipliers.armor;
      if (mod.multipliers?.productionCost) costMult *= 1.0 + mod.multipliers.productionCost;
      if (mod.multipliers?.reliability) reliabilityModSum += mod.multipliers.reliability;
    });

    speed = Math.max(0, speed * speedMult);
    armor = Math.max(0, armor * armorMult);
    cost = Math.max(1, cost * costMult);
    const reliabilityMult = Math.max(0, 1.0 + reliabilityModSum);
    reliability = Math.min(200, Math.max(0, reliability * reliabilityMult));

    // Specific domain rules
    if (selectedDesign.category === 'plane') {
      if (thrust < weight) {
        validationErrors.push(`Thrust deficit: Total thrust (${thrust.toFixed(1)}) is lower than airframe weight (${weight.toFixed(1)})`);
      }
      if (!selectedDesign.slots.engine) {
        validationErrors.push('Missing engine module');
      }
    } else if (selectedDesign.category === 'tank') {
      if (!selectedDesign.slots.main_armament) {
        validationErrors.push('Missing primary armament (main gun)');
      }
      if (!selectedDesign.slots.turret) {
        validationErrors.push('Missing turret module');
      }
    }

    return {
      softAttack: Math.round(softAttack * 10) / 10,
      hardAttack: Math.round(hardAttack * 10) / 10,
      defense: Math.round(defense * 10) / 10,
      breakthrough: Math.round(breakthrough * 10) / 10,
      armor: Math.round(armor * 10) / 10,
      piercing: Math.round(piercing * 10) / 10,
      maximumSpeed: Math.round(speed * 10) / 10,
      reliability: Math.round(reliability * 10) / 10,
      productionCost: Math.round(cost * 10) / 10,
      airDefense: Math.round(airDefense * 10) / 10,
      airAttack: Math.round(airAttack * 10) / 10,
      thrust: Math.round(thrust * 10) / 10,
      weight: Math.round(weight * 10) / 10,
      surfaceDetection: Math.round(surfaceDetection * 10) / 10,
      subDetection: Math.round(subDetection * 10) / 10,
      surfaceVisibility: Math.round(surfaceVisibility * 10) / 10,
      fuelConsumption: Math.round(fuelConsumption * 10) / 10,
      manpower: Math.round(manpower),
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }, [selectedDesign]);

  const slotsList = useMemo(() => {
    if (selectedDesign.category === 'tank') {
      return [
        { slotId: 'main_armament', label: 'Main Gun / Armament', mandatory: true },
        { slotId: 'turret', label: 'Turret Type', mandatory: true },
        { slotId: 'engine', label: 'Engine Type', mandatory: true },
        { slotId: 'armor_type', label: 'Armor Scheme', mandatory: true },
        { slotId: 'special_1', label: 'Special Module 1', mandatory: false },
        { slotId: 'special_2', label: 'Special Module 2', mandatory: false },
        { slotId: 'special_3', label: 'Special Module 3', mandatory: false },
        { slotId: 'special_4', label: 'Special Module 4', mandatory: false },
      ];
    } else if (selectedDesign.category === 'plane') {
      return [
        { slotId: 'engine', label: 'Aircraft Engine', mandatory: true },
        { slotId: 'weapon_1', label: 'Primary Armament', mandatory: true },
        { slotId: 'weapon_2', label: 'Secondary Weapon', mandatory: false },
        { slotId: 'weapon_3', label: 'Auxiliary Weapon', mandatory: false },
        { slotId: 'special_1', label: 'Special Air Module 1', mandatory: false },
        { slotId: 'special_2', label: 'Special Air Module 2', mandatory: false },
        { slotId: 'special_3', label: 'Special Air Module 3', mandatory: false },
      ];
    } else {
      return [
        { slotId: 'ship_battery', label: 'Main Naval Battery', mandatory: true },
        { slotId: 'engine', label: 'Naval Engine', mandatory: true },
        { slotId: 'depth_charge', label: 'ASW / Depth Charges', mandatory: false },
        { slotId: 'radar_sonar', label: 'Radar & Sonar System', mandatory: false },
      ];
    }
  }, [selectedDesign.category]);

  const paradoxScript = `create_equipment_variant = {
    name = "${selectedDesign.name}"
    type = ${selectedDesign.chassisType}
    parent_version = 0
    modules = {
${Object.entries(selectedDesign.slots)
  .map(([slot, mod]) => `        ${slot} = ${mod}`)
  .join('\n')}
    }
    upgrades = {
        tank_armor_upgrade = ${selectedDesign.armorLevel}
        tank_engine_upgrade = ${selectedDesign.engineLevel}
    }
}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header Filter & Actions */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {(['tank', 'plane', 'ship'] as EquipmentChassisCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategoryFilter(cat);
                const first = designs.find((d) => d.category === cat);
                if (first) setSelectedDesignId(first.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold capitalize transition ${
                activeCategoryFilter === cat
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              {cat === 'tank' && <Shield className="h-3.5 w-3.5" />}
              {cat === 'plane' && <Plane className="h-3.5 w-3.5" />}
              {cat === 'ship' && <Anchor className="h-3.5 w-3.5" />}
              <span>{cat}s</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddDesign}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New Variant
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

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Designs List */}
        <div className="w-72 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto p-2 space-y-1">
          {designs
            .filter((d) => d.category === activeCategoryFilter)
            .map((d) => {
              const isSelected = d.id === selectedDesign.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDesignId(d.id)}
                  className={`p-3 rounded cursor-pointer transition border text-left ${
                    isSelected
                      ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                      : 'bg-[#18201a] border-transparent hover:bg-[#1d261f] text-[#a4b39c]'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{d.name}</div>
                  <div className="flex items-center justify-between text-[10px] text-[#71806b] font-mono mt-1">
                    <span>{d.year} Model</span>
                    <span className="text-[#d6b878]">Armor {d.armorLevel} · Engine {d.engineLevel}</span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Center: Slot Designer Matrix */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  {selectedDesign.name}
                </h2>
                <div className="text-[10px] text-[#71806b] font-mono mt-0.5">
                  Archetype: {selectedDesign.chassisType} · Category: {selectedDesign.category}
                </div>
              </div>

              {designs.length > 1 && (
                <button
                  onClick={() => handleDeleteDesign(selectedDesign.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sliders for Armor & Engine Upgrades */}
            <div className="grid grid-cols-2 gap-6 pt-3 border-t border-[#232f21]">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9983]">Armor Upgrade Level:</span>
                  <span className="font-mono text-[#d6b878] font-bold">
                    Lvl {selectedDesign.armorLevel} (+{(selectedDesign.armorLevel * 2.5).toFixed(1)} Armor)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={selectedDesign.armorLevel}
                  onChange={(e) => handleUpdateDesign({ armorLevel: parseInt(e.target.value) })}
                  className="w-full accent-[#d6b878]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9983]">Engine Upgrade Level:</span>
                  <span className="font-mono text-[#a6bd87] font-bold">
                    Lvl {selectedDesign.engineLevel} (+{(selectedDesign.engineLevel * 0.4).toFixed(1)} km/h)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={selectedDesign.engineLevel}
                  onChange={(e) => handleUpdateDesign({ engineLevel: parseInt(e.target.value) })}
                  className="w-full accent-[#a6bd87]"
                />
              </div>
            </div>
          </div>

          {/* Module Slots Grid */}
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
            <h3 className="text-xs font-bold text-[#e3e5d9] flex items-center justify-between">
              <span>Chassis Module Slots</span>
              <span className="text-[10px] text-[#788871] font-mono">
                Click slot to assign hardware
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {slotsList.map((slot) => {
                const assignedModId = selectedDesign.slots[slot.slotId];
                const assignedMod = MODULE_DATABASE.find((m) => m.id === assignedModId);

                return (
                  <div
                    key={slot.slotId}
                    onClick={() => setSlotDrawer(slot.slotId)}
                    className={`p-3 rounded-md border cursor-pointer transition flex items-center justify-between ${
                      assignedMod
                        ? 'bg-[#1b251d] border-[#3e503a] hover:border-[#d6b878]'
                        : 'bg-[#121813] border-dashed border-[#2b3829] hover:border-[#4d6349]'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[#7e8e78] font-bold">
                        {slot.label} {slot.mandatory && <span className="text-[#bd785c]">*</span>}
                      </div>
                      <div className="text-xs font-semibold text-[#e3e5d9] mt-0.5">
                        {assignedMod ? assignedMod.name : 'Empty Slot'}
                      </div>
                    </div>

                    {assignedMod ? (
                      <span className="text-[10px] font-mono text-[#d6b878]">
                        {assignedMod.stats.productionCost ? `${assignedMod.stats.productionCost} IC` : 'Equipped'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#71806b] font-mono">+ Assign</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation Warnings */}
          {!stats.isValid && (
            <div className="p-3 bg-[#241310] border border-[#522922] rounded-lg text-xs text-[#f09d8d] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Chassis Configuration Errors
              </div>
              {stats.validationErrors.map((err, idx) => (
                <div key={idx}>• {err}</div>
              ))}
            </div>
          )}
        </div>

        {/* Right Composite Stat Dashboard */}
        <div className="w-80 bg-[#141a15] border-l border-[#30392e] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="border-b border-[#253223] pb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Gauge className="h-4 w-4" />
                Composite Statistics
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  stats.isValid
                    ? 'bg-[#192b1b] text-emerald-400'
                    : 'bg-[#3b1c18] text-[#f09d8d]'
                }`}
              >
                {stats.isValid ? 'Valid Design' : 'Invalid'}
              </span>
            </div>

            {/* Combat Rollup Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Soft Attack</span>
                <div className="text-sm font-bold font-mono text-[#e3e5d9]">
                  {stats.softAttack}
                </div>
              </div>

              <div className="p-2 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Hard Attack</span>
                <div className="text-sm font-bold font-mono text-[#e3e5d9]">
                  {stats.hardAttack}
                </div>
              </div>

              <div className="p-2 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Armor</span>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  {stats.armor}
                </div>
              </div>

              <div className="p-2 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Piercing</span>
                <div className="text-sm font-bold font-mono text-sky-400">
                  {stats.piercing}
                </div>
              </div>

              <div className="p-2 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Max Speed</span>
                <div className="text-sm font-bold font-mono text-[#d6b878]">
                  {stats.maximumSpeed} {selectedDesign.category === 'plane' ? 'km/h' : 'km/h'}
                </div>
              </div>

              <div className="p-2 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Reliability</span>
                <div
                  className={`text-sm font-bold font-mono ${
                    stats.reliability < 80 ? 'text-[#bd785c]' : 'text-[#a6bd87]'
                  }`}
                >
                  {stats.reliability}%
                </div>
              </div>

              <div className="p-2 bg-[#101512] border border-[#232e21] rounded col-span-2 flex items-center justify-between">
                <span className="text-[10px] text-[#788871]">Production Cost:</span>
                <span className="text-base font-bold font-mono text-[#d6b878]">
                  {stats.productionCost} IC
                </span>
              </div>
            </div>

            {/* Plane Specifics */}
            {selectedDesign.category === 'plane' && (
              <div className="p-3 bg-[#101512] border border-[#232e21] rounded space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#788871]">Thrust vs Weight:</span>
                  <span
                    className={`font-mono font-bold ${
                      stats.thrust < stats.weight ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {stats.thrust} / {stats.weight}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#788871]">Air Defense:</span>
                  <span className="font-mono text-[#e3e5d9]">{stats.airDefense}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#788871]">Air Attack:</span>
                  <span className="font-mono text-[#e3e5d9]">{stats.airAttack}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-[#71806b] text-center border-t border-[#253223] pt-3">
            Modular Hardware Slot Designer Engine
          </div>
        </div>
      </div>

      {/* Module Selector Drawer */}
      {slotDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Select Module for Slot: {slotDrawer}
              </span>
              <button
                onClick={() => setSlotDrawer(null)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              <button
                onClick={() => {
                  const updatedSlots = { ...selectedDesign.slots };
                  delete updatedSlots[slotDrawer];
                  handleUpdateDesign({ slots: updatedSlots });
                  setSlotDrawer(null);
                }}
                className="w-full p-2.5 rounded bg-[#101512] hover:bg-[#151c17] text-left text-xs text-[#71806b] border border-dashed border-[#2d3a2a]"
              >
                (Empty / Unequip Module)
              </button>

              {MODULE_DATABASE.filter(
                (m) =>
                  m.category === selectedDesign.category &&
                  m.allowedSlotTypes.includes(slotDrawer)
              ).map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => {
                    handleUpdateDesign({
                      slots: { ...selectedDesign.slots, [slotDrawer]: mod.id },
                    });
                    setSlotDrawer(null);
                  }}
                  className="p-3 bg-[#141b16] hover:bg-[#1e2720] border border-[#2a3828] rounded cursor-pointer transition text-xs space-y-1"
                >
                  <div className="flex justify-between font-bold text-[#e3e5d9]">
                    <span>{mod.name}</span>
                    <span className="font-mono text-[#d6b878]">
                      {mod.stats.productionCost ? `+${mod.stats.productionCost} IC` : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#a6bd87] font-mono">
                    {Object.entries(mod.stats)
                      .map(([k, v]) => `${k}: +${v}`)
                      .join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported Modular Equipment Variant
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
                  onNotify?.('Copied variant script to clipboard');
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
