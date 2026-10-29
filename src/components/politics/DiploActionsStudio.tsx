import React, { useState } from 'react';
import type { ScriptedDiploAction, TimedActivity } from '../../types/politics';
import {
  generateDiploActionScript,
  generateTimedActivityScript,
} from '../../utils/politicsGenerators';
import {
  Handshake,
  Clock,
  Copy,
  Check,
} from 'lucide-react';

const INITIAL_DIPLO_ACTION: ScriptedDiploAction = {
  id: 'demand_treaty_port_cession',
  name: 'Demand Treaty Port Cession',
  costPP: 50,
  costCP: 20,
  requiresAcceptance: true,
  allowedTrigger: 'is_subject = no\nstrength_ratio = { tag = FROM ratio > 2.0 }',
  visibleTrigger: 'has_war = no\nany_owned_state = { is_coastal = yes }',
  aiAcceptanceFormula: 'base = -20\nmodifier = { factor = 2.0 has_war = yes }',
  onSentEffect: 'FROM = { country_event = treaty_port.1 }',
  completeEffect: 'transfer_state = 120\nadd_threat = 5',
  rejectEffect: 'create_wargoal = { type = annex_everything target = FROM }',
};

const INITIAL_TIMED_ACTIVITY: TimedActivity = {
  id: 'stage_military_coup',
  name: 'Stage Military Coup in Neighbor',
  durationDays: 180,
  equipmentCost: {
    infantry_equipment: 2000,
    support_equipment: 250,
  },
  cancelTrigger: 'has_war_with = FROM',
  onExpireEffect: 'FROM = { start_civil_war = { ideology = fascism size = 0.5 } }',
};

interface DiploActionsStudioProps {
  onNotify?: (msg: string) => void;
}

export const DiploActionsStudio: React.FC<DiploActionsStudioProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'diplo' | 'timed'>('diplo');
  const [diploAction, setDiploAction] = useState<ScriptedDiploAction>(INITIAL_DIPLO_ACTION);
  const [timedActivity, setTimedActivity] = useState<TimedActivity>(INITIAL_TIMED_ACTIVITY);
  const [copied, setCopied] = useState<boolean>(false);

  const diploScript = generateDiploActionScript(diploAction);
  const timedScript = generateTimedActivityScript(timedActivity);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Handshake className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            SCRIPTED DIPLOMATIC ACTIONS & TIMED ACTIVITIES
          </span>
          <span className="text-[#3b4936]">|</span>

          {/* Sub-Tabs */}
          <div className="flex rounded border border-[#3b4936] overflow-hidden">
            <button
              onClick={() => setActiveTab('diplo')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'diplo'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'bg-[#242d23] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <Handshake className="h-3.5 w-3.5" /> Diplomatic Actions
            </button>
            <button
              onClick={() => setActiveTab('timed')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
                activeTab === 'timed'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'bg-[#242d23] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Timed Activities
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            const text = activeTab === 'diplo' ? diploScript : timedScript;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onNotify?.(`Copied ${activeTab === 'diplo' ? 'diplo action' : 'timed activity'} script`);
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

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#101512]">
          {activeTab === 'diplo' ? (
            <>
              {/* Diplo Action Details */}
              <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
                  Action Identity & Costs
                </h3>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Action Identifier
                    </label>
                    <input
                      type="text"
                      value={diploAction.id}
                      onChange={(e) => setDiploAction({ ...diploAction, id: e.target.value })}
                      className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Political Power Cost
                    </label>
                    <input
                      type="number"
                      value={diploAction.costPP}
                      onChange={(e) =>
                        setDiploAction({
                          ...diploAction,
                          costPP: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Command Power Cost
                    </label>
                    <input
                      type="number"
                      value={diploAction.costCP}
                      onChange={(e) =>
                        setDiploAction({
                          ...diploAction,
                          costCP: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-[#e3e5d9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diploAction.requiresAcceptance}
                      onChange={(e) =>
                        setDiploAction({
                          ...diploAction,
                          requiresAcceptance: e.target.checked,
                        })
                      }
                      className="accent-[#d6b878] h-4 w-4 rounded"
                    />
                    <span>Target Nation Must Accept Before Execution</span>
                  </label>
                </div>
              </div>

              {/* Triggers & Acceptance */}
              <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
                  Triggers & AI Acceptance Formula
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Allowed Trigger Block
                    </label>
                    <textarea
                      rows={3}
                      value={diploAction.allowedTrigger}
                      onChange={(e) =>
                        setDiploAction({ ...diploAction, allowedTrigger: e.target.value })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded p-2 text-xs font-mono text-[#a6bd87]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      AI Acceptance Formula (`ai_acceptance`)
                    </label>
                    <textarea
                      rows={3}
                      value={diploAction.aiAcceptanceFormula}
                      onChange={(e) =>
                        setDiploAction({
                          ...diploAction,
                          aiAcceptanceFormula: e.target.value,
                        })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded p-2 text-xs font-mono text-[#a6bd87]"
                    />
                  </div>
                </div>
              </div>

              {/* Execution Effects */}
              <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
                  Execution Hooks & Outcomes
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Complete Effect (Accepted)
                    </label>
                    <textarea
                      rows={3}
                      value={diploAction.completeEffect}
                      onChange={(e) =>
                        setDiploAction({ ...diploAction, completeEffect: e.target.value })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded p-2 text-xs font-mono text-emerald-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Reject Effect (Refused / Counter-action)
                    </label>
                    <textarea
                      rows={3}
                      value={diploAction.rejectEffect}
                      onChange={(e) =>
                        setDiploAction({ ...diploAction, rejectEffect: e.target.value })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded p-2 text-xs font-mono text-red-300"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Timed Activity Editor */}
              <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
                  Timed Activity Parameters
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Activity Identifier
                    </label>
                    <input
                      type="text"
                      value={timedActivity.id}
                      onChange={(e) =>
                        setTimedActivity({ ...timedActivity, id: e.target.value })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={timedActivity.durationDays}
                      onChange={(e) =>
                        setTimedActivity({
                          ...timedActivity,
                          durationDays: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                    On Expiration Effect
                  </label>
                  <textarea
                    rows={3}
                    value={timedActivity.onExpireEffect}
                    onChange={(e) =>
                      setTimedActivity({
                        ...timedActivity,
                        onExpireEffect: e.target.value,
                      })
                    }
                    className="w-full bg-[#121613] border border-[#2c3729] rounded p-2 text-xs font-mono text-emerald-300"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Code Preview */}
        <div className="w-96 border-l border-[#30392e] bg-[#0c100d] flex flex-col overflow-hidden shrink-0">
          <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-[#d6b878]">
              {activeTab === 'diplo'
                ? 'common/scripted_diplomatic_actions/*.txt'
                : 'common/timed_activities/*.txt'}
            </span>
          </div>

          <pre className="flex-1 p-3 font-mono text-[11px] text-[#a6bd87] leading-relaxed overflow-auto">
            {activeTab === 'diplo' ? diploScript : timedScript}
          </pre>
        </div>
      </div>
    </div>
  );
};
