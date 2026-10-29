import React, { useState, useMemo } from 'react';
import type { MinigameType, GuiElementDef } from '../../types/ui';
import {
  Landmark,
  Scale,
  PieChart as PieIcon,
  Grid,
  Copy,
  Sparkles,
  Code2,
} from 'lucide-react';

interface MinigameTemplatesProps {
  onNotify?: (msg: string) => void;
  onInjectTemplate?: (elements: GuiElementDef[]) => void;
}

export const MinigameTemplates: React.FC<MinigameTemplatesProps> = ({
  onNotify,
  onInjectTemplate,
}) => {
  const [activeMinigame, setActiveMinigame] = useState<MinigameType>('parliament');

  // Parliament State (Seats breakdown: 100 total)
  const [democraticSeats, setDemocraticSeats] = useState(45);
  const [fascistSeats, setFascistSeats] = useState(25);
  const [communistSeats, setCommunistSeats] = useState(20);
  const [neutralSeats, setNeutralSeats] = useState(10);

  // Regional Influence Grid (3 regions)
  const [regionInfluence] = useState({
    north: { democratic: 60, fascist: 25, communist: 15 },
    central: { democratic: 40, fascist: 35, communist: 25 },
    south: { democratic: 25, fascist: 55, communist: 20 },
  });

  // Balance of Power tension value (-1.0 to +1.0)
  const [bopValue, setBopValue] = useState(0.25);

  // Parliament Semicircle dots generator
  const parliamentDots = useMemo(() => {
    const total = democraticSeats + fascistSeats + communistSeats + neutralSeats;
    const dots: Array<{ x: number; y: number; party: string; color: string }> = [];

    const parties = [
      { name: 'democratic', count: democraticSeats, color: '#3b82f6' },
      { name: 'communist', count: communistSeats, color: '#ef4444' },
      { name: 'neutrality', count: neutralSeats, color: '#9ca3af' },
      { name: 'fascism', count: fascistSeats, color: '#92400e' },
    ];

    let partyIdx = 0;
    let placedInParty = 0;

    const rows = 4;
    const dotsPerRow = Math.ceil(total / rows);

    for (let r = 0; r < rows; r++) {
      const radius = 120 + r * 28;
      const countThisRow = Math.min(dotsPerRow, total - dots.length);
      const angleStep = Math.PI / (countThisRow + 1);

      for (let i = 1; i <= countThisRow; i++) {
        if (dots.length >= total) break;

        while (partyIdx < parties.length && placedInParty >= parties[partyIdx].count) {
          partyIdx++;
          placedInParty = 0;
        }

        const party = parties[partyIdx] || parties[0];
        placedInParty++;

        const angle = Math.PI - i * angleStep;
        const x = 200 + radius * Math.cos(angle);
        const y = 200 - radius * Math.sin(angle);

        dots.push({ x, y, party: party.name, color: party.color });
      }
    }

    return dots;
  }, [democraticSeats, fascistSeats, communistSeats, neutralSeats]);

  // Generate Clausewitz .gui script for Parliament
  const generatedParliamentGui = useMemo(() => {
    return `# PARADOX .GUI DEFINITION: Bicameral Parliament
containerWindowType = {
\tname = "parliament_gui_container"
\tposition = { x = 0 y = 0 }
\tsize = { width = 500 height = 350 }
\torientation = center
\torigo = center

\ticonType = {
\t\tname = "parliament_background"
\t\tspriteType = "GFX_tiled_window_thin_border"
\t\tposition = { x = 0 y = 0 }
\t}

\tinstantTextBoxType = {
\t\tname = "parliament_title"
\t\tposition = { x = 20 y = 15 }
\t\tfont = "hoi_24header"
\t\ttext = "NATIONAL_PARLIAMENT_TITLE"
\t\tmaxWidth = 460
\t\tmaxHeight = 30
\t\tformat = center
\t}

\t# Grid container for parliamentary seats array
\tgridBoxType = {
\t\tname = "parliament_member_grid"
\t\tposition = { x = 40 y = 60 }
\t\tsize = { width = 420 height = 240 }
\t\tslotsize = { width = 16 height = 16 }
\t\tmax_slots_horizontal = 25
\t}
}`;
  }, []);

  // Generate Clausewitz script for Balance of Power
  const generatedBopGui = useMemo(() => {
    return `# PARADOX .GUI DEFINITION: Balance of Power Tension Meter
containerWindowType = {
\tname = "bop_meter_container"
\tposition = { x = 0 y = 0 }
\tsize = { width = 400 height = 220 }

\ticonType = {
\t\tname = "bop_dial_bar"
\t\tspriteType = "GFX_bop_bar_frame"
\t\tposition = { x = 50 y = 80 }
\t}

\ticonType = {
\t\tname = "bop_needle"
\t\tspriteType = "GFX_bop_needle"
\t\tposition = { x = ${Math.round(200 + bopValue * 120)} y = 70 }
\t}

\tinstantTextBoxType = {
\t\tname = "bop_left_label"
\t\tposition = { x = 40 y = 130 }
\t\tfont = "hoi_16mbs"
\t\ttext = "LEFT_FACTION_NAME"
\t\tmaxWidth = 120
\t}

\tinstantTextBoxType = {
\t\tname = "bop_right_label"
\t\tposition = { x = 240 y = 130 }
\t\tfont = "hoi_16mbs"
\t\ttext = "RIGHT_FACTION_NAME"
\t\tmaxWidth = 120
\t\tformat = right
\t}
}`;
  }, [bopValue]);

  // Convert template into GuiElementDef nodes for insertion into GUI Designer
  const handleInsertIntoBuilder = () => {
    if (activeMinigame === 'parliament') {
      const elements: GuiElementDef[] = [
        {
          id: 'parliament_bg',
          type: 'containerWindowType',
          name: 'parliament_container',
          position: { x: 50, y: 50 },
          size: { width: 440, height: 300 },
          children: [
            {
              id: 'parliament_header',
              type: 'instantTextBoxType',
              name: 'parliament_title',
              position: { x: 20, y: 15 },
              size: { width: 400, height: 30 },
              font: 'hoi_24header',
              text: 'NATIONAL PARLIAMENT',
              format: 'center',
            },
            {
              id: 'parliament_seating_icon',
              type: 'iconType',
              name: 'parliament_semicircle',
              position: { x: 40, y: 60 },
              size: { width: 360, height: 200 },
              spriteType: 'GFX_parliament_semicircle',
            },
          ],
        },
      ];
      onInjectTemplate?.(elements);
      onNotify?.('Injected Parliament Minigame into GUI Designer!');
    } else if (activeMinigame === 'balance_of_power') {
      const elements: GuiElementDef[] = [
        {
          id: 'bop_container',
          type: 'containerWindowType',
          name: 'bop_window',
          position: { x: 60, y: 60 },
          size: { width: 380, height: 180 },
          children: [
            {
              id: 'bop_bar',
              type: 'iconType',
              name: 'bop_dial_bar',
              position: { x: 40, y: 60 },
              size: { width: 300, height: 24 },
              spriteType: 'GFX_bop_bar_frame',
            },
            {
              id: 'bop_pointer',
              type: 'iconType',
              name: 'bop_needle',
              position: { x: 190, y: 52 },
              size: { width: 16, height: 40 },
              spriteType: 'GFX_bop_needle',
            },
          ],
        },
      ];
      onInjectTemplate?.(elements);
      onNotify?.('Injected Balance of Power Meter into GUI Designer!');
    } else {
      onNotify?.('Template ready in code generator.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="border-b border-[#30392e] bg-[#141a15] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#1e271c] border border-[#3b4936]">
            <Landmark className="h-5 w-5 text-[#d6b878]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#e3e5d9] flex items-center gap-2">
              Pre-Built Interactive Minigame Templates
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20281e] text-[#d6b878] font-mono border border-[#3b4936]">
                Scripted GUI Engine
              </span>
            </h2>
            <p className="text-xs text-[#909b88]">
              Ready-to-use parliaments, regional influence grids, balance of power dials, and radicalization charts.
            </p>
          </div>
        </div>

        <button
          onClick={handleInsertIntoBuilder}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold bg-[#d6b878] text-[#1c2119] hover:bg-[#e0c587] transition shadow"
        >
          <Sparkles className="h-4 w-4" /> Insert into .gui Builder
        </button>
      </div>

      {/* Minigame Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#141a15]/80 border-b border-[#30392e] text-xs">
        <button
          onClick={() => setActiveMinigame('parliament')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition ${
            activeMinigame === 'parliament'
              ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
              : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
          }`}
        >
          <Landmark className="h-4 w-4" /> Bicameral Parliament
        </button>

        <button
          onClick={() => setActiveMinigame('balance_of_power')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition ${
            activeMinigame === 'balance_of_power'
              ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
              : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
          }`}
        >
          <Scale className="h-4 w-4" /> Balance of Power Gauge
        </button>

        <button
          onClick={() => setActiveMinigame('regional_grid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition ${
            activeMinigame === 'regional_grid'
              ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
              : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
          }`}
        >
          <Grid className="h-4 w-4" /> Regional Influence 2D Grid
        </button>

        <button
          onClick={() => setActiveMinigame('pie_chart')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition ${
            activeMinigame === 'pie_chart'
              ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
              : 'text-[#909b88] hover:text-[#e3e5d9] hover:bg-[#1e271c]'
          }`}
        >
          <PieIcon className="h-4 w-4" /> Radicalization Radial Chart
        </button>
      </div>

      {/* Main Content View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-x divide-[#30392e] overflow-hidden">
        {/* Left: Interactive Visual Simulation */}
        <div className="p-6 flex flex-col items-center justify-center overflow-y-auto bg-[#121713]">
          {activeMinigame === 'parliament' && (
            <div className="w-full max-w-md flex flex-col items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d6b878]">
                Semicircular Chamber Simulation (100 Seats)
              </span>

              {/* Semicircle SVG */}
              <div className="relative w-[400px] h-[220px] bg-[#141a15] rounded-xl border border-[#30392e] p-2 flex items-center justify-center shadow-inner">
                <svg viewBox="0 0 400 220" className="w-full h-full">
                  {/* Speaker Podium */}
                  <rect x="185" y="195" width="30" height="15" fill="#526044" rx="2" />
                  {/* Seat Dots */}
                  {parliamentDots.map((dot, idx) => (
                    <circle
                      key={idx}
                      cx={dot.x}
                      cy={dot.y}
                      r="4.5"
                      fill={dot.color}
                      stroke="#101512"
                      strokeWidth="1"
                    />
                  ))}
                </svg>
              </div>

              {/* Party Seat Breakdown Sliders */}
              <div className="w-full grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-[#181e19] border border-[#30392e] flex flex-col gap-1">
                  <div className="flex justify-between font-semibold text-blue-400">
                    <span>Democratic</span>
                    <span>{democraticSeats} Seats</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={democraticSeats}
                    onChange={(e) => setDemocraticSeats(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="p-2 rounded bg-[#181e19] border border-[#30392e] flex flex-col gap-1">
                  <div className="flex justify-between font-semibold text-amber-600">
                    <span>Fascist</span>
                    <span>{fascistSeats} Seats</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fascistSeats}
                    onChange={(e) => setFascistSeats(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div className="p-2 rounded bg-[#181e19] border border-[#30392e] flex flex-col gap-1">
                  <div className="flex justify-between font-semibold text-red-500">
                    <span>Communist</span>
                    <span>{communistSeats} Seats</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={communistSeats}
                    onChange={(e) => setCommunistSeats(parseInt(e.target.value, 10))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>

                <div className="p-2 rounded bg-[#181e19] border border-[#30392e] flex flex-col gap-1">
                  <div className="flex justify-between font-semibold text-gray-400">
                    <span>Neutrality</span>
                    <span>{neutralSeats} Seats</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={neutralSeats}
                    onChange={(e) => setNeutralSeats(parseInt(e.target.value, 10))}
                    className="w-full accent-gray-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeMinigame === 'balance_of_power' && (
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d6b878]">
                BBA Tension Slider Simulation
              </span>

              {/* Gauge Meter Graphic */}
              <div className="w-full bg-[#181e19] rounded-xl border border-[#30392e] p-6 flex flex-col gap-4 shadow-inner">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-amber-400">Left Faction Dominant</span>
                  <span className="font-mono text-[#e3e5d9]">{bopValue.toFixed(2)}</span>
                  <span className="text-sky-400">Right Faction Dominant</span>
                </div>

                {/* Track */}
                <div className="relative h-6 bg-[#101411] rounded-full border border-[#3b4936] flex items-center px-1">
                  <div
                    className="absolute top-0 bottom-0 rounded-full transition-all duration-150"
                    style={{
                      left: bopValue < 0 ? `${50 + bopValue * 50}%` : '50%',
                      right: bopValue > 0 ? `${50 - bopValue * 50}%` : '50%',
                      backgroundColor: bopValue < 0 ? '#f59e0b' : '#38bdf8',
                    }}
                  />
                  {/* Center Marker */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 -translate-x-1/2" />
                  {/* Needle */}
                  <div
                    className="absolute w-4 h-8 bg-white border border-black rounded-sm shadow-md transition-all duration-75 -translate-x-1/2"
                    style={{ left: `${50 + bopValue * 50}%` }}
                  />
                </div>

                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.01"
                  value={bopValue}
                  onChange={(e) => setBopValue(parseFloat(e.target.value))}
                  className="w-full accent-[#d6b878] cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeMinigame === 'regional_grid' && (
            <div className="w-full max-w-md flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d6b878] text-center">
                Regional Tug-of-War Influence Matrix
              </span>

              {Object.entries(regionInfluence).map(([region, vals]) => (
                <div key={region} className="p-3 bg-[#181e19] rounded border border-[#30392e] flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold capitalize">
                    <span>{region} Military Sector</span>
                    <span className="text-[#a6bd87] font-mono">
                      Dem {vals.democratic}% · Fas {vals.fascist}%
                    </span>
                  </div>
                  {/* Multi-segment progress bar */}
                  <div className="h-4 w-full bg-[#101411] rounded overflow-hidden flex border border-[#273224]">
                    <div style={{ width: `${vals.democratic}%` }} className="bg-blue-600" />
                    <div style={{ width: `${vals.fascist}%` }} className="bg-amber-600" />
                    <div style={{ width: `${vals.communist}%` }} className="bg-red-600" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeMinigame === 'pie_chart' && (
            <div className="w-full max-w-md flex flex-col items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d6b878]">
                Radial Ideological Breakdown
              </span>

              {/* Radial Pie Graphic */}
              <div className="relative w-48 h-48 rounded-full border-4 border-[#30392e] overflow-hidden flex items-center justify-center bg-[#181e19]">
                <div className="absolute inset-0 bg-conic-gradient from-blue-600 via-amber-600 to-red-600 opacity-90" />
                <div className="w-24 h-24 rounded-full bg-[#101512] flex items-center justify-center z-10 font-bold text-xs text-[#d6b878]">
                  Stability 65%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Code Generator Output */}
        <div className="flex flex-col h-full bg-[#101411] overflow-hidden">
          <div className="p-3 border-b border-[#30392e] bg-[#141a15] flex items-center justify-between text-xs">
            <span className="font-bold text-[#d6b878] flex items-center gap-1.5">
              <Code2 className="h-4 w-4" /> Scripted .gui Syntax Scaffold
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  activeMinigame === 'parliament' ? generatedParliamentGui : generatedBopGui
                );
                onNotify?.('Copied .gui script to clipboard');
              }}
              className="text-[10px] text-[#909b88] hover:text-[#e3e5d9] flex items-center gap-1 font-mono"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Code
            </button>
          </div>

          <pre className="p-4 flex-1 overflow-auto font-mono text-xs text-[#a6bd87] leading-relaxed">
            {activeMinigame === 'parliament' ? generatedParliamentGui : generatedBopGui}
          </pre>
        </div>
      </div>
    </div>
  );
};
