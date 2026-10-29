import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { FocusNodeData } from '../../types/focus';
import type {
  SandboxCountryState,
  SimulationTickReport,
  DeadlockAnalysisResult,
} from '../../types/simulation';
import { analyzeFocusTreeDeadlocks } from '../../utils/tarjanDeadlockSolver';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Zap,
  Activity,
  Flame,
  Scale,
  Check,
} from 'lucide-react';

interface SandboxSimulatorProps {
  focuses: FocusNodeData[];
  onNotify?: (msg: string) => void;
}

const INITIAL_COUNTRY_STATE: SandboxCountryState = {
  tag: 'RPL',
  name: 'Republic of Libertalia',
  politicalPower: 150,
  politicalPowerDailyGain: 1.85,
  stability: 0.65,
  warSupport: 0.40,
  commandPower: 35,
  manpower: 1250000,
  civilianFactories: 24,
  militaryFactories: 14,
  dockyards: 6,
  ideologies: {
    democratic: 55,
    neutrality: 25,
    fascism: 12,
    communism: 8,
  },
  rulingParty: 'democratic',
  nationalSpirits: [
    {
      id: 'legacy_of_revolution',
      name: 'Legacy of the Revolution',
      modifiers: 'National Unity: +10%, Political Power: -0.10/day',
    },
    {
      id: 'recovering_industry',
      name: 'Recovering Industry',
      modifiers: 'Consumer Goods Factories: -5%, Factory Output: +5%',
    },
  ],
  activeFocus: null,
  completedFocuses: [],
  countryFlags: {},
  variables: {},
};

export function formatHoi4Date(dayOffset: number): string {
  const start = new Date(1936, 0, 1);
  start.setDate(start.getDate() + dayOffset);
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const day = start.getDate();
  return `${year}.${month}.${day}.12`;
}

