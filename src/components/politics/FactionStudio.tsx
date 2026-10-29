import React, { useState } from 'react';
import type { FactionDef } from '../../types/politics';
import { generateFactionScript } from '../../utils/politicsGenerators';
import {
  ShieldAlert,
  Target,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

const INITIAL_FACTION: FactionDef = {
  name: 'Allies of Democracy',
  leaderTag: 'ENG',
  ideology: 'democratic',
  rules: {
    leaderVetoPeace: true,
    canPuppetJoin: false,
    worldTensionThreshold: 0.25,
    offensiveWarAllowed: false,
    mutualDefenseTrigger: true,
  },
  memberTags: ['ENG', 'FRA', 'CAN', 'AST', 'NZL'],
  goals: [
    {
      id: 'secure_mediterranean',
      name: 'Secure the Mediterranean',
      description: 'Ensure maritime control of Gibraltar and Suez canals.',
      rewardModifier: {
        naval_strike_factor: 0.15,
        consumer_goods_factor: -0.03,
      },
    },
    {
      id: 'continental_liberation',
      name: 'Operation Overlord & Continental Liberation',
      description: 'Launch joint amphibious offensive on the Atlantic coast.',
      rewardModifier: {
        amphibious_invasion_speed: 0.2,
        war_support_factor: 0.1,
      },
    },
  ],
};

interface FactionStudioProps {
  onNotify?: (msg: string) => void;
}

export const FactionStudio: React.FC<FactionStudioProps> = ({ onNotify }) => {
  const [faction, setFaction] = useState<FactionDef>(INITIAL_FACTION);
  const [copied, setCopied] = useState<boolean>(false);
  const [newMemberTag, setNewMemberTag] = useState<string>('');

  const handleAddGoal = () => {
    const id = `goal_${faction.goals.length + 1}`;
    setFaction({
      ...faction,
      goals: [
        ...faction.goals,
        {
          id,
          name: `Alliance Goal ${faction.goals.length + 1}`,
          description: 'Joint strategic initiative for faction members.',
          rewardModifier: { political_power_gain: 0.1 },
        },
      ],
    });
  };

  const handleRemoveGoal = (index: number) => {
    setFaction({
      ...faction,
      goals: faction.goals.filter((_, i) => i !== index),
    });
  };

  const handleAddMember = () => {
    const tag = newMemberTag.trim().toUpperCase();
    if (!tag || faction.memberTags.includes(tag)) return;
    setFaction({
      ...faction,
      memberTags: [...faction.memberTags, tag],
    });
    setNewMemberTag('');
  };

  const handleRemoveMember = (tag: string) => {
    setFaction({
      ...faction,
      memberTags: faction.memberTags.filter((t) => t !== tag),
    });
  };

  const { rulesScript, goalsScript } = generateFactionScript(faction);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            FACTION RULES & GOALS STUDIO (NCNS)
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            No Compromise, No Surrender alliance dynamics, veto powers & theatre objectives
          </span>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(`${rulesScript}\n\n${goalsScript}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onNotify?.('Copied faction rules & goals scripts');
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119] rounded text-xs font-bold transition shadow"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-950" /> Copied Scripts!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy Scripts
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Form */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#101512]">
          {/* Faction Header Details */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              Faction Identity
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Faction Name
                </label>
                <input
                  type="text"
                  value={faction.name}
                  onChange={(e) => setFaction({ ...faction, name: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Leader Tag
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={faction.leaderTag}
                  onChange={(e) =>
                    setFaction({ ...faction, leaderTag: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Ideology Group
                </label>
                <input
                  type="text"
                  value={faction.ideology}
                  onChange={(e) => setFaction({ ...faction, ideology: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
                />
              </div>
            </div>

            {/* Members Tag Badges */}
            <div className="pt-2">
              <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1.5">
                Member Countries
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {faction.memberTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#242d23] border border-[#3b4936] text-xs font-mono font-bold text-[#d6b878]"
                  >
                    {tag}
                    {tag !== faction.leaderTag && (
                      <button
                        onClick={() => handleRemoveMember(tag)}
                        className="hover:text-red-400 ml-1 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  maxLength={3}
                  placeholder="ADD TAG (e.g. USA)"
                  value={newMemberTag}
                  onChange={(e) => setNewMemberTag(e.target.value.toUpperCase())}
                  className="bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] w-32"
                />
                <button
                  onClick={handleAddMember}
                  className="px-2.5 py-1 bg-[#242d23] hover:bg-[#354130] text-[#e3e5d9] rounded text-xs font-semibold"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>

          {/* NCNS Rules Card */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              Non-Core National Security (NCNS) Rules
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={faction.rules.leaderVetoPeace}
                  onChange={(e) =>
                    setFaction({
                      ...faction,
                      rules: { ...faction.rules, leaderVetoPeace: e.target.checked },
                    })
                  }
                  className="accent-[#d6b878] h-4 w-4 rounded"
                />
                <span>Leader Veto Power Over Peace Deals</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={faction.rules.mutualDefenseTrigger}
                  onChange={(e) =>
                    setFaction({
                      ...faction,
                      rules: { ...faction.rules, mutualDefenseTrigger: e.target.checked },
                    })
                  }
                  className="accent-[#d6b878] h-4 w-4 rounded"
                />
                <span>Automatic Mutual Defense War Trigger</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={faction.rules.offensiveWarAllowed}
                  onChange={(e) =>
                    setFaction({
                      ...faction,
                      rules: { ...faction.rules, offensiveWarAllowed: e.target.checked },
                    })
                  }
                  className="accent-[#d6b878] h-4 w-4 rounded"
                />
                <span>Offensive War Permission Without Unanimity</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                <input
                  type="checkbox"
                  checked={faction.rules.canPuppetJoin}
                  onChange={(e) =>
                    setFaction({
                      ...faction,
                      rules: { ...faction.rules, canPuppetJoin: e.target.checked },
                    })
                  }
                  className="accent-[#d6b878] h-4 w-4 rounded"
                />
                <span>Puppets & Colonies Allowed Full Voting Rights</span>
              </label>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-[#909b88] mb-1">
                <span>World Tension Joining Threshold</span>
                <span className="font-mono text-[#d6b878]">
                  {(faction.rules.worldTensionThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={faction.rules.worldTensionThreshold}
                onChange={(e) =>
                  setFaction({
                    ...faction,
                    rules: {
                      ...faction.rules,
                      worldTensionThreshold: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full accent-[#d6b878]"
              />
            </div>
          </div>

          {/* Faction Goals Card */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2c3729] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" /> Strategic Alliance Goals ({faction.goals.length})
              </h3>
              <button
                onClick={handleAddGoal}
                className="flex items-center gap-1 px-2.5 py-0.5 bg-[#242d23] hover:bg-[#354130] text-[#d6b878] rounded text-xs"
              >
                <Plus className="h-3 w-3" /> Add Goal
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {faction.goals.map((g, idx) => (
                <div key={g.id} className="p-3 bg-[#121613] border border-[#2c3729] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={g.name}
                      onChange={(e) => {
                        const next = [...faction.goals];
                        next[idx].name = e.target.value;
                        setFaction({ ...faction, goals: next });
                      }}
                      className="bg-transparent font-bold text-xs text-[#e3e5d9] focus:outline-none border-b border-transparent focus:border-[#d6b878] w-1/2"
                    />
                    <button
                      onClick={() => handleRemoveGoal(idx)}
                      className="text-[#909b88] hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={g.description}
                    onChange={(e) => {
                      const next = [...faction.goals];
                      next[idx].description = e.target.value;
                      setFaction({ ...faction, goals: next });
                    }}
                    className="w-full bg-[#171e18] border border-[#2c3729] rounded px-2 py-1 text-xs text-[#8c9c86]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Code Preview */}
        <div className="w-96 border-l border-[#30392e] bg-[#0c100d] flex flex-col overflow-hidden shrink-0">
          <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-[#d6b878]">
              common/faction_rules/ & goals
            </span>
          </div>
          <pre className="flex-1 p-3 font-mono text-[11px] text-[#a6bd87] leading-relaxed overflow-auto">
            {`${rulesScript}\n\n${goalsScript}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
