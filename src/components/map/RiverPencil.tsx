import React, { useState } from 'react';
import type { Province, RiverPath } from '../../types/map';
import {
  rasterizeRiverPolyline,
} from '../../utils/riverRasterizer';
import {
  PenTool,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  Waves,
} from 'lucide-react';

interface RiverPencilProps {
  provinces: Province[];
  rivers: RiverPath[];
  onSaveRiver: (newRiver: RiverPath) => void;
  onDeleteRiver: (id: string) => void;
  activeRiverPoints: [number, number][];
  onUpdateActiveRiverPoints: (points: [number, number][]) => void;
  isDrawingRiver: boolean;
  onSetIsDrawingRiver: (drawing: boolean) => void;
}

export const RiverPencil: React.FC<RiverPencilProps> = ({
  provinces,
  rivers,
  onSaveRiver,
  onDeleteRiver,
  activeRiverPoints,
  onUpdateActiveRiverPoints,
  isDrawingRiver,
  onSetIsDrawingRiver,
}) => {
  const [riverName, setRiverName] = useState('New River Branch');
  const [riverLevel, setRiverLevel] = useState<1 | 2 | 3 | 4>(2);
  const [selectedRiverId, setSelectedRiverId] = useState<string | null>(null);

  // Compute live 1px rasterization of current points
  const rasterResult = React.useMemo(() => {
    return rasterizeRiverPolyline(activeRiverPoints, riverLevel);
  }, [activeRiverPoints, riverLevel]);

  // Snapping logic: find nearest sea province for mouth
  const handleSnapEndpoints = () => {
    if (activeRiverPoints.length < 2) return;

    const points = [...activeRiverPoints];
    const mouth = points[points.length - 1];

    // Find closest coastal or sea province center
    let closestDist = Infinity;
    let closestTarget: [number, number] | null = null;

    for (const p of provinces) {
      if (p.type === 'sea' || p.coastal) {
        const dx = p.center[0] - mouth[0];
        const dy = p.center[1] - mouth[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestTarget = p.center;
        }
      }
    }

    if (closestTarget) {
      points[points.length - 1] = [closestTarget[0], closestTarget[1]];
      onUpdateActiveRiverPoints(points);
    }
  };

  const handleCommitRiver = () => {
    if (activeRiverPoints.length < 2) return;

    const newRiver: RiverPath = {
      id: `river_${Date.now()}`,
      name: riverName,
      level: riverLevel,
      points: activeRiverPoints,
      pixels: rasterResult.pixels,
      valid1px: rasterResult.valid1px,
      violations: rasterResult.violations,
    };

    onSaveRiver(newRiver);
    onUpdateActiveRiverPoints([]);
    onSetIsDrawingRiver(false);
  };

  const handleSelectRiverToInspect = (r: RiverPath) => {
    setSelectedRiverId(r.id);
    onUpdateActiveRiverPoints(r.points);
    setRiverLevel(r.level);
    setRiverName(r.name);
  };

  return (
    <div className="flex flex-col h-full bg-[#141a15] text-[#e3e5d9] border-r border-[#30392e] w-80 p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#30392e]">
        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
          <Waves className="h-4 w-4 text-sky-400" />
          1px Vector River Pencil
        </span>
        <button
          onClick={() => {
            onSetIsDrawingRiver(!isDrawingRiver);
            if (!isDrawingRiver) {
              onUpdateActiveRiverPoints([]);
            }
          }}
          className={`px-2.5 py-1 rounded text-xs font-bold transition ${
            isDrawingRiver
              ? 'bg-sky-500 text-black shadow'
              : 'bg-[#242d23] border border-[#3b4936] text-[#e3e5d9] hover:bg-[#354130]'
          }`}
        >
          {isDrawingRiver ? 'Stop Drawing' : 'Draw River'}
        </button>
      </div>

      {/* Mode Instructions */}
      <div className="mt-3 p-2.5 rounded bg-[#1a211a] border border-[#30392e] text-xs space-y-1">
        <span className="font-semibold text-sky-400 flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5" />
          {isDrawingRiver ? 'Click on map canvas to add river vertices' : 'Pencil Idle'}
        </span>
        <p className="text-[11px] text-[#909b88]">
          Strict 1px rasterizer prevents Paradox engine CTDs. Green source (0, 255, 0)
          auto-inland snapped, red mouth (255, 0, 0) coastal snapped.
        </p>
      </div>

      {/* Active River Controls */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider block mb-1">
            River Name
          </label>
          <input
            type="text"
            value={riverName}
            onChange={(e) => setRiverName(e.target.value)}
            className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9]"
          />
        </div>

        {/* River Size Level */}
        <div>
          <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider block mb-1">
            River Size Level (Width Factor)
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { lvl: 1, label: 'Lvl 1', color: '#00E1FF' },
              { lvl: 2, label: 'Lvl 2', color: '#00C8FF' },
              { lvl: 3, label: 'Lvl 3', color: '#0096FF' },
              { lvl: 4, label: 'Lvl 4', color: '#0064FF' },
            ].map(({ lvl, label, color }) => (
              <button
                key={lvl}
                onClick={() => setRiverLevel(lvl as 1 | 2 | 3 | 4)}
                className={`py-1 rounded text-xs font-bold transition flex flex-col items-center gap-0.5 border ${
                  riverLevel === lvl
                    ? 'border-sky-400 bg-sky-950/60 text-sky-300'
                    : 'border-[#30392e] bg-[#1a211a] text-[#909b88] hover:text-[#e3e5d9]'
                }`}
              >
                <span>{label}</span>
                <span
                  className="h-1.5 w-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Points Info & Snapping */}
        <div className="p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#909b88]">Vector Waypoints:</span>
            <span className="font-bold text-[#d6b878]">{activeRiverPoints.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#909b88]">1px Rasterized Pixels:</span>
            <span className="font-bold text-sky-400">{rasterResult.pixels.length}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSnapEndpoints}
              disabled={activeRiverPoints.length < 2}
              className="flex-1 rounded bg-[#242d23] border border-[#3b4936] py-1 text-[11px] text-[#e3e5d9] hover:bg-[#354130] disabled:opacity-40"
            >
              Snap Mouth to Sea
            </button>
            <button
              onClick={() => onUpdateActiveRiverPoints([])}
              disabled={activeRiverPoints.length === 0}
              className="rounded bg-[#242d23] border border-[#3b4936] px-2 py-1 text-[11px] text-[#bd785c] hover:bg-[#354130] disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Topological Integrity Badge */}
        <div className="p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#909b88]">Topological Integrity:</span>
            {rasterResult.valid1px ? (
              <span className="flex items-center gap-1 text-[#a6bd87] font-semibold text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Zero 2x2 Blocks (Strict 1px)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#bd785c] font-semibold text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5" />
                2x2 Bottleneck
              </span>
            )}
          </div>
          {rasterResult.violations.map((v, i) => (
            <p key={i} className="text-[10px] text-[#bd785c]">
              • {v}
            </p>
          ))}
        </div>

        {/* Save River Button */}
        <button
          onClick={handleCommitRiver}
          disabled={activeRiverPoints.length < 2}
          className="w-full flex items-center justify-center gap-2 rounded bg-sky-500 py-2 text-xs font-bold text-black hover:bg-sky-400 disabled:opacity-40 shadow transition"
        >
          <Save className="h-4 w-4" />
          Commit River to Map
        </button>
      </div>

      {/* Existing Rivers List */}
      <div className="mt-6 space-y-2 flex-1">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider flex items-center justify-between">
          <span>Defined Rivers ({rivers.length})</span>
          <span className="text-[10px] text-[#717c6a]">map/rivers.bmp</span>
        </label>

        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {rivers.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between p-2 rounded border text-xs transition ${
                selectedRiverId === r.id
                  ? 'border-sky-500 bg-[#172535]'
                  : 'border-[#30392e] bg-[#1a211a] hover:border-[#46543f]'
              }`}
            >
              <div
                onClick={() => handleSelectRiverToInspect(r)}
                className="cursor-pointer flex-1"
              >
                <span className="font-semibold text-[#e3e5d9]">{r.name}</span>
                <div className="text-[10px] text-[#909b88]">
                  Level {r.level} · {r.pixels.length} pixels
                </div>
              </div>

              <button
                onClick={() => onDeleteRiver(r.id)}
                title="Delete River"
                className="p-1 rounded bg-[#242d23] border border-[#3b4936] text-[#bd785c] hover:bg-[#354130]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
