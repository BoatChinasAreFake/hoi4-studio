import React, { useState } from 'react';
import type { CharacterDef } from '../../types/politics';
import { generateCharacterScript } from '../../utils/politicsGenerators';
import {
  Users,
  UserPlus,
  Shield,
  Anchor,
  Atom,
  Crown,
  Briefcase,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';

const SAMPLE_CHARACTERS: CharacterDef[] = [
  {
    token: 'FRA_charles_de_gaulle',
    name: 'Charles de Gaulle',
    gender: 'male',
    portraits: {
      civilianLarge: 'GFX_portrait_de_gaulle_civ',
      civilianSmall: 'GFX_portrait_de_gaulle_civ_small',
      armyLarge: 'GFX_portrait_de_gaulle_army',
      armySmall: 'GFX_portrait_de_gaulle_army_small',
    },
    countryLeader: {
      ideology: 'democratic_socialism',
      expire: '1970.1.1',
      traits: ['staunch_monarchist'],
      id: -1,
    },
    corpsCommander: {
      skill: 4,
      attack: 4,
      defense: 3,
      planning: 4,
      logistics: 3,
      traits: ['armor_officer', 'panzer_leader'],
    },
    advisor: {
      slot: 'political_advisor',
      ideaToken: 'FRA_de_gaulle_advisor',
      ledger: 'army',
      cost: 150,
      traits: ['military_theorist'],
      aiWillDo: 1.5,
    },
  },
  {
    token: 'ENG_louis_mountbatten',
    name: 'Louis Mountbatten',
    gender: 'male',
    portraits: {
      civilianLarge: 'GFX_portrait_mountbatten_civ',
      armyLarge: 'GFX_portrait_mountbatten_navy',
    },
    navyLeader: {
      skill: 4,
      attack: 3,
      defense: 4,
      coordination: 5,
      maneuvering: 4,
      traits: ['cruiser_captain', 'destroyer_leader', 'seawolf', 'ironside'],
    },
    advisor: {
      slot: 'navy_chief',
      ideaToken: 'ENG_mountbatten_chief',
      ledger: 'navy',
      cost: 100,
      traits: ['naval_reformer'],
      aiWillDo: 1.0,
    },
  },
  {
    token: 'GER_werner_heisenberg',
    name: 'Werner Heisenberg',
    gender: 'male',
    portraits: {
      civilianLarge: 'GFX_portrait_heisenberg',
    },
    scientist: {
      traits: ['scientist_trait_nuclear_power_expert'],
      specializations: {
        specialization_nuclear: 4,
        specialization_electronics: 2,
      },
    },
  },
];

const NAVAL_TRAITS = [
  'cruiser_captain',
  'destroyer_leader',
  'seawolf',
  'ironside',
  'gunnery_expert',
  'torpedo_expert',
  'superior_tactician',
  'spotter',
  'fly_swatter',
  'fleet_protector',
];

interface CharacterStudioProps {
  onNotify?: (msg: string) => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({ onNotify }) => {
  const [characters, setCharacters] = useState<CharacterDef[]>(SAMPLE_CHARACTERS);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const current = characters[selectedIdx] || characters[0];

  const handleUpdateCurrent = (updates: Partial<CharacterDef>) => {
    setCharacters((prev) => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], ...updates };
      return next;
    });
  };

  const handleAddCharacter = () => {
    const newChar: CharacterDef = {
      token: `CUSTOM_leader_${characters.length + 1}`,
      name: `New Leader ${characters.length + 1}`,
      gender: 'male',
      portraits: {
        civilianLarge: 'GFX_portrait_generic_leader',
      },
      countryLeader: {
        ideology: 'liberalism',
        traits: ['charismatic_leader'],
        id: -1,
      },
    };
    setCharacters([...characters, newChar]);
    setSelectedIdx(characters.length);
    onNotify?.(`Added new character: ${newChar.token}`);
  };

  const handleDeleteCharacter = (idx: number) => {
    if (characters.length <= 1) {
      onNotify?.('Cannot delete the last remaining character.');
      return;
    }
    const next = characters.filter((_, i) => i !== idx);
    setCharacters(next);
    setSelectedIdx(Math.max(0, selectedIdx - 1));
    onNotify?.('Character deleted');
  };

  const handleToggleNavalTrait = (trait: string) => {
    if (!current.navyLeader) return;
    const existing = current.navyLeader.traits;
    const next = existing.includes(trait)
      ? existing.filter((t) => t !== trait)
      : [...existing, trait];
    handleUpdateCurrent({
      navyLeader: { ...current.navyLeader, traits: next },
    });
  };

  const generatedClausewitz = generateCharacterScript(characters);

  const filteredCharacters = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.token.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            UNIFIED CHARACTER & LEADER STUDIO
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            Multi-role characters: Country Leaders, Advisors, Army Commanders, Ship Captains, Scientists
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddCharacter}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#242d23] hover:bg-[#354130] text-[#d6b878] border border-[#3b4936] rounded text-xs font-semibold transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Character
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(generatedClausewitz);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
              onNotify?.('Copied characters Clausewitz script to clipboard');
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
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Characters Roster */}
        <div className="w-72 border-r border-[#30392e] bg-[#141a15] flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-[#242d23]">
            <input
              type="text"
              placeholder="Search characters or tokens..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCharacters.map((c) => {
              const actualIdx = characters.indexOf(c);
              const isSelected = actualIdx === selectedIdx;
              return (
                <div
                  key={c.token}
                  onClick={() => setSelectedIdx(actualIdx)}
                  className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                      : 'hover:bg-[#1f281e] text-[#e3e5d9]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {c.countryLeader && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    {c.navyLeader && <Anchor className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
                    {c.corpsCommander && <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                    {c.scientist && <Atom className="h-3.5 w-3.5 shrink-0 text-purple-400" />}
                    <div className="truncate">
                      <div className="text-xs truncate">{c.name}</div>
                      <div className="text-[10px] font-mono opacity-80 truncate">{c.token}</div>
                    </div>
                  </div>

                  {characters.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCharacter(actualIdx);
                      }}
                      className="p-1 hover:text-red-500 opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Character Inspector & Role Editor */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-[#101512]">
          {/* Identity & Portraits Card */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2 flex items-center gap-2">
              <Users className="h-4 w-4" /> Identity & Portraits
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Token Identifier
                </label>
                <input
                  type="text"
                  value={current.token}
                  onChange={(e) => handleUpdateCurrent({ token: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
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
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Gender
                </label>
                <select
                  value={current.gender}
                  onChange={(e) =>
                    handleUpdateCurrent({ gender: e.target.value as 'male' | 'female' })
                  }
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Civilian Large Portrait
                </label>
                <input
                  type="text"
                  value={current.portraits.civilianLarge || ''}
                  onChange={(e) =>
                    handleUpdateCurrent({
                      portraits: { ...current.portraits, civilianLarge: e.target.value },
                    })
                  }
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Army/Navy Large Portrait
                </label>
                <input
                  type="text"
                  value={current.portraits.armyLarge || ''}
                  onChange={(e) =>
                    handleUpdateCurrent({
                      portraits: { ...current.portraits, armyLarge: e.target.value },
                    })
                  }
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>
            </div>
          </div>

          {/* Role 1: Country Leader */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2c3729] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" /> Country Leader Role
              </h3>
              <input
                type="checkbox"
                checked={!!current.countryLeader}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleUpdateCurrent({
                      countryLeader: { ideology: 'liberalism', traits: ['charismatic_leader'] },
                    });
                  } else {
                    handleUpdateCurrent({ countryLeader: undefined });
                  }
                }}
                className="h-4 w-4 rounded accent-[#d6b878]"
              />
            </div>

            {current.countryLeader && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                    Ideology Sub-Type
                  </label>
                  <input
                    type="text"
                    value={current.countryLeader.ideology}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        countryLeader: { ...current.countryLeader!, ideology: e.target.value },
                      })
                    }
                    className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="text"
                    value={current.countryLeader.expire || '1965.1.1'}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        countryLeader: { ...current.countryLeader!, expire: e.target.value },
                      })
                    }
                    className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Role 2: Navy Leader & Ship Captains */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2c3729] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider flex items-center gap-2">
                <Anchor className="h-4 w-4 text-cyan-400" /> Navy Leader & Ship Captains
              </h3>
              <input
                type="checkbox"
                checked={!!current.navyLeader}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleUpdateCurrent({
                      navyLeader: {
                        skill: 3,
                        attack: 2,
                        defense: 3,
                        coordination: 4,
                        maneuvering: 3,
                        traits: ['cruiser_captain', 'seawolf'],
                      },
                    });
                  } else {
                    handleUpdateCurrent({ navyLeader: undefined });
                  }
                }}
                className="h-4 w-4 rounded accent-[#d6b878]"
              />
            </div>

            {current.navyLeader && (
              <div className="space-y-4 pt-2">
                {/* Sliders */}
                <div className="grid grid-cols-5 gap-3">
                  {(['skill', 'attack', 'defense', 'coordination', 'maneuvering'] as const).map(
                    (stat) => (
                      <div key={stat} className="bg-[#121613] p-2.5 rounded border border-[#2c3729]">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-[#909b88] mb-1">
                          <span>{stat}</span>
                          <span className="text-[#d6b878] font-mono">
                            {current.navyLeader![stat]}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={current.navyLeader![stat]}
                          onChange={(e) =>
                            handleUpdateCurrent({
                              navyLeader: {
                                ...current.navyLeader!,
                                [stat]: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="w-full accent-[#d6b878]"
                        />
                      </div>
                    )
                  )}
                </div>

                {/* Naval & Captain Traits */}
                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1.5">
                    Naval Captain Traits
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {NAVAL_TRAITS.map((tr) => {
                      const active = current.navyLeader!.traits.includes(tr);
                      return (
                        <button
                          key={tr}
                          onClick={() => handleToggleNavalTrait(tr)}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                            active
                              ? 'bg-cyan-800 text-cyan-100 border border-cyan-500 font-bold'
                              : 'bg-[#19211a] text-[#818f7c] border border-[#2c3729] hover:bg-[#253227]'
                          }`}
                        >
                          {tr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role 3: Advisor */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2c3729] pb-2">
              <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-400" /> Political & Military Advisor
              </h3>
              <input
                type="checkbox"
                checked={!!current.advisor}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleUpdateCurrent({
                      advisor: {
                        slot: 'political_advisor',
                        traits: ['captain_of_industry'],
                        cost: 100,
                        ledger: 'civilian',
                        aiWillDo: 1.0,
                      },
                    });
                  } else {
                    handleUpdateCurrent({ advisor: undefined });
                  }
                }}
                className="h-4 w-4 rounded accent-[#d6b878]"
              />
            </div>

            {current.advisor && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                    Slot
                  </label>
                  <select
                    value={current.advisor.slot}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        advisor: { ...current.advisor!, slot: e.target.value },
                      })
                    }
                    className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
                  >
                    <option value="political_advisor">political_advisor</option>
                    <option value="army_chief">army_chief</option>
                    <option value="navy_chief">navy_chief</option>
                    <option value="air_chief">air_chief</option>
                    <option value="high_command">high_command</option>
                    <option value="theorist">theorist</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                    Political Power Cost
                  </label>
                  <input
                    type="number"
                    value={current.advisor.cost || 100}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        advisor: { ...current.advisor!, cost: parseInt(e.target.value) || 100 },
                      })
                    }
                    className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                    Ledger
                  </label>
                  <select
                    value={current.advisor.ledger || 'civilian'}
                    onChange={(e) =>
                      handleUpdateCurrent({
                        advisor: {
                          ...current.advisor!,
                          ledger: e.target.value as 'civilian' | 'army' | 'navy' | 'air',
                        },
                      })
                    }
                    className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
                  >
                    <option value="civilian">Civilian</option>
                    <option value="army">Army</option>
                    <option value="navy">Navy</option>
                    <option value="air">Air</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Live Script Panel */}
        <div className="w-96 border-l border-[#30392e] bg-[#0c100d] flex flex-col overflow-hidden shrink-0">
          <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-[#d6b878]">common/characters/*.txt</span>
            <span className="text-[10px] text-[#909b88]">Live Clausewitz</span>
          </div>

          <pre className="flex-1 p-3 font-mono text-[11px] text-[#a6bd87] leading-relaxed overflow-auto">
            {generatedClausewitz}
          </pre>
        </div>
      </div>
    </div>
  );
};
