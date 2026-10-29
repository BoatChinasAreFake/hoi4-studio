import React, { useState, useMemo } from 'react';
import type {
  BattalionTypeInfo,
  DivisionTemplateState,
  DivisionRollupStats,
  RegimentalAttachment,
} from '../../types/military';
import {
  Shield,
  Gauge,
  Code,
  Crosshair,
} from 'lucide-react';

export const BATTALION_CATALOG: BattalionTypeInfo[] = [
  // Infantry
  {
    id: 'infantry',
    name: 'Infantry Battalion',
    category: 'infantry',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1000,
    maxHp: 25,
    organization: 60,
    softAttack: 6,
    hardAttack: 1,
    defense: 22,
    breakthrough: 3,
    armor: 0,
    piercing: 4,
    maximumSpeed: 4.0,
    supplyConsumption: 0.07,
    trainingTime: 90,
    equipmentNeeds: { infantry_equipment: 100 },
    icon: '🪖',
  },
  {
    id: 'motorized',
    name: 'Motorized Infantry',
    category: 'mobile',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1200,
    maxHp: 25,
    organization: 60,
    softAttack: 8,
    hardAttack: 2,
    defense: 24,
    breakthrough: 5,
    armor: 0,
    piercing: 5,
    maximumSpeed: 12.0,
    supplyConsumption: 0.12,
    trainingTime: 100,
    equipmentNeeds: { infantry_equipment: 100, motorized_equipment: 50 },
    icon: '🚚',
  },
  {
    id: 'mechanized',
    name: 'Mechanized Infantry',
    category: 'mobile',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1200,
    maxHp: 30,
    organization: 55,
    softAttack: 12,
    hardAttack: 6,
    defense: 35,
    breakthrough: 12,
    armor: 30,
    piercing: 18,
    maximumSpeed: 8.0,
    supplyConsumption: 0.16,
    trainingTime: 120,
    equipmentNeeds: { infantry_equipment: 100, mechanized_equipment: 50 },
    icon: '🛡️',
  },
  {
    id: 'mountaineers',
    name: 'Mountaineer Battalion',
    category: 'infantry',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1000,
    maxHp: 25,
    organization: 65,
    softAttack: 7,
    hardAttack: 1.5,
    defense: 25,
    breakthrough: 4,
    armor: 0,
    piercing: 4,
    maximumSpeed: 4.0,
    supplyConsumption: 0.08,
    trainingTime: 110,
    equipmentNeeds: { infantry_equipment: 140 },
    icon: '⛰️',
  },
  {
    id: 'marine',
    name: 'Marine Battalion',
    category: 'infantry',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 1000,
    maxHp: 25,
    organization: 60,
    softAttack: 8,
    hardAttack: 2,
    defense: 23,
    breakthrough: 6,
    armor: 0,
    piercing: 4,
    maximumSpeed: 4.0,
    supplyConsumption: 0.09,
    trainingTime: 110,
    equipmentNeeds: { infantry_equipment: 140 },
    icon: '⚓',
  },

  // Combat Artillery & Heavy Weapons
  {
    id: 'artillery_brigade',
    name: 'Towed Artillery Battalion',
    category: 'artillery',
    isSupportCompany: false,
    combatWidth: 3,
    manpower: 500,
    maxHp: 0.6,
    organization: 0,
    softAttack: 25,
    hardAttack: 2,
    defense: 10,
    breakthrough: 6,
    armor: 0,
    piercing: 5,
    maximumSpeed: 4.0,
    supplyConsumption: 0.20,
    trainingTime: 120,
    equipmentNeeds: { artillery_equipment: 36 },
    icon: '💥',
  },
  {
    id: 'anti_tank_brigade',
    name: 'Anti-Tank Battalion',
    category: 'artillery',
    isSupportCompany: false,
    combatWidth: 1,
    manpower: 500,
    maxHp: 0.6,
    organization: 0,
    softAttack: 3,
    hardAttack: 28,
    defense: 15,
    breakthrough: 2,
    armor: 0,
    piercing: 75,
    maximumSpeed: 4.0,
    supplyConsumption: 0.14,
    trainingTime: 120,
    equipmentNeeds: { anti_tank_equipment: 36 },
    icon: '🎯',
  },

  // Armor
  {
    id: 'medium_armor',
    name: 'Medium Tank Battalion',
    category: 'armor',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 500,
    maxHp: 2.0,
    organization: 10,
    softAttack: 24,
    hardAttack: 16,
    defense: 8,
    breakthrough: 36,
    armor: 60,
    piercing: 55,
    maximumSpeed: 8.0,
    supplyConsumption: 0.22,
    trainingTime: 140,
    equipmentNeeds: { medium_tank_chassis: 50 },
    icon: '🚜',
  },
  {
    id: 'heavy_armor',
    name: 'Heavy Tank Battalion',
    category: 'armor',
    isSupportCompany: false,
    combatWidth: 2,
    manpower: 500,
    maxHp: 2.0,
    organization: 8,
    softAttack: 32,
    hardAttack: 28,
    defense: 12,
    breakthrough: 50,
    armor: 110,
    piercing: 85,
    maximumSpeed: 5.5,
    supplyConsumption: 0.30,
    trainingTime: 160,
    equipmentNeeds: { heavy_tank_chassis: 40 },
    icon: '🏰',
  },

  // Support Companies (combatWidth = 0)
  {
    id: 'engineer',
    name: 'Engineer Support Company',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 2.0,
    organization: 20,
    softAttack: 4,
    hardAttack: 2,
    defense: 12,
    breakthrough: 5,
    armor: 0,
    piercing: 5,
    maximumSpeed: 4.0,
    supplyConsumption: 0.02,
    trainingTime: 90,
    equipmentNeeds: { support_equipment: 30 },
    icon: '🔧',
  },
  {
    id: 'support_artillery',
    name: 'Support Artillery',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 0.2,
    organization: 0,
    softAttack: 15,
    hardAttack: 1.5,
    defense: 6,
    breakthrough: 3,
    armor: 0,
    piercing: 4,
    maximumSpeed: 4.0,
    supplyConsumption: 0.08,
    trainingTime: 90,
    equipmentNeeds: { artillery_equipment: 24 },
    icon: '💥',
  },
  {
    id: 'recon',
    name: 'Motorized Recon Company',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 300,
    maxHp: 2.0,
    organization: 20,
    softAttack: 4,
    hardAttack: 1,
    defense: 8,
    breakthrough: 4,
    armor: 0,
    piercing: 4,
    maximumSpeed: 12.0,
    supplyConsumption: 0.04,
    trainingTime: 90,
    equipmentNeeds: { motorized_equipment: 24 },
    icon: '🔭',
  },
  {
    id: 'maintenance_company',
    name: 'Maintenance Support Company',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 250,
    maxHp: 2.0,
    organization: 15,
    softAttack: 1,
    hardAttack: 0.5,
    defense: 5,
    breakthrough: 2,
    armor: 0,
    piercing: 2,
    maximumSpeed: 4.0,
    supplyConsumption: 0.03,
    trainingTime: 90,
    equipmentNeeds: { support_equipment: 25 },
    icon: '🧰',
  },
  {
    id: 'logistics_company',
    name: 'Logistics Company',
    category: 'support',
    isSupportCompany: true,
    combatWidth: 0,
    manpower: 200,
    maxHp: 1.0,
    organization: 10,
    softAttack: 0,
    hardAttack: 0,
    defense: 4,
    breakthrough: 1,
    armor: 0,
    piercing: 1,
    maximumSpeed: 4.0,
    supplyConsumption: -0.15, // Reduces division supply consumption
    trainingTime: 90,
    equipmentNeeds: { motorized_equipment: 20, support_equipment: 15 },
    icon: '📦',
  },
];

