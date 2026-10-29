import React, { useState, useMemo } from 'react';
import type { DoctrineNodeDef, DoctrineCategory } from '../../types/military';
import {
  Lock,
  Unlock,
  Shield,
  Anchor,
  Plane,
  Sparkles,
  Award,
  AlertTriangle,
  Code,
} from 'lucide-react';

const DOCTRINE_DATABASE: DoctrineNodeDef[] = [
  // Land Doctrines - Mobile Warfare
  {
    id: 'mobile_warfare',
    name: 'Mobile Warfare',
    branch: 'mobile_warfare',
    category: 'land',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['superior_firepower', 'grand_battleplan', 'mass_assault'],
    statModifiers: {
      armor_speed_factor: '+10%',
      breakthrough_factor: '+15%',
      division_organization: '+10',
    },
    description: 'Emphasizes high-speed mechanized breakthroughs, radio coordination, and encircle-and-destroy tactics.',
    icon: '⚡',
  },
  {
    id: 'blitzkrieg',
    name: 'Blitzkrieg',
    branch: 'mobile_warfare',
    category: 'land',
    level: 2,
    costXp: 100,
    parentDoctrineId: 'mobile_warfare',
    statModifiers: {
      tank_breakthrough: '+20%',
      planning_speed: '+25%',
    },
    description: 'Concentrated armored spearheads driving deep behind enemy operational lines.',
    icon: '🚜',
  },
  {
    id: 'modern_blitzkrieg',
    name: 'Modern Blitzkrieg',
    branch: 'mobile_warfare',
    category: 'land',
    level: 3,
    costXp: 100,
    parentDoctrineId: 'blitzkrieg',
    statModifiers: {
      all_armor_org: '+5',
      hard_attack_factor: '+15%',
    },
    description: 'Fully integrated combined-arms armor and close-air support coordination.',
    icon: '🏆',
  },

  // Land Doctrines - Superior Firepower
  {
    id: 'superior_firepower',
    name: 'Superior Firepower',
    branch: 'superior_firepower',
    category: 'land',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['mobile_warfare', 'grand_battleplan', 'mass_assault'],
    statModifiers: {
      infantry_soft_attack: '+10%',
      artillery_soft_attack: '+15%',
      division_defense: '+5%',
    },
    description: 'Focuses on massive artillery preparation, air superiority, and devastating ordnance expenditure.',
    icon: '💥',
  },
  {
    id: 'shock_and_awe',
    name: 'Shock and Awe',
    branch: 'superior_firepower',
    category: 'land',
    level: 2,
    costXp: 100,
    parentDoctrineId: 'superior_firepower',
    statModifiers: {
      support_company_soft_attack: '+25%',
      artillery_org: '+5',
    },
    description: 'Continuous rolling barrages that demoralize the enemy before infantry assaults.',
    icon: '🎯',
  },

  // Land Doctrines - Grand Battleplan
  {
    id: 'grand_battleplan',
    name: 'Grand Battleplan',
    branch: 'grand_battleplan',
    category: 'land',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['mobile_warfare', 'superior_firepower', 'mass_assault'],
    statModifiers: {
      max_planning: '+30%',
      max_entrenchment: '+10',
      division_defense: '+15%',
    },
    description: 'Rigid staff planning, deep logistics staging, and methodical trench fortified lines.',
    icon: '🗺️',
  },

  // Land Doctrines - Mass Assault
  {
    id: 'mass_assault',
    name: 'Mass Assault',
    branch: 'mass_assault',
    category: 'land',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['mobile_warfare', 'superior_firepower', 'grand_battleplan'],
    statModifiers: {
      combat_width_factor: '-20%',
      reinforce_rate: '+15%',
      supply_consumption_factor: '-10%',
    },
    description: 'Overwhelms opposition through massive mobilization, simplified logistics, and deep operational reserves.',
    icon: '👥',
  },

  // Naval Doctrines
  {
    id: 'fleet_in_being',
    name: 'Fleet in Being',
    branch: 'fleet_in_being',
    category: 'naval',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['trade_interdiction', 'base_strike'],
    statModifiers: {
      capital_ship_armor: '+10%',
      battleship_heavy_gun_hit: '+15%',
    },
    description: 'Dominance through massive battleship lines controlling oceanic bottlenecks.',
    icon: '⚓',
  },
  {
    id: 'trade_interdiction',
    name: 'Trade Interdiction',
    branch: 'trade_interdiction',
    category: 'naval',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['fleet_in_being', 'base_strike'],
    statModifiers: {
      submarine_stealth: '+20%',
      convoy_raiding_efficiency: '+35%',
    },
    description: 'Wolfpack submarine operations starving enemy industry of overseas trade.',
    icon: '🌊',
  },
  {
    id: 'base_strike',
    name: 'Base Strike',
    branch: 'base_strike',
    category: 'naval',
    level: 1,
    costXp: 100,
    mutuallyExclusiveWith: ['fleet_in_being', 'trade_interdiction'],
    statModifiers: {
      carrier_sortie_efficiency: '+20%',
      naval_strike_factor: '+25%',
    },
    description: 'Aircraft carrier air groups replacing traditional battlelines as primary strike power.',
    icon: '✈️',
  },

  // Special Forces
  {
    id: 'mountaineer_pioneers',
    name: 'Alpine High-Altitude Warfare',
    branch: 'mountaineers',
    category: 'special_forces',
    level: 1,
    costXp: 75,
    statModifiers: {
      mountain_attack: '+25%',
      acclimatization_speed: '+30%',
    },
    description: 'Specialized lightweight mountain artillery and technical climbing equipment.',
    icon: '⛰️',
  },
  {
    id: 'marine_commando_landing',
    name: 'Amphibious Spearhead',
    branch: 'marines',
    category: 'special_forces',
    level: 1,
    costXp: 75,
    statModifiers: {
      amphibious_invasion_penalty: '-30%',
      naval_landing_defense: '+20%',
    },
    description: 'Specialized landing crafts and shoreline suppression fire support.',
    icon: '🏖️',
  },
];

