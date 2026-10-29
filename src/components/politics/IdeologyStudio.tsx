import React, { useState } from 'react';
import type { IdeologyDefinition } from '../../types/politics';
import { generateIdeologyScript } from '../../utils/politicsGenerators';
import {
  Compass,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

const INITIAL_IDEOLOGIES: IdeologyDefinition[] = [
  {
    name: 'democratic',
    group: 'democratic',
    color: [0, 0, 255],
    subTypes: ['conservatism', 'liberalism', 'socialism'],
    rules: {
      can_force_government: true,
      can_puppet: false,
      can_send_volunteers: false,
      can_be_spymaster: true,
      can_declare_war_on_same_ideology: false,
    },
    warImpactOnWorldTension: 0.2,
    dynamicFactionNames: ['FACTION_NAME_DEMOCRATIC_1', 'FACTION_NAME_DEMOCRATIC_2'],
  },
  {
    name: 'communism',
    group: 'communism',
    color: [255, 0, 0],
    subTypes: ['marxism', 'leninism', 'stalinism', 'anti_revisionism'],
    rules: {
      can_force_government: true,
      can_puppet: true,
      can_send_volunteers: true,
      can_be_spymaster: true,
      can_declare_war_on_same_ideology: true,
    },
    warImpactOnWorldTension: 0.75,
    dynamicFactionNames: ['FACTION_NAME_COMMUNIST_1', 'FACTION_NAME_COMMUNIST_2'],
  },
  {
    name: 'fascism',
    group: 'fascism',
    color: [150, 75, 0],
    subTypes: ['nazism', 'gen_nazism', 'fascism_ideology', 'falangism'],
    rules: {
      can_force_government: false,
      can_puppet: true,
      can_send_volunteers: true,
      can_be_spymaster: true,
      can_declare_war_on_same_ideology: true,
    },
    warImpactOnWorldTension: 1.0,
    dynamicFactionNames: ['FACTION_NAME_FASCIST_1', 'FACTION_NAME_FASCIST_2'],
  },
  {
    name: 'neutrality',
    group: 'neutrality',
    color: [124, 124, 124],
    subTypes: ['despotism', 'oligarchism', 'moderatism', 'anarchism'],
    rules: {
      can_force_government: true,
      can_puppet: true,
      can_send_volunteers: false,
      can_be_spymaster: false,
      can_declare_war_on_same_ideology: true,
    },
    warImpactOnWorldTension: 0.4,
    dynamicFactionNames: ['FACTION_NAME_NONALIGNED_1'],
  },
];

interface IdeologyStudioProps {
  onNotify?: (msg: string) => void;
}

export const IdeologyStudio: React.FC<IdeologyStudioProps> = ({ onNotify }) => {
  const [ideologies, setIdeologies] = useState<IdeologyDefinition[]>(INITIAL_IDEOLOGIES);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [newSubType, setNewSubType] = useState<string>('');

  const current = ideologies[selectedIdx] || ideologies[0];

  const handleUpdateCurrent = (updates: Partial<IdeologyDefinition>) => {
    setIdeologies((prev) => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], ...updates };
      return next;
    });
  };

  const handleAddSubType = () => {
    const st = newSubType.trim().toLowerCase();
    if (!st || current.subTypes.includes(st)) return;
    handleUpdateCurrent({
      subTypes: [...current.subTypes, st],
    });
    setNewSubType('');
  };

  const handleRemoveSubType = (subType: string) => {
    handleUpdateCurrent({
      subTypes: current.subTypes.filter((s) => s !== subType),
    });
  };

  const clausewitzScript = generateIdeologyScript(ideologies);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Compass className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            IDEOLOGY & SUB-IDEOLOGY STUDIO
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            Core groups (Democratic, Fascism, Communism, Neutrality) and sub-ideology tokens
          </span>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(clausewitzScript);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onNotify?.('Copied 00_ideologies.txt script');
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119] rounded text-xs font-bold transition shadow"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-950" /> Copied Script!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy Script
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Ideology List */}
        <div className="w-64 border-r border-[#30392e] bg-[#141a15] p-2 space-y-1 overflow-y-auto shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#909b88] px-2 py-1 block">
            Ideology Groups ({ideologies.length})
          </span>
          {ideologies.map((ideo, idx) => (
            <div
              key={ideo.name}
              onClick={() => setSelectedIdx(idx)}
              className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition ${
                selectedIdx === idx
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                  : 'hover:bg-[#1f281e] text-[#e3e5d9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: `rgb(${ideo.color[0]}, ${ideo.color[1]}, ${ideo.color[2]})`,
                  }}
                  className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                />
                <span className="capitalize text-xs">{ideo.name}</span>
              </div>
              <span className="text-[10px] opacity-75">{ideo.subTypes.length} types</span>
            </div>
          ))}
        </div>

        {/* Center Editor */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#101512]">
          {/* Color & World Tension */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              Color & World Tension Factor
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Color RGB
                </label>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      backgroundColor: `rgb(${current.color[0]}, ${current.color[1]}, ${current.color[2]})`,
                    }}
                    className="w-8 h-8 rounded border border-white/20 shadow shrink-0"
                  />
                  <div className="grid grid-cols-3 gap-1 flex-1 font-mono text-xs">
                    {(['R', 'G', 'B'] as const).map((ch, idx) => (
                      <input
                        key={ch}
                        type="number"
                        min={0}
                        max={255}
                        value={current.color[idx]}
                        onChange={(e) => {
                          const next: [number, number, number] = [...current.color];
                          next[idx] = parseInt(e.target.value) || 0;
                          handleUpdateCurrent({ color: next });
                        }}
                        className="bg-[#121613] border border-[#2c3729] rounded p-1 text-center text-[#e3e5d9]"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#909b88] uppercase mb-1">
                  <span>War Impact on World Tension</span>
                  <span className="font-mono text-[#d6b878]">
                    {current.warImpactOnWorldTension.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={current.warImpactOnWorldTension}
                  onChange={(e) =>
                    handleUpdateCurrent({
                      warImpactOnWorldTension: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#d6b878]"
                />
              </div>
            </div>
          </div>

          {/* Sub-Ideology Tokens Manager */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              Sub-Ideology Tokens ({current.subTypes.length})
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {current.subTypes.map((st) => (
                <span
                  key={st}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-mono text-[#d6b878]"
                >
                  {st}
                  <button
                    onClick={() => handleRemoveSubType(st)}
                    className="hover:text-red-400 text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-sm pt-2">
              <input
                type="text"
                placeholder="New sub-ideology token..."
                value={newSubType}
                onChange={(e) => setNewSubType(e.target.value)}
                className="bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] flex-1"
              />
              <button
                onClick={handleAddSubType}
                className="px-3 py-1 bg-[#242d23] hover:bg-[#354130] text-[#e3e5d9] rounded text-xs font-semibold"
              >
                Add Type
              </button>
            </div>
          </div>

          {/* Government & Diplomatic Rules */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Government & War Rules
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {(
                [
                  ['can_force_government', 'Can Force Ideology / Government in Peace Deals'],
                  ['can_puppet', 'Can Create Puppets / Protectorates'],
                  ['can_send_volunteers', 'Can Send Volunteers Without War'],
                  ['can_be_spymaster', 'Eligible to Become Faction Spymaster'],
                  ['can_declare_war_on_same_ideology', 'Can Declare War on Same Ideology'],
                ] as const
              ).map(([ruleKey, label]) => (
                <label
                  key={ruleKey}
                  className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={current.rules[ruleKey]}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        rules: { ...current.rules, [ruleKey]: e.target.checked },
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
              common/ideologies/00_ideologies.txt
            </span>
          </div>

          <pre className="flex-1 p-3 font-mono text-[11px] text-[#a6bd87] leading-relaxed overflow-auto">
            {clausewitzScript}
          </pre>
        </div>
      </div>
    </div>
  );
};
