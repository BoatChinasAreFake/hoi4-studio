import React, { useState, useMemo, useRef } from 'react';
import type { TechNode, TechFolder } from '../../types/economy';
import {
  FolderTree,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  Link,
  Code,
} from 'lucide-react';
import { calculateResearchCost, generateTechnologyScript } from '../../utils/phase4Generators';

const GRID_W = 120;
const GRID_H = 150;

const DEFAULT_TECH_NODES: TechNode[] = [
  // Infantry Folder
  {
    id: 'infantry_weapons_1',
    name: 'Basic Infantry Weapons',
    folder: 'infantry_folder',
    x: 1,
    y: 0,
    researchCost: 1.0,
    startYear: 1936,
    dependencies: [],
    mutuallyExclusive: [],
    enableEquipments: ['infantry_equipment_1'],
    categories: ['infantry_weapons'],
    bonusDescription: 'Soft Attack +5, Defense +10',
  },
  {
    id: 'improved_infantry_weapons',
    name: 'Improved Infantry Weapons',
    folder: 'infantry_folder',
    x: 1,
    y: 2,
    researchCost: 1.5,
    startYear: 1939,
    dependencies: ['infantry_weapons_1'],
    mutuallyExclusive: [],
    enableEquipments: ['infantry_equipment_2'],
    categories: ['infantry_weapons'],
    bonusDescription: 'Soft Attack +12, Defense +18',
  },
  {
    id: 'advanced_infantry_weapons',
    name: 'Advanced Infantry Weapons',
    folder: 'infantry_folder',
    x: 1,
    y: 4,
    researchCost: 2.0,
    startYear: 1942,
    dependencies: ['improved_infantry_weapons'],
    mutuallyExclusive: [],
    enableEquipments: ['infantry_equipment_3'],
    categories: ['infantry_weapons'],
    bonusDescription: 'Soft Attack +20, Piercing +5',
  },
  {
    id: 'support_weapons_1',
    name: 'Support Weapons I',
    folder: 'infantry_folder',
    x: 3,
    y: 0,
    researchCost: 1.0,
    startYear: 1936,
    dependencies: [],
    mutuallyExclusive: [],
    subTechnologies: ['support_mortars_1'],
    categories: ['infantry_weapons'],
    bonusDescription: 'Infantry Soft Attack +5%, Defense +5%',
  },
  {
    id: 'night_vision_equipment',
    name: 'Night Vision Goggles',
    folder: 'infantry_folder',
    x: 3,
    y: 2,
    researchCost: 1.5,
    startYear: 1940,
    dependencies: ['support_weapons_1'],
    mutuallyExclusive: [],
    categories: ['electronics'],
    bonusDescription: 'Night Attack Penalty -25%',
  },

  // Armor Folder
  {
    id: 'basic_light_tank',
    name: 'Basic Light Tank Chassis',
    folder: 'armor_folder',
    x: 1,
    y: 0,
    researchCost: 1.2,
    startYear: 1936,
    dependencies: [],
    mutuallyExclusive: [],
    enableEquipments: ['light_tank_chassis_1'],
    categories: ['armor'],
    bonusDescription: 'Unlocks Light Tank Designer Modules',
  },
  {
    id: 'basic_medium_tank',
    name: 'Basic Medium Tank Chassis',
    folder: 'armor_folder',
    x: 3,
    y: 1,
    researchCost: 1.8,
    startYear: 1938,
    dependencies: ['basic_light_tank'],
    mutuallyExclusive: [],
    enableEquipments: ['medium_tank_chassis_1'],
    categories: ['armor'],
    bonusDescription: 'Unlocks Medium Tank Designer Chassis',
  },
  {
    id: 'improved_medium_tank',
    name: 'Improved Medium Tank Chassis',
    folder: 'armor_folder',
    x: 3,
    y: 3,
    researchCost: 2.2,
    startYear: 1941,
    dependencies: ['basic_medium_tank'],
    mutuallyExclusive: ['heavy_tank_breakthrough'],
    enableEquipments: ['medium_tank_chassis_2'],
    categories: ['armor'],
    bonusDescription: 'Armor +20%, Max Speed +1.5 km/h',
  },
  {
    id: 'heavy_tank_breakthrough',
    name: 'Heavy Breakthrough Chassis',
    folder: 'armor_folder',
    x: 5,
    y: 3,
    researchCost: 2.5,
    startYear: 1941,
    dependencies: ['basic_medium_tank'],
    mutuallyExclusive: ['improved_medium_tank'],
    enableEquipments: ['heavy_tank_chassis_2'],
    categories: ['armor'],
    bonusDescription: 'Breakthrough +35%, Armor +40%',
  },

  // Industry Folder
  {
    id: 'basic_machine_tools',
    name: 'Basic Machine Tools',
    folder: 'industry_folder',
    x: 1,
    y: 0,
    researchCost: 1.0,
    startYear: 1936,
    dependencies: [],
    mutuallyExclusive: [],
    categories: ['industry'],
    bonusDescription: 'Production Efficiency Cap +10%',
  },
  {
    id: 'dispersed_industry_1',
    name: 'Dispersed Industry I',
    folder: 'industry_folder',
    x: 0,
    y: 2,
    researchCost: 1.2,
    startYear: 1937,
    dependencies: ['basic_machine_tools'],
    mutuallyExclusive: ['concentrated_industry_1'],
    categories: ['industry'],
    bonusDescription: 'Bombing Vulnerability -10%, Factory Retention +15%',
  },
  {
    id: 'concentrated_industry_1',
    name: 'Concentrated Industry I',
    folder: 'industry_folder',
    x: 2,
    y: 2,
    researchCost: 1.2,
    startYear: 1937,
    dependencies: ['basic_machine_tools'],
    mutuallyExclusive: ['dispersed_industry_1'],
    categories: ['industry'],
    bonusDescription: 'Factory Output +15%, Max Shared Slots +20%',
  },

  // Air Folder
  {
    id: 'small_airframe_1',
    name: 'Basic Small Airframe',
    folder: 'air_techs_folder',
    x: 1,
    y: 0,
    researchCost: 1.2,
    startYear: 1936,
    dependencies: [],
    mutuallyExclusive: [],
    enableEquipments: ['small_plane_airframe_1'],
    categories: ['air_equipment'],
    bonusDescription: 'Fighter & CAS Airframe baseline',
  },
  {
    id: 'small_airframe_2',
    name: 'Improved Small Airframe',
    folder: 'air_techs_folder',
    x: 1,
    y: 2,
    researchCost: 1.8,
    startYear: 1940,
    dependencies: ['small_airframe_1'],
    mutuallyExclusive: [],
    enableEquipments: ['small_plane_airframe_2'],
    categories: ['air_equipment'],
    bonusDescription: 'Air Agility +15%, Max Speed +60 km/h',
  },
];