export const DoctrineStudio: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [doctrines] = useState<DoctrineNodeDef[]>(DOCTRINE_DATABASE);
  const [activeCategory, setActiveCategory] = useState<DoctrineCategory>('land');
  const [selectedDoctrineId, setSelectedDoctrineId] = useState<string>('mobile_warfare');
  const [unlockedDoctrines, setUnlockedDoctrines] = useState<Set<string>>(
    new Set(['mobile_warfare', 'blitzkrieg', 'fleet_in_being'])
  );
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  const currentCategoryDoctrines = useMemo(() => {
    return doctrines.filter((d) => d.category === activeCategory);
  }, [doctrines, activeCategory]);

  const selectedDoctrine =
    doctrines.find((d) => d.id === selectedDoctrineId) || doctrines[0];

  const handleToggleUnlock = (doctrine: DoctrineNodeDef) => {
    const nextUnlocked = new Set(unlockedDoctrines);

    if (nextUnlocked.has(doctrine.id)) {
      nextUnlocked.delete(doctrine.id);
      onNotify?.(`Locked doctrine: ${doctrine.name}`);
    } else {
      // Check mutual exclusivity! If unlocking, remove mutually exclusive partner doctrines
      if (doctrine.mutuallyExclusiveWith) {
        doctrine.mutuallyExclusiveWith.forEach((mutId) => {
          doctrines
            .filter((d) => d.branch === mutId || d.id === mutId)
            .forEach((d) => nextUnlocked.delete(d.id));
        });
      }
      nextUnlocked.add(doctrine.id);
      onNotify?.(`Unlocked doctrine: ${doctrine.name}`);
    }

    setUnlockedDoctrines(nextUnlocked);
  };

  const cumulativeModifiers = useMemo(() => {
    const table: Record<string, string | number> = {};
    unlockedDoctrines.forEach((id) => {
      const doc = doctrines.find((d) => d.id === id);
      if (doc) {
        Object.entries(doc.statModifiers).forEach(([k, v]) => {
          table[k] = v;
        });
      }
    });
    return table;
  }, [unlockedDoctrines, doctrines]);

  const paradoxScript = `doctrine_tree = {
${Array.from(unlockedDoctrines)
  .map((id) => `    enable_doctrine = ${id}`)
  .join('\n')}
}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header Filter */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {(['land', 'naval', 'air', 'special_forces'] as DoctrineCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                const first = doctrines.find((d) => d.category === cat);
                if (first) setSelectedDoctrineId(first.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold capitalize transition ${
                activeCategory === cat
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              {cat === 'land' && <Shield className="h-3.5 w-3.5" />}
              {cat === 'naval' && <Anchor className="h-3.5 w-3.5" />}
              {cat === 'air' && <Plane className="h-3.5 w-3.5" />}
              {cat === 'special_forces' && <Award className="h-3.5 w-3.5" />}
              <span>{cat.replace('_', ' ')}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e271c] border border-[#30392e] text-xs text-[#909b88] hover:text-[#e3e5d9] transition"
          >
            <Code className="h-3.5 w-3.5" />
            Export Doctrines .txt
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree List */}
        <div className="w-80 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto p-3 space-y-2">
          <div className="text-[11px] font-bold text-[#8b9983] border-b border-[#232e21] pb-1.5 flex justify-between">
            <span className="capitalize">{activeCategory.replace('_', ' ')} Doctrine Branches</span>
            <span className="font-mono text-[10px] text-[#a6bd87]">
              {unlockedDoctrines.size} Active
            </span>
          </div>

          {currentCategoryDoctrines.map((doc) => {
            const isUnlocked = unlockedDoctrines.has(doc.id);
            const isSelected = doc.id === selectedDoctrine.id;

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoctrineId(doc.id)}
                className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1.5 ${
                  isSelected
                    ? 'bg-[#222c20] border-[#d6b878] text-[#e3e5d9]'
                    : isUnlocked
                    ? 'bg-[#18201a] border-[#364934] text-[#a4b39c]'
                    : 'bg-[#111712] border-transparent text-[#667562] opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span>{doc.icon}</span>
                    <span className="truncate">{doc.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleUnlock(doc);
                    }}
                    className={`p-1 rounded text-xs transition ${
                      isUnlocked
                        ? 'bg-[#293d2b] text-emerald-400'
                        : 'bg-[#1a221b] text-[#71806b] hover:text-[#e3e5d9]'
                    }`}
                  >
                    {isUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="text-[10px] text-[#788871] line-clamp-2 leading-relaxed">
                  {doc.description}
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-[#232f22]">
                  <span className="text-[#d6b878]">{doc.costXp} Army XP</span>
                  <span className="capitalize">{doc.branch.replace('_', ' ')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Selected Doctrine Inspector */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedDoctrine.icon}</span>
                <div>
                  <h2 className="text-sm font-bold text-[#d6b878]">{selectedDoctrine.name}</h2>
                  <div className="text-[10px] text-[#788871] font-mono">
                    Branch: {selectedDoctrine.branch} · Level {selectedDoctrine.level}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggleUnlock(selectedDoctrine)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 shadow ${
                  unlockedDoctrines.has(selectedDoctrine.id)
                    ? 'bg-emerald-600 text-[#141a14]'
                    : 'bg-[#d6b878] text-[#141a14] hover:bg-[#e0c587]'
                }`}
              >
                {unlockedDoctrines.has(selectedDoctrine.id) ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Adopted
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Adopt Doctrine ({selectedDoctrine.costXp} XP)
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[#a6bd87] leading-relaxed">
              {selectedDoctrine.description}
            </p>

            {/* Mutually Exclusive Branches warning */}
            {selectedDoctrine.mutuallyExclusiveWith && (
              <div className="p-3 bg-[#241310] border border-[#4d251e] rounded text-xs text-[#f09d8d] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Mutually Exclusive Doctrine Lockout
                </div>
                <div>
                  Adopting this doctrine immediately locks out all opposing branches:{' '}
                  {selectedDoctrine.mutuallyExclusiveWith.join(', ')}.
                </div>
              </div>
            )}

            {/* Stat Modifiers Table */}
            <div className="pt-3 border-t border-[#232f21] space-y-2">
              <span className="text-xs font-bold text-[#e3e5d9]">Divisional Modifiers</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(selectedDoctrine.statModifiers).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between p-2 rounded bg-[#101512] border border-[#232e21]"
                  >
                    <span className="text-[#8b9983]">{k.replace(/_/g, ' ')}:</span>
                    <span className="text-emerald-400 font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cumulative Modifiers Table Across All Active Doctrines */}
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-3">
            <h3 className="text-xs font-bold text-[#d6b878] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Active National Doctrine Bonuses (Cumulative)
            </h3>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {Object.entries(cumulativeModifiers).map(([k, v]) => (
                <div
                  key={k}
                  className="p-2 rounded bg-[#101512] border border-[#232e21] flex justify-between"
                >
                  <span className="text-[#8b9983] truncate">{k.replace(/_/g, ' ')}:</span>
                  <span className="text-[#d6b878] font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported Doctrine Script (.txt)
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
                  onNotify?.('Copied doctrine script to clipboard');
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