const createEmptyTemplate = (): DivisionTemplateState => ({
  id: 'standard_infantry_div',
  name: 'Standard Infantry Division (9-1)',
  grid: [
    // Regiment 0: 3 Infantry
    [BATTALION_CATALOG[0], BATTALION_CATALOG[0], BATTALION_CATALOG[0], null, null],
    // Regiment 1: 3 Infantry
    [BATTALION_CATALOG[0], BATTALION_CATALOG[0], BATTALION_CATALOG[0], null, null],
    // Regiment 2: 3 Infantry
    [BATTALION_CATALOG[0], BATTALION_CATALOG[0], BATTALION_CATALOG[0], null, null],
    // Regiment 3: 1 Artillery
    [BATTALION_CATALOG[5], null, null, null, null],
    // Regiment 4: Empty
    [null, null, null, null, null],
  ],
  supportCompanies: [
    BATTALION_CATALOG[9], // Engineer
    BATTALION_CATALOG[10], // Support Art
    BATTALION_CATALOG[11], // Recon
    null,
    null,
  ],
  regimentalAttachments: [
    {
      regimentColumn: 0,
      attachmentId: 'regimental_recon',
      bonusSoftAttack: 2,
      bonusHardAttack: 1,
      bonusPlanningSpeed: 0.05,
    },
  ],
});

