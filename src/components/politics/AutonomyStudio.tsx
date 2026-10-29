import React, { useState } from 'react';
import type { AutonomyLevel } from '../../types/politics';
import { generateAutonomyScript } from '../../utils/politicsGenerators';
import {
  Layers,
  Plus,
  Copy,
  Check,
} from 'lucide-react';

const INITIAL_AUTONOMY_LEVELS: AutonomyLevel[] = [
  {
    id: 'dominion',
    name: 'Dominion',
    minFreedomLevel: 0.8,
    manpowerInfluence: 0.0,
    rules: {
      can_not_declare_war: false,
      can_decline_call_to_war: true,
      can_be_spymaster: true,
      contributes_operatives: true,
    },
    modifiers: {
      extra_trade_to_overlord_factor: 0.25,
      can_master_build_for_us: 1,
    },
  },
  {
    id: 'colony',
    name: 'Colony',
    minFreedomLevel: 0.5,
    manpowerInfluence: 0.7,
    rules: {
      can_not_declare_war: true,
      can_decline_call_to_war: false,
      can_be_spymaster: false,
      contributes_operatives: false,
    },
    modifiers: {
      autonomy_manpower_share: 0.7,
      extra_trade_to_overlord_factor: 0.5,
      can_master_build_for_us: 1,
    },
  },
  {
    id: 'puppet',
    name: 'Puppet',
    minFreedomLevel: 0.3,
    manpowerInfluence: 0.9,
    rules: {
      can_not_declare_war: true,
      can_decline_call_to_war: false,
      can_be_spymaster: false,
      contributes_operatives: false,
    },
    modifiers: {
      autonomy_manpower_share: 0.9,
      extra_trade_to_overlord_factor: 0.75,
      overlord_trade_cost_factor: -0.5,
      can_master_build_for_us: 1,
    },
  },
  {
    id: 'integrated_puppet',
    name: 'Integrated Puppet',
    minFreedomLevel: 0.1,
    manpowerInfluence: 1.0,
    rules: {
      can_not_declare_war: true,
      can_decline_call_to_war: false,
      can_be_spymaster: false,
      contributes_operatives: false,
    },
    modifiers: {
      autonomy_manpower_share: 1.0,
      extra_trade_to_overlord_factor: 1.0,
      overlord_trade_cost_factor: -0.9,
      can_master_build_for_us: 1,
    },
  },
  {
    id: 'reichskommissariat',
    name: 'Reichskommissariat',
    minFreedomLevel: 0.05,
    manpowerInfluence: 0.9,
    rules: {
      can_not_declare_war: true,
      can_decline_call_to_war: false,
      can_be_spymaster: false,
      contributes_operatives: false,
    },
    modifiers: {
      autonomy_manpower_share: 0.9,
      extra_trade_to_overlord_factor: 1.0,
      overlord_trade_cost_factor: -1.0,
      can_master_build_for_us: 1,
    },
  },
];

interface AutonomyStudioProps {
  onNotify?: (msg: string) => void;
}

export const AutonomyStudio: React.FC<AutonomyStudioProps> = ({ onNotify }) => {
  const [levels, setLevels] = useState<AutonomyLevel[]>(INITIAL_AUTONOMY_LEVELS);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const current = levels[selectedIdx] || levels[0];

  const handleUpdateCurrent = (updates: Partial<AutonomyLevel>) => {
    setLevels((prev) => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], ...updates };
      return next;
    });
  };

  const handleAddLevel = () => {
    const newLvl: AutonomyLevel = {
      id: `custom_autonomy_${levels.length + 1}`,
      name: `Custom Subject Level ${levels.length + 1}`,
      minFreedomLevel: 0.4,
      manpowerInfluence: 0.5,
      rules: {
        can_not_declare_war: true,
        can_decline_call_to_war: false,
        can_be_spymaster: false,
        contributes_operatives: false,
      },
      modifiers: {
        autonomy_manpower_share: 0.5,
        can_master_build_for_us: 1,
      },
    };
    setLevels([...levels, newLvl]);
    setSelectedIdx(levels.length);
  };

  const script = generateAutonomyScript(levels);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Layers className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            AUTONOMY PROGRESSION & PUPPET STUDIO
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            Manage subject-overlord hierarchy, freedom score thresholds, and master resource extraction
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddLevel}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#242d23] hover:bg-[#354130] text-[#d6b878] border border-[#3b4936] rounded text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Add Level
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(script);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
              onNotify?.('Copied autonomous states script');
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119] rounded text-xs font-bold transition shadow"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-950" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Script
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Ladder View */}
        <div className="w-72 border-r border-[#30392e] bg-[#141a15] p-3 overflow-y-auto space-y-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#909b88] px-1 block mb-1">
            Autonomy Ladder (Highest to Lowest Freedom)
          </span>

          {levels
            .slice()
            .sort((a, b) => b.minFreedomLevel - a.minFreedomLevel)
            .map((lvl) => {
              const actualIdx = levels.indexOf(lvl);
              const isSelected = actualIdx === selectedIdx;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setSelectedIdx(actualIdx)}
                  className={`p-3 rounded border transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#d6b878] text-[#1c2119] border-[#d6b878] shadow font-bold'
                      : 'bg-[#19211a] hover:bg-[#222d23] text-[#e3e5d9] border-[#2c3729]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate">{lvl.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">
                      {(lvl.minFreedomLevel * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-[10px] font-mono opacity-80 truncate">
                    autonomy_{lvl.id}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Center Level Inspector */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#101512]">
          {/* Level Details */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              Autonomy Level Definition
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Level Identifier Token
                </label>
                <input
                  type="text"
                  value={current.id}
                  onChange={(e) => handleUpdateCurrent({ id: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={current.name}
                  onChange={(e) => handleUpdateCurrent({ name: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
                />
              </div>
            </div>

            {/* Freedom Score Slider */}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-[#909b88] mb-1">
                <span>Minimum Freedom Score to Attain</span>
                <span className="font-mono text-[#d6b878]">
                  {(current.minFreedomLevel * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={current.minFreedomLevel}
                onChange={(e) =>
                  handleUpdateCurrent({ minFreedomLevel: parseFloat(e.target.value) })
                }
                className="w-full accent-[#d6b878]"
              />
            </div>

            {/* Manpower Influence Slider */}
            <div>
              <div className="flex justify-between text-xs text-[#909b88] mb-1">
                <span>Puppet Manpower Available to Overlord</span>
                <span className="font-mono text-[#d6b878]">
                  {(current.manpowerInfluence * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={current.manpowerInfluence}
                onChange={(e) =>
                  handleUpdateCurrent({ manpowerInfluence: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Autonomy Rules */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              Subject Diplomatic Constraints & Rules
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['can_not_declare_war', 'Forbidden From Declaring War'],
                  ['can_decline_call_to_war', 'Can Decline Overlord Call to War'],
                  ['can_be_spymaster', 'Can Form Separate Agency & Spymaster'],
                  ['contributes_operatives', 'Contributes Operatives to Overlord'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.rules[key]}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        rules: { ...current.rules, [key]: e.target.checked },
                      })
                    }
                    className="accent-[#d6b878] h-4 w-4 rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Code Preview */}
        <div className="w-96 border-l border-[#30392e] bg-[#0c100d] flex flex-col overflow-hidden shrink-0">
          <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-[#d6b878]">
              common/autonomous_states/*.txt
            </span>
          </div>

          <pre className="flex-1 p-3 font-mono text-[11px] text-[#a6bd87] leading-relaxed overflow-auto">
            {script}
          </pre>
        </div>
      </div>
    </div>
  );
};