export const SandboxSimulator: React.FC<SandboxSimulatorProps> = ({
  focuses,
  onNotify,
}) => {
  const [country, setCountry] = useState<SandboxCountryState>(INITIAL_COUNTRY_STATE);
  const [dayTick, setDayTick] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tickSpeedMs, setTickSpeedMs] = useState<number>(400); // 1 day every 400ms
  const [eventLog, setEventLog] = useState<SimulationTickReport[]>([]);
  const [activeTab, setActiveTab] = useState<'simulation' | 'deadlock'>('simulation');

  // Tarjan Deadlock Analysis
  const deadlockAnalysis: DeadlockAnalysisResult = useMemo(() => {
    return analyzeFocusTreeDeadlocks(focuses);
  }, [focuses]);

  // Check if focus can be selected
  const canStartFocus = useCallback(
    (focus: FocusNodeData): { canStart: boolean; reason?: string } => {
      if (country.completedFocuses.includes(focus.id)) {
        return { canStart: false, reason: 'Already completed' };
      }
      if (country.activeFocus?.id === focus.id) {
        return { canStart: false, reason: 'Currently active' };
      }

      // Check mutual exclusions
      for (const exclId of focus.mutually_exclusive) {
        if (country.completedFocuses.includes(exclId)) {
          return { canStart: false, reason: `Mutually exclusive with completed focus '${exclId}'` };
        }
      }

      // Check prerequisites (OR groups of AND prerequisites)
      if (focus.prerequisites.length > 0) {
        let hasSatisfiedGroup = false;
        for (const group of focus.prerequisites) {
          const groupSatisfied = group.every((pid) => country.completedFocuses.includes(pid));
          if (groupSatisfied) {
            hasSatisfiedGroup = true;
            break;
          }
        }
        if (!hasSatisfiedGroup) {
          return { canStart: false, reason: 'Prerequisites not met' };
        }
      }

      return { canStart: true };
    },
    [country.completedFocuses, country.activeFocus]
  );

  // Single Day Step Logic
  const stepOneDay = useCallback(() => {
    setDayTick((prevDay) => {
      const nextDay = prevDay + 1;
      const nextDate = formatHoi4Date(nextDay);
      const events: string[] = [];

      setCountry((c) => {
        let updatedPP = c.politicalPower + c.politicalPowerDailyGain;
        let updatedStability = c.stability;
        let updatedWarSupport = c.warSupport;
        let updatedFocus = c.activeFocus;
        let updatedCompleted = [...c.completedFocuses];
        let completedFocusId: string | undefined = undefined;

        if (updatedFocus) {
          const remaining = updatedFocus.daysRemaining - 1;
          if (remaining <= 0) {
            // Focus completed
            completedFocusId = updatedFocus.id;
            updatedCompleted.push(updatedFocus.id);
            events.push(`Completed National Focus: ${updatedFocus.id}`);

            // Apply reward heuristics
            const fData = focuses.find((f) => f.id === updatedFocus!.id);
            if (fData && fData.reward) {
              if (fData.reward.includes('add_political_power')) {
                const match = fData.reward.match(/add_political_power\s*=\s*(\d+)/);
                if (match) updatedPP += parseInt(match[1], 10);
              }
              if (fData.reward.includes('add_stability')) {
                const match = fData.reward.match(/add_stability\s*=\s*([0-9.]+)/);
                if (match) updatedStability = Math.min(1.0, updatedStability + parseFloat(match[1]));
              }
              if (fData.reward.includes('add_war_support')) {
                const match = fData.reward.match(/add_war_support\s*=\s*([0-9.]+)/);
                if (match) updatedWarSupport = Math.min(1.0, updatedWarSupport + parseFloat(match[1]));
              }
            }

            updatedFocus = null;
          } else {
            updatedFocus = { ...updatedFocus, daysRemaining: remaining };
          }
        }

        if (events.length > 0) {
          setEventLog((log) => [
            { day: nextDay, date: nextDate, events, focusCompleted: completedFocusId },
            ...log.slice(0, 49),
          ]);
        }

        return {
          ...c,
          politicalPower: updatedPP,
          stability: updatedStability,
          warSupport: updatedWarSupport,
          activeFocus: updatedFocus,
          completedFocuses: updatedCompleted,
        };
      });

      return nextDay;
    });
  }, [focuses]);

  // Tick interval loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        stepOneDay();
      }, tickSpeedMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, tickSpeedMs, stepOneDay]);

  const handleStartFocus = (focus: FocusNodeData) => {
    const totalDays = focus.cost * 7;
    setCountry((prev) => ({
      ...prev,
      activeFocus: {
        id: focus.id,
        daysRemaining: totalDays,
        totalDays: totalDays,
      },
    }));
    onNotify?.(`Started researching focus '${focus.name}' (${totalDays} days)`);
  };

  const handleInstantComplete = (focus: FocusNodeData) => {
    setCountry((prev) => ({
      ...prev,
      completedFocuses: Array.from(new Set([...prev.completedFocuses, focus.id])),
      activeFocus: prev.activeFocus?.id === focus.id ? null : prev.activeFocus,
      politicalPower: prev.politicalPower + 100,
    }));
    setEventLog((log) => [
      {
        day: dayTick,
        date: formatHoi4Date(dayTick),
        events: [`Insta-completed focus: ${focus.name} (${focus.id})`],
        focusCompleted: focus.id,
      },
      ...log,
    ]);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setDayTick(0);
    setCountry(INITIAL_COUNTRY_STATE);
    setEventLog([]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      {/* Top Header & Simulation Controls */}
      <header className="flex h-14 items-center justify-between border-b border-[#30392e] bg-[#161d17] px-6 select-none shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-bold text-sm tracking-wide flex items-center gap-2 text-[#e3e5d9]">
            <Activity className="h-4 w-4 text-[#a6bd87]" />
            Game Logic Simulator Sandbox
          </span>
          <span className="text-[#3b4936]">|</span>
          <div className="flex items-center gap-2 text-xs bg-[#111712] px-3 py-1 rounded border border-[#30392e]">
            <Calendar className="h-3.5 w-3.5 text-[#d6b878]" />
            <span className="font-mono font-bold text-[#d6b878]">
              {formatHoi4Date(dayTick)}
            </span>
            <span className="text-[10px] text-[#909b88]">(Day {dayTick})</span>
          </div>
        </div>

        {/* Play / Step / Speed Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition shadow ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-[#a6bd87] text-black hover:bg-[#b8d197]'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={stepOneDay}
            disabled={isPlaying}
            title="Step 1 Day"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs text-[#e3e5d9] hover:bg-[#354130] disabled:opacity-40"
          >
            <StepForward className="h-3.5 w-3.5" />
            Step Day
          </button>

          {/* Speed Selector */}
          <div className="flex rounded border border-[#30392e] bg-[#111712] overflow-hidden text-xs">
            {[
              { label: '1x', ms: 500 },
              { label: '2x', ms: 250 },
              { label: '5x', ms: 80 },
            ].map(({ label, ms }) => (
              <button
                key={label}
                onClick={() => setTickSpeedMs(ms)}
                className={`px-2 py-1 transition ${
                  tickSpeedMs === ms
                    ? 'bg-[#d6b878] text-black font-bold'
                    : 'text-[#909b88] hover:text-[#e3e5d9]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            title="Reset Simulation to 1936.1.1"
            className="p-1.5 rounded bg-[#242d23] border border-[#3b4936] text-[#bd785c] hover:bg-[#354130]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex rounded bg-[#111712] p-1 border border-[#30392e] text-xs">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1 rounded font-semibold transition ${
              activeTab === 'simulation'
                ? 'bg-[#354130] text-[#d6b878]'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            Country Sandbox
          </button>
          <button
            onClick={() => setActiveTab('deadlock')}
            className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'deadlock'
                ? 'bg-[#354130] text-[#d6b878]'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 text-[#d6b878]" />
            Tarjan Deadlock Solver
          </button>
        </div>
      </header>

      {/* Main Sandbox Body */}
      {activeTab === 'simulation' ? (
        <div className="flex-1 grid grid-cols-3 gap-4 p-6 overflow-hidden">
          {/* Column 1: Country Dashboard & Politics */}
          <div className="flex flex-col gap-4 overflow-y-auto">
            {/* National Topbar Stats */}
            <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-3">
              <div className="flex items-center justify-between border-b border-[#30392e] pb-2">
                <div>
                  <span className="font-bold text-base text-[#e3e5d9]">{country.name}</span>
                  <span className="text-xs text-[#d6b878] ml-2">[{country.tag}]</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#242d23] text-[#a6bd87]">
                  {country.rulingParty.toUpperCase()}
                </span>
              </div>

              {/* Stat Meters */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#909b88] flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#d6b878]" />
                      Political Power:
                    </span>
                    <span className="font-bold text-[#d6b878]">
                      {country.politicalPower.toFixed(1)} (+{country.politicalPowerDailyGain}/d)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#111712] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#d6b878]"
                      style={{ width: `${Math.min(100, (country.politicalPower / 500) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#909b88] flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-sky-400" />
                      Stability:
                    </span>
                    <span className="font-bold text-sky-400">
                      {(country.stability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#111712] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${country.stability * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#909b88] flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-[#bd785c]" />
                      War Support:
                    </span>
                    <span className="font-bold text-[#bd785c]">
                      {(country.warSupport * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#111712] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#bd785c]"
                      style={{ width: `${country.warSupport * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Ideology Distribution */}
              <div className="pt-2 border-t border-[#30392e] space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#909b88] tracking-wider block">
                  Ideology Popularity
                </span>
                <div className="h-2 w-full flex rounded-full overflow-hidden">
                  <div style={{ width: `${country.ideologies.democratic}%`, backgroundColor: '#345275' }} />
                  <div style={{ width: `${country.ideologies.neutrality}%`, backgroundColor: '#717c6a' }} />
                  <div style={{ width: `${country.ideologies.fascism}%`, backgroundColor: '#823737' }} />
                  <div style={{ width: `${country.ideologies.communism}%`, backgroundColor: '#a82c2c' }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-[#909b88]">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#345275]" />
                    Democratic: {country.ideologies.democratic}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#717c6a]" />
                    Neutrality: {country.ideologies.neutrality}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#823737]" />
                    Fascism: {country.ideologies.fascism}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#a82c2c]" />
                    Communism: {country.ideologies.communism}%
                  </span>
                </div>
              </div>
            </div>

            {/* National Spirits */}
            <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-2">
              <span className="text-xs uppercase font-bold text-[#909b88] tracking-wider block">
                Active National Spirits
              </span>
              <div className="space-y-1.5">
                {country.nationalSpirits.map((spirit) => (
                  <div
                    key={spirit.id}
                    className="p-2 rounded bg-[#111712] border border-[#2b3628] text-xs"
                  >
                    <span className="font-semibold text-[#e3e5d9]">{spirit.name}</span>
                    <p className="text-[10px] text-[#85917d]">{spirit.modifiers}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Active Focus Research & Focus Queue */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Active Focus In-Progress Card */}
            <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-3 shrink-0">
              <span className="text-xs uppercase font-bold text-[#909b88] tracking-wider block">
                National Focus In Progress
              </span>

              {country.activeFocus ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#d6b878]">
                      {focuses.find((f) => f.id === country.activeFocus?.id)?.name ||
                        country.activeFocus.id}
                    </span>
                    <span className="text-xs font-mono text-[#a6bd87]">
                      {country.activeFocus.daysRemaining} days left
                    </span>
                  </div>

                  <div className="h-2 w-full bg-[#111712] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#d6b878] transition-all duration-200"
                      style={{
                        width: `${
                          ((country.activeFocus.totalDays - country.activeFocus.daysRemaining) /
                            country.activeFocus.totalDays) *
                          100
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        const cur = focuses.find((f) => f.id === country.activeFocus?.id);
                        if (cur) handleInstantComplete(cur);
                      }}
                      className="px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-[11px] text-[#d6b878] hover:bg-[#354130]"
                    >
                      Insta-Complete
                    </button>
                    <button
                      onClick={() => setCountry((c) => ({ ...c, activeFocus: null }))}
                      className="px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-[11px] text-[#bd785c] hover:bg-[#354130]"
                    >
                      Cancel Focus
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center rounded border border-dashed border-[#30392e] text-xs text-[#909b88]">
                  No national focus currently active. Select a valid focus below to begin research.
                </div>
              )}
            </div>

            {/* Selectable Focus Tree List */}
            <div className="flex-1 flex flex-col p-4 rounded-lg bg-[#161d17] border border-[#30392e] overflow-hidden">
              <span className="text-xs uppercase font-bold text-[#909b88] tracking-wider mb-2 flex items-center justify-between">
                <span>Available National Focuses ({focuses.length})</span>
                <span className="text-[10px] text-[#a6bd87]">
                  {country.completedFocuses.length} Completed
                </span>
              </span>

              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                {focuses.map((f) => {
                  const status = canStartFocus(f);
                  const isCompleted = country.completedFocuses.includes(f.id);
                  const isActive = country.activeFocus?.id === f.id;

                  return (
                    <div
                      key={f.id}
                      className={`p-2.5 rounded border text-xs flex items-center justify-between transition ${
                        isCompleted
                          ? 'border-emerald-900/60 bg-emerald-950/20 text-[#a6bd87]'
                          : isActive
                          ? 'border-[#d6b878] bg-[#222c1f]'
                          : status.canStart
                          ? 'border-[#30392e] bg-[#111712] hover:border-[#4b5944]'
                          : 'border-[#222820] bg-[#0e120f] opacity-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isCompleted && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                          <span className="font-semibold text-[#e3e5d9]">{f.name}</span>
                        </div>
                        <div className="text-[10px] text-[#909b88]">
                          Cost: {f.cost * 7} days · ID: {f.id}
                        </div>
                        {!status.canStart && !isCompleted && !isActive && (
                          <span className="text-[9px] text-[#bd785c]">
                            Locked: {status.reason}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {status.canStart && (
                          <button
                            onClick={() => handleStartFocus(f)}
                            disabled={Boolean(country.activeFocus)}
                            className="px-2 py-1 rounded bg-[#d6b878] text-[10px] font-bold text-black hover:bg-[#e0c587] disabled:opacity-30"
                          >
                            Start
                          </button>
                        )}
                        {!isCompleted && (
                          <button
                            onClick={() => handleInstantComplete(f)}
                            title="Instant complete for testing"
                            className="p-1 rounded bg-[#242d23] border border-[#3b4936] text-[10px] text-[#a6bd87] hover:bg-[#354130]"
                          >
                            ⚡
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 3: Simulation Tick Ledger & Event Log */}
          <div className="flex flex-col p-4 rounded-lg bg-[#161d17] border border-[#30392e] overflow-hidden">
            <span className="text-xs uppercase font-bold text-[#909b88] tracking-wider mb-2 flex items-center justify-between">
              <span>Simulation Event Log</span>
              <span className="text-[10px] text-[#717c6a]">{eventLog.length} events</span>
            </span>

            {eventLog.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#909b88] text-center">
                <span>Click "Play" or "Step Day" to start recording simulation day ticks.</span>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {eventLog.map((log, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-[#111712] border border-[#2b3528] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#909b88]">
                      <span className="font-mono text-[#d6b878]">{log.date}</span>
                      <span>Day {log.day}</span>
                    </div>
                    {log.events.map((ev, j) => (
                      <p key={j} className="text-[#a6bd87] font-medium text-[11px]">
                        • {ev}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tarjan SCC Deadlock Solver View */
        <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
          <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-2">
            <h3 className="font-bold text-sm text-[#e3e5d9] flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-[#d6b878]" />
              Tarjan's Strongly Connected Components (SCC) Cycle & Reachability Analyzer
            </h3>
            <p className="text-xs text-[#909b88] leading-relaxed">
              Analyzes directed prerequisite dependencies and mutual exclusion relationships.
              Detects infinite prerequisite dependency loops (A → B → A), unachievable mutual exclusion
              deadlocks, and unreachable orphaned nodes.
            </p>
          </div>

          {/* Diagnostics Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-1">
              <span className="text-xs text-[#909b88] block">Dependency Cycles (SCC)</span>
              <span
                className={`text-xl font-black ${
                  deadlockAnalysis.hasCycles ? 'text-[#bd785c]' : 'text-[#a6bd87]'
                }`}
              >
                {deadlockAnalysis.cycles.length} Found
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-1">
              <span className="text-xs text-[#909b88] block">Mutual Exclusion Deadlocks</span>
              <span
                className={`text-xl font-black ${
                  deadlockAnalysis.hasMutualExclusionDeadlocks
                    ? 'text-[#bd785c]'
                    : 'text-[#a6bd87]'
                }`}
              >
                {deadlockAnalysis.mutualExclusions.length} Found
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-1">
              <span className="text-xs text-[#909b88] block">Independent Roots</span>
              <span className="text-xl font-black text-[#d6b878]">
                {deadlockAnalysis.independentRoots.length} Roots
              </span>
            </div>
          </div>

          {/* Cycles Findings */}
          <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-2 text-xs">
            <span className="font-bold text-[#e3e5d9] block">
              Prerequisite Cycle Analysis
            </span>
            {deadlockAnalysis.cycles.length === 0 ? (
              <div className="flex items-center gap-2 text-[#a6bd87] p-2 rounded bg-[#111712]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero circular dependency cycles detected (Tree is a valid DAG).</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {deadlockAnalysis.cycles.map((cycle, i) => (
                  <div key={i} className="p-2.5 rounded bg-red-950/30 border border-red-800 text-red-300">
                    <span className="font-bold block">Cycle #{i + 1}:</span>
                    <span>{cycle.join(' → ')} → {cycle[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mutual Exclusion Findings */}
          <div className="p-4 rounded-lg bg-[#161d17] border border-[#30392e] space-y-2 text-xs">
            <span className="font-bold text-[#e3e5d9] block">
              Mutual Exclusion Deadlock Analysis
            </span>
            {deadlockAnalysis.mutualExclusions.length === 0 ? (
              <div className="flex items-center gap-2 text-[#a6bd87] p-2 rounded bg-[#111712]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero mutual exclusion prerequisite deadlocks detected.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {deadlockAnalysis.mutualExclusions.map((me, i) => (
                  <div key={i} className="p-2.5 rounded bg-amber-950/30 border border-amber-800 text-amber-300">
                    <span className="font-bold block">
                      Conflict: {me.focusA} ⇄ {me.focusB}
                    </span>
                    <span className="text-[11px] text-[#e3e5d9]">{me.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
