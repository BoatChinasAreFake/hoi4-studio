import React, { useState, useMemo } from 'react';
import type { BopDefinition, BopRange } from '../../types/politics';
import { generateBopScript, getActiveBopModifiers } from '../../utils/politicsGenerators';
import {
  Scale,
  Sliders,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const INITIAL_BOP: BopDefinition = {
  token: 'ITA_balance_of_power',
  initialValue: 0.15,
  leftSide: 'grand_council_side',
  rightSide: 'mussolini_side',
  decisionCategory: 'ITA_bop_category',
  neutralRange: {
    id: 'neutral_range',
    min: -0.2,
    max: 0.2,
    modifiers: {
      stability_factor: 0.05,
      political_power_gain: 0.05,
    },
  },
  sides: [
    {
      id: 'grand_council_side',
      name: 'Grand Council of Fascism',
      icon: 'GFX_bop_ITA_council',
      ranges: [
        {
          id: 'council_dominant',
          min: -1.0,
          max: -0.5,
          modifiers: {
            political_power_gain: 0.25,
            war_support_factor: -0.1,
          },
          onActivate: 'set_country_flag = council_dominant_flag',
        },
        {
          id: 'council_influence',
          min: -0.5,
          max: -0.2,
          modifiers: {
            political_power_gain: 0.1,
          },
        },
      ],
    },
    {
      id: 'mussolini_side',
      name: 'Benito Mussolini',
      icon: 'GFX_bop_ITA_duce',
      ranges: [
        {
          id: 'duce_influence',
          min: 0.2,
          max: 0.5,
          modifiers: {
            war_support_factor: 0.1,
          },
        },
        {
          id: 'duce_dominant',
          min: 0.5,
          max: 1.0,
          modifiers: {
            war_support_factor: 0.25,
            consumer_goods_factor: -0.05,
          },
          onActivate: 'set_country_flag = duce_dominant_flag',
        },
      ],
    },
  ],
};

interface BopStudioProps {
  onNotify?: (msg: string) => void;
}

export const BopStudio: React.FC<BopStudioProps> = ({ onNotify }) => {
  const [bop, setBop] = useState<BopDefinition>(INITIAL_BOP);
  const [testSliderVal, setTestSliderVal] = useState<number>(bop.initialValue);
  const [copied, setCopied] = useState<boolean>(false);

  // Validate range continuity
  const validation = useMemo(() => {
    const allRanges: BopRange[] = [];
    if (bop.neutralRange) allRanges.push(bop.neutralRange);
    for (const s of bop.sides) {
      allRanges.push(...s.ranges);
    }

    const errors: string[] = [];
    for (const r of allRanges) {
      if (r.min >= r.max) {
        errors.push(`Range '${r.id}' has invalid bounds: min (${r.min}) >= max (${r.max})`);
      }
    }

    // Sort by min
    const sorted = [...allRanges].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].max > sorted[i + 1].min) {
        errors.push(
          `Overlapping ranges detected: '${sorted[i].id}' (${sorted[i].min}..${sorted[i].max}) overlaps with '${sorted[i + 1].id}' (${sorted[i + 1].min}..${sorted[i + 1].max})`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }, [bop]);

  const activeStats = getActiveBopModifiers(bop, testSliderVal);
  const clausewitzCode = generateBopScript(bop);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Scale className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            BALANCE OF POWER (BoP) STUDIO (BBA)
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            Two-sided political balance system with dynamic tension ranges and active modifiers
          </span>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(clausewitzCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onNotify?.('Copied BoP script to clipboard');
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
        {/* Left Interactive Canvas & Gauge */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#101512]">
          {/* Dynamic Interactive Gauge */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d6b878] flex items-center gap-1.5">
                <Sliders className="h-4 w-4" /> Live Interactive BoP Slider
              </span>
              <span className="font-mono text-sm font-bold text-cyan-400">
                {testSliderVal > 0 ? `+${testSliderVal.toFixed(2)}` : testSliderVal.toFixed(2)}
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="relative py-4">
              <div className="h-6 w-full rounded bg-[#101411] border border-[#2c3729] overflow-hidden flex relative">
                {/* Left Side Fill */}
                <div className="w-1/2 h-full bg-gradient-to-l from-emerald-950/40 to-emerald-900/80 border-r border-[#30392e] relative" />
                {/* Right Side Fill */}
                <div className="w-1/2 h-full bg-gradient-to-r from-amber-950/40 to-amber-900/80" />

                {/* Marker Pin */}
                <div
                  style={{ left: `${((testSliderVal + 1) / 2) * 100}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] -translate-x-1/2"
                />
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min={-1.0}
                max={1.0}
                step={0.01}
                value={testSliderVal}
                onChange={(e) => setTestSliderVal(parseFloat(e.target.value))}
                className="w-full mt-3 accent-cyan-400 cursor-pointer"
              />

              <div className="flex justify-between text-[11px] font-mono text-[#8a9884] mt-1">
                <span className="flex items-center gap-1">
                  <ChevronLeft className="h-3 w-3" /> {bop.sides[0]?.name || bop.leftSide} (-1.0)
                </span>
                <span>Neutral (0.00)</span>
                <span className="flex items-center gap-1">
                  {bop.sides[1]?.name || bop.rightSide} (+1.0) <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>

            {/* Currently Active Modifier Card */}
            <div className="bg-[#121613] border border-[#2c3729] rounded p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#909b88]">Active Range:</span>
                <span className="font-mono font-bold text-[#d6b878]">
                  {activeStats.activeRangeId || 'None'}
                </span>
              </div>

              <div className="text-xs space-y-1">
                {Object.keys(activeStats.modifiers).length > 0 ? (
                  Object.entries(activeStats.modifiers).map(([k, v]) => (
                    <div key={k} className="flex justify-between font-mono">
                      <span className="text-[#8c9c86]">{k}</span>
                      <span className="text-emerald-400 font-bold">{v}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[#556350] italic">No active modifiers at this position.</span>
                )}
              </div>
            </div>
          </div>

          {/* BoP Definition Settings */}
          <div className="bg-[#171e18] border border-[#2c3729] rounded p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#d6b878] tracking-wider border-b border-[#2c3729] pb-2">
              BoP System Tokens
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  BoP Token Identifier
                </label>
                <input
                  type="text"
                  value={bop.token}
                  onChange={(e) => setBop({ ...bop, token: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Left Side Token
                </label>
                <input
                  type="text"
                  value={bop.leftSide}
                  onChange={(e) => setBop({ ...bop, leftSide: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#909b88] uppercase block mb-1">
                  Right Side Token
                </label>
                <input
                  type="text"
                  value={bop.rightSide}
                  onChange={(e) => setBop({ ...bop, rightSide: e.target.value })}
                  className="w-full bg-[#121613] border border-[#2c3729] rounded px-2.5 py-1 text-xs font-mono text-[#e3e5d9]"
                />
              </div>
            </div>
          </div>

          {/* Validation Status */}
          {!validation.valid && (
            <div className="p-3 bg-red-950/40 border border-red-700/50 rounded text-xs text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-400" /> BoP Range Integrity Violations:
              </div>
              {validation.errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}
        </div>

        {/* Right Code Preview */}
        <div className="w-96 border-l border-[#30392e] bg-[#0c100d] flex flex-col overflow-hidden shrink-0">
          <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-[#d6b878]">common/bop/*.txt</span>
            <span className="text-[10px] text-[#909b88]">Live Clausewitz</span>
          </div>

          <pre className="flex-1 p-3 font-mono text-[11px] text-[#a6bd87] leading-relaxed overflow-auto">
            {clausewitzCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