export const DivisionDesigner: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [template, setTemplate] = useState<DivisionTemplateState>(createEmptyTemplate);
  const [selectedCell, setSelectedCell] = useState<{
    type: 'grid' | 'support';
    col: number;
    row: number;
  } | null>(null);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  // Rollup Math
  const rollup: DivisionRollupStats = useMemo(() => {
    const combatBattalions: BattalionTypeInfo[] = [];
    for (const col of template.grid) {
      for (const slot of col) {
        if (slot) combatBattalions.push(slot);
      }
    }

    const supportCompanies: BattalionTypeInfo[] = [];
    for (const s of template.supportCompanies) {
      if (s) supportCompanies.push(s);
    }

    const allUnits = [...combatBattalions, ...supportCompanies];

    if (allUnits.length === 0) {
      return {
        totalBattalions: 0,
        totalSupportCompanies: 0,
        combatWidth: 0,
        manpower: 0,
        maxHp: 0,
        organization: 0,
        softAttack: 0,
        hardAttack: 0,
        defense: 0,
        breakthrough: 0,
        armor: 0,
        piercing: 0,
        maximumSpeed: 0,
        supplyConsumption: 0,
        trainingTime: 0,
      };
    }

    // Regimental attachment bonuses
    let bonusSoft = 0;
    let bonusHard = 0;
    template.regimentalAttachments.forEach((att) => {
      bonusSoft += att.bonusSoftAttack;
      bonusHard += att.bonusHardAttack;
    });

    // Combat Width: only combat battalions contribute!
    const combatWidth = combatBattalions.reduce((sum, b) => sum + b.combatWidth, 0);

    const manpower = allUnits.reduce((sum, u) => sum + u.manpower, 0);
    const maxHp = allUnits.reduce((sum, u) => sum + u.maxHp, 0);
    const softAttack = allUnits.reduce((sum, u) => sum + u.softAttack, 0) + bonusSoft;
    const hardAttack = allUnits.reduce((sum, u) => sum + u.hardAttack, 0) + bonusHard;
    const defense = allUnits.reduce((sum, u) => sum + u.defense, 0);
    const breakthrough = allUnits.reduce((sum, u) => sum + u.breakthrough, 0);
    const supplyConsumption = allUnits.reduce((sum, u) => sum + u.supplyConsumption, 0);

    // Organization is arithmetic average
    const totalOrg = allUnits.reduce((sum, u) => sum + u.organization, 0);
    const organization = totalOrg / allUnits.length;

    // Armor: 30% of highest armor + 70% of average armor across all units
    const maxArmor = Math.max(...allUnits.map((u) => u.armor), 0);
    const avgArmor = allUnits.reduce((sum, u) => sum + u.armor, 0) / allUnits.length;
    const armor = 0.3 * maxArmor + 0.7 * avgArmor;

    // Piercing: 40% of highest piercing + 60% of average piercing across all units
    const maxPiercing = Math.max(...allUnits.map((u) => u.piercing), 0);
    const avgPiercing = allUnits.reduce((sum, u) => sum + u.piercing, 0) / allUnits.length;
    const piercing = 0.4 * maxPiercing + 0.6 * avgPiercing;

    // Maximum speed: constrained by the slowest combat battalion (or support if 0 combat)
    const speedUnits = combatBattalions.length > 0 ? combatBattalions : supportCompanies;
    const maximumSpeed = Math.min(...speedUnits.map((u) => u.maximumSpeed));

    // Training time: max training time of any battalion
    const trainingTime = Math.max(...allUnits.map((u) => u.trainingTime), 0);

    return {
      totalBattalions: combatBattalions.length,
      totalSupportCompanies: supportCompanies.length,
      combatWidth,
      manpower,
      maxHp: Math.round(maxHp * 10) / 10,
      organization: Math.round(organization * 10) / 10,
      softAttack: Math.round(softAttack * 10) / 10,
      hardAttack: Math.round(hardAttack * 10) / 10,
      defense: Math.round(defense * 10) / 10,
      breakthrough: Math.round(breakthrough * 10) / 10,
      armor: Math.round(armor * 10) / 10,
      piercing: Math.round(piercing * 10) / 10,
      maximumSpeed: Math.round(maximumSpeed * 10) / 10,
      supplyConsumption: Math.round(supplyConsumption * 1000) / 1000,
      trainingTime,
    };
  }, [template]);

  const handleSelectBattalion = (battalion: BattalionTypeInfo | null) => {
    if (!selectedCell) return;
    if (selectedCell.type === 'grid') {
      const newGrid = template.grid.map((col, cIdx) =>
        col.map((slot, rIdx) =>
          cIdx === selectedCell.col && rIdx === selectedCell.row ? battalion : slot
        )
      );
      setTemplate((prev) => ({ ...prev, grid: newGrid }));
    } else {
      const newSupport = template.supportCompanies.map((slot, sIdx) =>
        sIdx === selectedCell.col ? battalion : slot
      );
      setTemplate((prev) => ({ ...prev, supportCompanies: newSupport }));
    }
    setShowCatalogModal(false);
  };

  const handleToggleRegimentalAttachment = (colIdx: number) => {
    const existing = template.regimentalAttachments.find((a) => a.regimentColumn === colIdx);
    if (existing) {
      setTemplate((prev) => ({
        ...prev,
        regimentalAttachments: prev.regimentalAttachments.filter(
          (a) => a.regimentColumn !== colIdx
        ),
      }));
      onNotify?.(`Removed regimental attachment from Regiment ${colIdx + 1}`);
    } else {
      const newAttachment: RegimentalAttachment = {
        regimentColumn: colIdx,
        attachmentId: 'regimental_recon',
        bonusSoftAttack: 3,
        bonusHardAttack: 1,
        bonusPlanningSpeed: 0.05,
      };
      setTemplate((prev) => ({
        ...prev,
        regimentalAttachments: [...prev.regimentalAttachments, newAttachment],
      }));
      onNotify?.(`Attached Regimental Support to Regiment ${colIdx + 1}`);
    }
  };

  const paradoxScript = `division_template = {
    name = "${template.name}"
    
    regiments = {
${template.grid
  .flatMap((col, cIdx) =>
    col
      .map((slot, rIdx) =>
        slot ? `        ${slot.id} = { x = ${cIdx} y = ${rIdx} }` : null
      )
      .filter(Boolean)
  )
  .join('\n')}
    }
    
    support = {
${template.supportCompanies
  .map((slot, sIdx) => (slot ? `        ${slot.id} = { x = 0 y = ${sIdx} }` : null))
  .filter(Boolean)
  .join('\n')}
    }
}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#d6b878]" />
          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplate((prev) => ({ ...prev, name: e.target.value }))}
            className="bg-transparent text-xs font-bold text-[#e3e5d9] border-b border-transparent hover:border-[#354332] focus:border-[#d6b878] focus:outline-none px-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTemplate(createEmptyTemplate())}
            className="px-2.5 py-1 rounded bg-[#1e271c] border border-[#30392e] text-xs text-[#909b88] hover:text-[#e3e5d9] transition"
          >
            Reset Template
          </button>
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#d6b878] text-[#141a14] font-bold text-xs hover:bg-[#e0c587] transition shadow"
          >
            <Code className="h-3.5 w-3.5" />
            Export Template .txt
          </button>
        </div>
      </div>

      {/* Main Container: 5 Support Slots + 5x5 Grid + Rollup Dashboard */}
      <div className="flex-1 flex overflow-hidden">
        {/* Support Companies Column (5 slots) */}
        <div className="w-56 bg-[#141a15] border-r border-[#30392e] p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-[#253223] pb-2">
            <span className="text-xs font-bold text-[#a6bd87] flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5" />
              Support Companies
            </span>
            <span className="text-[10px] font-mono text-[#71806b]">
              {rollup.totalSupportCompanies}/5
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {template.supportCompanies.map((slot, sIdx) => (
              <div
                key={sIdx}
                onClick={() => {
                  setSelectedCell({ type: 'support', col: sIdx, row: 0 });
                  setShowCatalogModal(true);
                }}
                className={`p-2.5 rounded border cursor-pointer transition flex items-center justify-between ${
                  slot
                    ? 'bg-[#1b251d] border-[#384935] hover:border-[#d6b878]'
                    : 'bg-[#111712] border-dashed border-[#293626] hover:border-[#4d6349]'
                }`}
              >
                {slot ? (
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-base">{slot.icon}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#e3e5d9] truncate">{slot.name}</div>
                      <div className="text-[10px] text-[#71806b]">Support</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#71806b] font-mono">+ Support Slot</span>
                )}
              </div>
            ))}
          </div>

          <div className="text-[10px] text-[#71806b] leading-tight pt-2 border-t border-[#253223]">
            Support companies do not consume combat width.
          </div>
        </div>

        {/* 5x5 Combat Battalions Grid */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-[#0d120f]">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#8b9983]">
              <span className="font-bold uppercase tracking-wider text-[#d6b878]">
                Combat Regiments (5 Columns × 5 Rows = 25 Slots)
              </span>
              <span className="font-mono text-xs">
                Total Combat Battalions: {rollup.totalBattalions}/25
              </span>
            </div>

            {/* 5 Columns Grid */}
            <div className="grid grid-cols-5 gap-3">
              {template.grid.map((col, colIdx) => {
                const colCount = col.filter(Boolean).length;
                const hasAttachment = template.regimentalAttachments.some(
                  (a) => a.regimentColumn === colIdx
                );

                return (
                  <div
                    key={colIdx}
                    className="flex flex-col space-y-2 bg-[#131a15] p-2.5 rounded-lg border border-[#263324]"
                  >
                    {/* Regiment Header & Attachment Toggle */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#232f21]">
                      <span className="text-[11px] font-bold text-[#8b9983]">
                        Regiment {colIdx + 1}
                      </span>
                      {colCount >= 3 && (
                        <button
                          onClick={() => handleToggleRegimentalAttachment(colIdx)}
                          title="Attach Regimental Support (+3 Soft Attack, +5% Planning)"
                          className={`text-[9px] px-1 rounded font-bold transition ${
                            hasAttachment
                              ? 'bg-[#d6b878] text-[#141a14]'
                              : 'bg-[#202a1e] text-[#a6bd87] hover:bg-[#2b3929]'
                          }`}
                        >
                          {hasAttachment ? '★ Attached' : '+ Attach'}
                        </button>
                      )}
                    </div>

                    {/* 5 Rows */}
                    {col.map((slot, rowIdx) => (
                      <div
                        key={rowIdx}
                        onClick={() => {
                          setSelectedCell({ type: 'grid', col: colIdx, row: rowIdx });
                          setShowCatalogModal(true);
                        }}
                        className={`w-28 h-16 rounded border cursor-pointer transition p-1.5 flex flex-col justify-between ${
                          slot
                            ? 'bg-[#1b251d] border-[#384935] hover:border-[#d6b878]'
                            : 'bg-[#0f1410] border-dashed border-[#232e21] hover:border-[#3e523b]'
                        }`}
                      >
                        {slot ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{slot.icon}</span>
                              <span className="text-[9px] font-mono font-bold px-1 rounded bg-[#101512] text-[#d6b878]">
                                {slot.combatWidth}w
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-[#e3e5d9] truncate">
                              {slot.name}
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[10px] text-[#556350] font-mono">
                            + Empty
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Division Rollup Dashboard */}
        <div className="w-80 bg-[#141a15] border-l border-[#30392e] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="border-b border-[#253223] pb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
                <Gauge className="h-4 w-4" />
                Division Rollup Statistics
              </span>
              <span className="text-[10px] font-mono text-[#a6bd87]">
                {rollup.combatWidth} Combat Width
              </span>
            </div>

            {/* Stat Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Combat Width</span>
                <div className="text-base font-bold font-mono text-[#d6b878]">
                  {rollup.combatWidth}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Total Manpower</span>
                <div className="text-base font-bold font-mono text-[#e3e5d9]">
                  {rollup.manpower.toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Max Hit Points</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {rollup.maxHp}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Organization (Avg)</span>
                <div className="text-base font-bold font-mono text-sky-400">
                  {rollup.organization}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Soft Attack</span>
                <div className="text-base font-bold font-mono text-[#e3e5d9]">
                  {rollup.softAttack}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Hard Attack</span>
                <div className="text-base font-bold font-mono text-[#e3e5d9]">
                  {rollup.hardAttack}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Defense</span>
                <div className="text-base font-bold font-mono text-[#e3e5d9]">
                  {rollup.defense}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Breakthrough</span>
                <div className="text-base font-bold font-mono text-[#e3e5d9]">
                  {rollup.breakthrough}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Armor (30/70)</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {rollup.armor}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Piercing (40/60)</span>
                <div className="text-base font-bold font-mono text-sky-400">
                  {rollup.piercing}
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Maximum Speed</span>
                <div className="text-base font-bold font-mono text-[#d6b878]">
                  {rollup.maximumSpeed} km/h
                </div>
              </div>

              <div className="p-2.5 bg-[#101512] border border-[#232e21] rounded">
                <span className="text-[10px] text-[#788871]">Supply Consumption</span>
                <div className="text-base font-bold font-mono text-[#e3e5d9]">
                  {rollup.supplyConsumption}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#101512] border border-[#232e21] rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#788871]">Training Time:</span>
                <span className="font-mono text-[#d6b878] font-bold">
                  {rollup.trainingTime} days
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#71806b] text-center border-t border-[#253223] pt-3">
            5x5 Division Grid Engine · Thunder At Our Gates Spec
          </div>
        </div>
      </div>

      {/* Battalion Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Select Battalion / Unit Type
              </span>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              <button
                onClick={() => handleSelectBattalion(null)}
                className="w-full p-2.5 rounded bg-[#101512] hover:bg-[#151c17] text-left text-xs text-[#71806b] border border-dashed border-[#2d3a2a]"
              >
                (Clear / Remove Battalion)
              </button>

              {BATTALION_CATALOG.filter((b) =>
                selectedCell?.type === 'support' ? b.isSupportCompany : !b.isSupportCompany
              ).map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectBattalion(b)}
                  className="p-3 bg-[#141b16] hover:bg-[#1e2720] border border-[#2a3828] rounded cursor-pointer transition text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{b.icon}</span>
                    <div>
                      <div className="font-bold text-[#e3e5d9]">{b.name}</div>
                      <div className="text-[10px] text-[#788871] font-mono">
                        {b.combatWidth}w · Org: {b.organization} · HP: {b.maxHp} · Soft: {b.softAttack} · Speed: {b.maximumSpeed} km/h
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#d6b878]">
                    {b.manpower} Men
                  </span>
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
                Exported Division Template Script (.txt)
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
                  onNotify?.('Copied division template to clipboard');
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