const FOLDERS: { id: TechFolder; name: string; icon: string }[] = [
  { id: 'infantry_folder', name: 'Infantry & Weapons', icon: '⚔️' },
  { id: 'armor_folder', name: 'Armor & Tanks', icon: '🛡️' },
  { id: 'artillery_folder', name: 'Artillery', icon: '💥' },
  { id: 'air_techs_folder', name: 'Aircraft', icon: '✈️' },
  { id: 'naval_folder', name: 'Naval & Fleet', icon: '⚓' },
  { id: 'industry_folder', name: 'Industry & Synthetic', icon: '🏭' },
  { id: 'electronics_folder', name: 'Electronics & Radar', icon: '📡' },
];

export const TechTreeCanvas: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [techNodes, setTechNodes] = useState<TechNode[]>(DEFAULT_TECH_NODES);
  const [activeFolder, setActiveFolder] = useState<TechFolder>('infantry_folder');
  const [selectedTechId, setSelectedTechId] = useState<string | null>(
    DEFAULT_TECH_NODES.find((n) => n.folder === 'infantry_folder')?.id || null
  );

  // Bonus Calculation simulation states
  const [simCurrentYear, setSimCurrentYear] = useState<number>(1937);
  const [simResearchBonus, setSimResearchBonus] = useState<number>(50); // percentage reduction
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Filter nodes for the current folder
  const currentFolderNodes = useMemo(() => {
    return techNodes.filter((n) => n.folder === activeFolder);
  }, [techNodes, activeFolder]);

  const selectedNode = useMemo(() => {
    return techNodes.find((n) => n.id === selectedTechId) || null;
  }, [techNodes, selectedTechId]);

  // Calculate research time with ahead-of-time penalty & bonus
  const researchCalculation = useMemo(() => {
    if (!selectedNode) return null;
    const r = calculateResearchCost(selectedNode.researchCost, selectedNode.startYear, simCurrentYear, simResearchBonus);
    return {
      baseDays: r.baseDays,
      yearsAhead: r.yearsAhead,
      aheadPenaltyFactor: r.aheadPenaltyFactor,
      bonusFactor: r.bonusFactor,
      finalDays: r.finalResearchDays,
    };
  }, [selectedNode, simCurrentYear, simResearchBonus]);

  // Compute bounding box for canvas
  const canvasSize = useMemo(() => {
    let maxX = 6;
    let maxY = 6;
    currentFolderNodes.forEach((n) => {
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    return {
      width: Math.max(900, (maxX + 2) * GRID_W),
      height: Math.max(650, (maxY + 2) * GRID_H),
    };
  }, [currentFolderNodes]);

  const handleUpdateSelectedNode = (updates: Partial<TechNode>) => {
    if (!selectedTechId) return;
    setTechNodes((prev) =>
      prev.map((n) => (n.id === selectedTechId ? { ...n, ...updates } : n))
    );
  };

  const handleAddTechNode = () => {
    const existing = currentFolderNodes;
    let newX = 1;
    let newY = 0;
    while (existing.some((n) => n.x === newX && n.y === newY)) {
      newY += 2;
      if (newY > 8) {
        newX += 2;
        newY = 0;
      }
    }

    const newId = `new_tech_${Date.now().toString().slice(-4)}`;
    const newNode: TechNode = {
      id: newId,
      name: 'New Technology',
      folder: activeFolder,
      x: newX,
      y: newY,
      researchCost: 1.5,
      startYear: 1938,
      dependencies: [],
      mutuallyExclusive: [],
      categories: ['general'],
      bonusDescription: 'Base technological breakthrough',
    };

    setTechNodes((prev) => [...prev, newNode]);
    setSelectedTechId(newId);
    onNotify?.(`Added ${newNode.name} at (${newX}, ${newY})`);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedTechId) return;
    const targetId = selectedTechId;
    setTechNodes((prev) =>
      prev
        .filter((n) => n.id !== targetId)
        .map((n) => ({
          ...n,
          dependencies: n.dependencies.filter((d) => d !== targetId),
          mutuallyExclusive: n.mutuallyExclusive.filter((m) => m !== targetId),
        }))
    );
    setSelectedTechId(null);
    onNotify?.(`Deleted tech: ${targetId}`);
  };

  const handleToggleDependency = (depId: string) => {
    if (!selectedNode || depId === selectedNode.id) return;
    const exists = selectedNode.dependencies.includes(depId);
    const updated = exists
      ? selectedNode.dependencies.filter((id) => id !== depId)
      : [...selectedNode.dependencies, depId];
    handleUpdateSelectedNode({ dependencies: updated });
  };

  const handleToggleMutuallyExclusive = (mutId: string) => {
    if (!selectedNode || mutId === selectedNode.id) return;
    const exists = selectedNode.mutuallyExclusive.includes(mutId);
    const updated = exists
      ? selectedNode.mutuallyExclusive.filter((id) => id !== mutId)
      : [...selectedNode.mutuallyExclusive, mutId];
    handleUpdateSelectedNode({ mutuallyExclusive: updated });

    // Also mirror back to partner node
    setTechNodes((prev) =>
      prev.map((n) => {
        if (n.id === mutId) {
          const partnerExists = n.mutuallyExclusive.includes(selectedNode.id);
          const partnerUpdated = exists
            ? n.mutuallyExclusive.filter((id) => id !== selectedNode.id)
            : partnerExists
            ? n.mutuallyExclusive
            : [...n.mutuallyExclusive, selectedNode.id];
          return { ...n, mutuallyExclusive: partnerUpdated };
        }
        return n;
      })
    );
  };

  // Generate Clausewitz .txt representation
  const paradoxScript = useMemo(() => generateTechnologyScript(currentFolderNodes), [currentFolderNodes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Folder Hierarchy Switcher */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFolder(f.id);
                const first = techNodes.find((n) => n.folder === f.id);
                setSelectedTechId(first?.id || null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                activeFolder === f.id
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddTechNode}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tech Node
          </button>
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e271c] border border-[#30392e] text-xs text-[#909b88] hover:text-[#e3e5d9] transition"
          >
            <Code className="h-3.5 w-3.5" />
            Export .txt
          </button>
        </div>
      </div>

      {/* Main Body: Spatial Grid Canvas + Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Spatial Grid Canvas Viewport */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-[#0d120f] border-r border-[#30392e] p-6"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #1a221b 1px, transparent 0)',
            backgroundSize: `${GRID_W}px ${GRID_H}px`,
          }}
        >
          {/* SVG Connector Overlay */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          >
            <defs>
              <marker
                id="tech-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#7c8e68" />
              </marker>
            </defs>

            {/* Dependency Lines */}
            {currentFolderNodes.map((n) =>
              n.dependencies.map((depId) => {
                const parent = currentFolderNodes.find((p) => p.id === depId);
                if (!parent) return null;
                const startX = parent.x * GRID_W + 50;
                const startY = parent.y * GRID_H + 75;
                const endX = n.x * GRID_W + 50;
                const endY = n.y * GRID_H + 10;

                return (
                  <path
                    key={`dep-${parent.id}-${n.id}`}
                    d={`M ${startX} ${startY} C ${startX} ${startY + 30}, ${endX} ${endY - 30}, ${endX} ${endY}`}
                    stroke="#7c8e68"
                    strokeWidth="2.5"
                    fill="none"
                    markerEnd="url(#tech-arrow)"
                  />
                );
              })
            )}

            {/* Mutual Exclusion Lines (Crimson dashed curve) */}
            {currentFolderNodes.map((n) =>
              n.mutuallyExclusive.map((mutId) => {
                const partner = currentFolderNodes.find((p) => p.id === mutId);
                if (!partner || n.id > partner.id) return null;
                const startX = n.x * GRID_W + 80;
                const startY = n.y * GRID_H + 40;
                const endX = partner.x * GRID_W + 20;
                const endY = partner.y * GRID_H + 40;

                return (
                  <path
                    key={`xor-${n.id}-${partner.id}`}
                    d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${Math.min(startY, endY) - 25} ${endX} ${endY}`}
                    stroke="#bd785c"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    fill="none"
                  />
                );
              })
            )}
          </svg>

          {/* Render Tech Node Cards */}
          <div
            className="relative"
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          >
            {currentFolderNodes.map((node) => {
              const isSelected = node.id === selectedTechId;
              const hasXor = node.mutuallyExclusive.length > 0;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedTechId(node.id)}
                  style={{
                    position: 'absolute',
                    left: `${node.x * GRID_W}px`,
                    top: `${node.y * GRID_H}px`,
                    width: '105px',
                  }}
                  className={`cursor-pointer rounded-md p-2.5 transition border text-left shadow-lg select-none group ${
                    isSelected
                      ? 'bg-[#273224] border-[#d6b878] ring-2 ring-[#d6b878]/40'
                      : 'bg-[#18201a] border-[#364232] hover:border-[#52634d] hover:bg-[#1e271f]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono px-1 rounded bg-[#101512] text-[#d6b878] font-bold">
                      {node.startYear}
                    </span>
                    <span className="text-[10px] font-mono text-[#909b88]">
                      {node.researchCost.toFixed(1)}x
                    </span>
                  </div>

                  <div className="text-xs font-bold text-[#e3e5d9] line-clamp-2 leading-tight group-hover:text-[#d6b878] mb-1.5">
                    {node.name}
                  </div>

                  {node.bonusDescription && (
                    <div className="text-[9px] text-[#a6bd87] line-clamp-2 leading-tight mb-1">
                      {node.bonusDescription}
                    </div>
                  )}

                  {hasXor && (
                    <div className="text-[8px] font-bold uppercase tracking-wider text-[#bd785c] mt-1 flex items-center gap-0.5">
                      <span>⇄ XOR</span>
                    </div>
                  )}

                  {node.subTechnologies && node.subTechnologies.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {node.subTechnologies.map((sub) => (
                        <span
                          key={sub}
                          className="text-[8px] px-1 rounded bg-[#202920] text-sky-400 border border-[#303f30]"
                        >
                          +Sub
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Inspector Panel */}
        <div className="w-80 bg-[#141a15] flex flex-col h-full border-l border-[#30392e] overflow-hidden">
          <div className="h-10 border-b border-[#30392e] px-4 flex items-center justify-between bg-[#18201a]">
            <span className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <FolderTree className="h-4 w-4 text-[#d6b878]" />
              Tech Inspector
            </span>
            {selectedNode && (
              <button
                onClick={handleDeleteSelectedNode}
                title="Delete Tech Node"
                className="p-1 rounded text-[#909b88] hover:text-red-400 hover:bg-[#20281e]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {selectedNode ? (
              <>
                {/* ID & Name */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#909b88] font-semibold">Tech Identifier (ID)</label>
                  <input
                    type="text"
                    value={selectedNode.id}
                    onChange={(e) => handleUpdateSelectedNode({ id: e.target.value })}
                    className="w-full bg-[#1b231d] border border-[#354332] rounded px-2.5 py-1 text-xs text-[#e3e5d9] font-mono focus:border-[#d6b878] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#909b88] font-semibold">Display Name</label>
                  <input
                    type="text"
                    value={selectedNode.name}
                    onChange={(e) => handleUpdateSelectedNode({ name: e.target.value })}
                    className="w-full bg-[#1b231d] border border-[#354332] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:border-[#d6b878] focus:outline-none"
                  />
                </div>

                {/* Grid Coordinates (120x150 spatial grid) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#909b88] font-semibold">Grid X (Col)</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={selectedNode.x}
                      onChange={(e) => handleUpdateSelectedNode({ x: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#909b88] font-semibold">Grid Y (Row)</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={selectedNode.y}
                      onChange={(e) => handleUpdateSelectedNode({ y: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>

                {/* Base Cost & Start Year */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#909b88] font-semibold">Start Year</label>
                    <input
                      type="number"
                      value={selectedNode.startYear}
                      onChange={(e) =>
                        handleUpdateSelectedNode({ startYear: parseInt(e.target.value) || 1936 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#909b88] font-semibold">Base Cost Factor</label>
                    <input
                      type="number"
                      step={0.1}
                      value={selectedNode.researchCost}
                      onChange={(e) =>
                        handleUpdateSelectedNode({ researchCost: parseFloat(e.target.value) || 1.0 })
                      }
                      className="w-full bg-[#1b231d] border border-[#354332] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                    />
                  </div>
                </div>

                {/* Bonus / Modifier Description */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#909b88] font-semibold">Bonus Description</label>
                  <textarea
                    rows={2}
                    value={selectedNode.bonusDescription || ''}
                    onChange={(e) => handleUpdateSelectedNode({ bonusDescription: e.target.value })}
                    className="w-full bg-[#1b231d] border border-[#354332] rounded p-2 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
                  />
                </div>

                {/* Dependencies Manager */}
                <div className="space-y-1.5 pt-2 border-t border-[#263124]">
                  <label className="text-[11px] text-[#d6b878] font-semibold flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    Parent Dependencies (Prerequisites)
                  </label>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-[#101512] p-1.5 rounded border border-[#2b3829]">
                    {currentFolderNodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => {
                        const isDep = selectedNode.dependencies.includes(n.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleToggleDependency(n.id)}
                            className={`flex items-center justify-between p-1 rounded cursor-pointer transition ${
                              isDep
                                ? 'bg-[#293627] text-[#e3e5d9] font-medium'
                                : 'text-[#85947f] hover:bg-[#1a221a]'
                            }`}
                          >
                            <span className="truncate text-[11px]">{n.name}</span>
                            <span className="text-[10px] font-mono">
                              {isDep ? '✓ Linked' : '+ Link'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* XOR Mutual Exclusivity Manager */}
                <div className="space-y-1.5 pt-2 border-t border-[#263124]">
                  <label className="text-[11px] text-[#bd785c] font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Mutually Exclusive Branches (XOR)
                  </label>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-[#101512] p-1.5 rounded border border-[#2b3829]">
                    {currentFolderNodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => {
                        const isXor = selectedNode.mutuallyExclusive.includes(n.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleToggleMutuallyExclusive(n.id)}
                            className={`flex items-center justify-between p-1 rounded cursor-pointer transition ${
                              isXor
                                ? 'bg-[#3b2420] text-[#f0af9e] font-medium'
                                : 'text-[#85947f] hover:bg-[#1a221a]'
                            }`}
                          >
                            <span className="truncate text-[11px]">{n.name}</span>
                            <span className="text-[10px] font-mono">
                              {isXor ? '⇄ XOR' : '+ Exclude'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Research Calculation & Ahead-of-Time Simulator */}
                {researchCalculation && (
                  <div className="pt-2 border-t border-[#263124] space-y-2">
                    <label className="text-[11px] text-[#a6bd87] font-semibold flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Research Bonus & Ahead-of-Time Simulator
                    </label>

                    <div className="bg-[#101512] p-2.5 rounded border border-[#2b3829] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#909b88]">Simulated In-Game Year:</span>
                        <input
                          type="number"
                          value={simCurrentYear}
                          onChange={(e) => setSimCurrentYear(parseInt(e.target.value) || 1936)}
                          className="w-16 bg-[#1a221b] border border-[#354332] rounded px-1.5 py-0.5 text-right font-mono text-xs text-[#d6b878]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#909b88]">National Research Bonus:</span>
                          <span className="text-[#a6bd87] font-bold">-{simResearchBonus}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          step="5"
                          value={simResearchBonus}
                          onChange={(e) => setSimResearchBonus(parseInt(e.target.value))}
                          className="w-full accent-[#a6bd87]"
                        />
                      </div>

                      <div className="border-t border-[#222d21] pt-1.5 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#909b88]">Base Days:</span>
                          <span className="font-mono text-[#e3e5d9]">
                            {researchCalculation.baseDays}d
                          </span>
                        </div>
                        {researchCalculation.yearsAhead > 0 && (
                          <div className="flex justify-between text-[#bd785c]">
                            <span>Ahead Penalty ({researchCalculation.yearsAhead}y):</span>
                            <span className="font-mono">
                              +{((researchCalculation.aheadPenaltyFactor - 1) * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-xs pt-1 border-t border-[#222d21]">
                          <span className="text-[#d6b878]">Effective Research Time:</span>
                          <span className="font-mono text-[#d6b878]">
                            {researchCalculation.finalDays} days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-[#788572]">
                <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Select a tech node on the canvas to inspect its parameters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paradox Script Export Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-2xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Code className="h-4 w-4" />
                Exported Paradox Script ({activeFolder})
              </span>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕ Close
              </button>
            </div>
            <pre className="p-4 bg-[#0d120f] text-[#a6bd87] text-xs font-mono overflow-auto flex-1 select-text">
              {paradoxScript}
            </pre>
            <div className="p-3 bg-[#131a14] border-t border-[#303f2e] flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(paradoxScript);
                  onNotify?.('Copied Clausewitz script to clipboard');
                  setShowScriptModal(false);
                }}
                className="px-3 py-1 rounded bg-[#d6b878] text-[#141a14] text-xs font-bold hover:bg-[#e0c587]"
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
