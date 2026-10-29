import React, { useState } from 'react';
import type { Province, State, TerrainType, ProvinceType } from '../../types/map';
import {
  Scissors,
  Check,
  Info,
} from 'lucide-react';

interface ProvinceSlicerProps {
  provinces: Province[];
  states: State[];
  selectedProvinceId: number | null;
  onSelectProvince: (id: number | null) => void;
  onApplySlice: (
    originalProvince: Province,
    newProvince: Province,
    parentStateId: number
  ) => void;
  cutLine: [number, number][] | null;
  onUpdateCutLine: (line: [number, number][] | null) => void;
}

// Generates a guaranteed-unique 24-bit RGB triplet avoiding reserved Paradox colors
export function generateUniqueRGB(
  existingColors: [number, number, number][]
): [number, number, number] {
  const existingSet = new Set(existingColors.map(([r, g, b]) => `${r},${g},${b}`));

  // Reserved colors in HOI4
  const isReserved = (r: number, g: number, b: number) => {
    if (r === 0 && g === 0 && b === 0) return true; // Void / separator
    if (r === 0 && g === 255 && b === 0) return true; // River source
    if (r === 255 && g === 0 && b === 0) return true; // River mouth
    if (r === 255 && g === 252 && b === 0) return true; // River flow indicator
    return false;
  };

  for (let attempt = 0; attempt < 50000; attempt++) {
    const r = Math.floor(Math.random() * 254) + 1;
    const g = Math.floor(Math.random() * 254) + 1;
    const b = Math.floor(Math.random() * 254) + 1;

    if (!isReserved(r, g, b) && !existingSet.has(`${r},${g},${b}`)) {
      return [r, g, b];
    }
  }

  // Fallback sequential generation
  for (let r = 1; r < 255; r++) {
    for (let g = 1; g < 255; g++) {
      for (let b = 1; b < 255; b++) {
        if (!isReserved(r, g, b) && !existingSet.has(`${r},${g},${b}`)) {
          return [r, g, b];
        }
      }
    }
  }

  return [128, 128, 128];
}

/**
 * Splits a 2D convex/simple polygon along a cutting line segment into two sub-polygons
 */
export function splitPolygonByLine(
  polygon: [number, number][],
  lineStart: [number, number],
  lineEnd: [number, number]
): [[number, number][], [number, number][]] {
  if (polygon.length < 3) return [polygon, polygon];

  // Line equation: A*x + B*y + C = 0
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const A = -dy;
  const B = dx;
  const C = -(A * lineStart[0] + B * lineStart[1]);

  const sideA: [number, number][] = [];
  const sideB: [number, number][] = [];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const dist1 = A * p1[0] + B * p1[1] + C;
    const dist2 = A * p2[0] + B * p2[1] + C;

    if (dist1 >= 0) {
      sideA.push(p1);
    } else {
      sideB.push(p1);
    }

    // Check if edge (p1, p2) crosses the cutting line
    if ((dist1 > 0 && dist2 < 0) || (dist1 < 0 && dist2 > 0)) {
      const t = dist1 / (dist1 - dist2);
      const ix = Math.round(p1[0] + t * (p2[0] - p1[0]));
      const iy = Math.round(p1[1] + t * (p2[1] - p1[1]));
      sideA.push([ix, iy]);
      sideB.push([ix, iy]);
    }
  }

  // If cut didn't divide polygon properly, produce a fallback geometric split
  if (sideA.length < 3 || sideB.length < 3) {
    const half = Math.floor(polygon.length / 2);
    return [polygon.slice(0, half + 1), polygon.slice(half)];
  }

  return [sideA, sideB];
}

// Computes polygon centroid
export function calculatePolygonCenter(polygon: [number, number][]): [number, number] {
  if (polygon.length === 0) return [0, 0];
  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of polygon) {
    sumX += x;
    sumY += y;
  }
  return [Math.round(sumX / polygon.length), Math.round(sumY / polygon.length)];
}

export const ProvinceSlicer: React.FC<ProvinceSlicerProps> = ({
  provinces,
  states: _states,
  selectedProvinceId,
  onSelectProvince,
  onApplySlice,
  cutLine: _cutLine,
  onUpdateCutLine,
}) => {
  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId) || null;

  // Attributes for the new province
  const [newProvName, setNewProvName] = useState('New Province');
  const [newProvTerrain, setNewProvTerrain] = useState<TerrainType>('plains');
  const [newProvCoastal, setNewProvCoastal] = useState(false);
  const [newProvType, setNewProvType] = useState<ProvinceType>('land');
  const [sliceSuccessMsg, setSliceSuccessMsg] = useState<string | null>(null);

  // Manual cut line coordinates relative to selected province
  const [lineP1, setLineP1] = useState<[number, number]>([0, 0]);
  const [lineP2, setLineP2] = useState<[number, number]>([100, 100]);

  // When selected province changes, set default cut line through its center
  React.useEffect(() => {
    if (selectedProvince) {
      const [cx, cy] = selectedProvince.center;
      const defaultStart: [number, number] = [cx - 60, cy - 40];
      const defaultEnd: [number, number] = [cx + 60, cy + 40];
      setLineP1(defaultStart);
      setLineP2(defaultEnd);
      onUpdateCutLine([defaultStart, defaultEnd]);
      setNewProvName(`${selectedProvince.name} East`);
      setNewProvTerrain(selectedProvince.terrain);
      setNewProvCoastal(selectedProvince.coastal);
      setNewProvType(selectedProvince.type);
    }
  }, [selectedProvinceId]);

  const handleUpdateLine = (p1: [number, number], p2: [number, number]) => {
    setLineP1(p1);
    setLineP2(p2);
    onUpdateCutLine([p1, p2]);
  };

  const handleExecuteSlice = () => {
    if (!selectedProvince) return;

    // 1. Split polygon
    const [polyA, polyB] = splitPolygonByLine(selectedProvince.polygon, lineP1, lineP2);

    // 2. Generate unique RGB avoiding (0,0,0), (0,255,0), (255,0,0), (255,252,0)
    const existingRGBs = provinces.map((p) => p.rgb);
    const uniqueRGB = generateUniqueRGB(existingRGBs);

    // 3. New province ID
    const newId = Math.max(...provinces.map((p) => p.id), 0) + 1;

    // 4. Create updated original province and new sliced province
    const updatedOriginal: Province = {
      ...selectedProvince,
      polygon: polyA,
      center: calculatePolygonCenter(polyA),
    };

    const newProvince: Province = {
      id: newId,
      name: newProvName,
      rgb: uniqueRGB,
      type: newProvType,
      coastal: newProvCoastal,
      terrain: newProvTerrain,
      continent: selectedProvince.continent,
      stateId: selectedProvince.stateId,
      polygon: polyB,
      center: calculatePolygonCenter(polyB),
      adjacentProvinceIds: [selectedProvince.id],
    };

    const parentStateId = selectedProvince.stateId || 1;
    onApplySlice(updatedOriginal, newProvince, parentStateId);

    const definitionCsvLine = `${newId};${uniqueRGB[0]};${uniqueRGB[1]};${uniqueRGB[2]};${newProvType};${newProvCoastal};${newProvTerrain};${selectedProvince.continent}`;
    setSliceSuccessMsg(
      `Created Province ${newId} (${newProvName}) with RGB (${uniqueRGB.join(', ')})!\nAdded to definition.csv: "${definitionCsvLine}" & State ${parentStateId}.`
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#141a15] text-[#e3e5d9] border-r border-[#30392e] w-80 p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#30392e]">
        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
          <Scissors className="h-4 w-4 text-[#d6b878]" />
          Visual Province Slicer
        </span>
      </div>

      {/* Target Province Selection */}
      <div className="mt-4 space-y-2">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider">
          Target Province to Slice
        </label>
        <select
          value={selectedProvinceId || ''}
          onChange={(e) => onSelectProvince(e.target.value ? Number(e.target.value) : null)}
          className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
        >
          <option value="">-- Select a Province on Canvas or Dropdown --</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (ID: {p.id}, {p.terrain})
            </option>
          ))}
        </select>
      </div>

      {selectedProvince ? (
        <div className="mt-4 space-y-4 flex-1">
          {/* Selected Province Details */}
          <div className="p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#909b88]">Selected:</span>
              <span className="font-bold text-[#e3e5d9]">{selectedProvince.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#909b88]">Province ID:</span>
              <span className="font-mono text-[#d6b878]">{selectedProvince.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#909b88]">Current RGB:</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full border border-black"
                  style={{
                    backgroundColor: `rgb(${selectedProvince.rgb.join(',')})`,
                  }}
                />
                <span className="font-mono text-[#85917d]">
                  ({selectedProvince.rgb.join(', ')})
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-[#909b88]">Terrain / Coastal:</span>
              <span>
                {selectedProvince.terrain} · {selectedProvince.coastal ? 'Coastal' : 'Inland'}
              </span>
            </div>
          </div>

          {/* Interactive Cut Line Adjuster */}
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider flex items-center justify-between">
              <span>Cut Line Trajectory</span>
              <span className="text-[10px] text-[#d6b878]">Draws across province</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#1a211a] p-2 rounded border border-[#30392e]">
                <span className="text-[#909b88] text-[10px] block">Start (X1, Y1)</span>
                <div className="flex gap-1 mt-1">
                  <input
                    type="number"
                    value={lineP1[0]}
                    onChange={(e) =>
                      handleUpdateLine([Number(e.target.value), lineP1[1]], lineP2)
                    }
                    className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-[11px]"
                  />
                  <input
                    type="number"
                    value={lineP1[1]}
                    onChange={(e) =>
                      handleUpdateLine([lineP1[0], Number(e.target.value)], lineP2)
                    }
                    className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-[11px]"
                  />
                </div>
              </div>

              <div className="bg-[#1a211a] p-2 rounded border border-[#30392e]">
                <span className="text-[#909b88] text-[10px] block">End (X2, Y2)</span>
                <div className="flex gap-1 mt-1">
                  <input
                    type="number"
                    value={lineP2[0]}
                    onChange={(e) =>
                      handleUpdateLine(lineP1, [Number(e.target.value), lineP2[1]])
                    }
                    className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-[11px]"
                  />
                  <input
                    type="number"
                    value={lineP2[1]}
                    onChange={(e) =>
                      handleUpdateLine(lineP1, [lineP2[0], Number(e.target.value)])
                    }
                    className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* New Province Specification */}
          <div className="space-y-2 text-xs">
            <label className="uppercase font-bold text-[#909b88] tracking-wider block">
              New Partition Attributes
            </label>

            <div>
              <label className="text-[#909b88] block mb-1">New Province Name</label>
              <input
                type="text"
                value={newProvName}
                onChange={(e) => setNewProvName(e.target.value)}
                className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[#909b88] block mb-1">Terrain</label>
                <select
                  value={newProvTerrain}
                  onChange={(e) => setNewProvTerrain(e.target.value as TerrainType)}
                  className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                >
                  <option value="plains">Plains</option>
                  <option value="forest">Forest</option>
                  <option value="hills">Hills</option>
                  <option value="mountain">Mountain</option>
                  <option value="urban">Urban</option>
                  <option value="jungle">Jungle</option>
                  <option value="marsh">Marsh</option>
                  <option value="desert">Desert</option>
                </select>
              </div>

              <div>
                <label className="text-[#909b88] block mb-1">Coastal</label>
                <select
                  value={newProvCoastal ? 'true' : 'false'}
                  onChange={(e) => setNewProvCoastal(e.target.value === 'true')}
                  className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2 py-1 text-xs text-[#e3e5d9]"
                >
                  <option value="true">True (Coastal)</option>
                  <option value="false">False (Inland)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Execute Slice Button */}
          <button
            onClick={handleExecuteSlice}
            className="w-full flex items-center justify-center gap-2 rounded bg-[#d6b878] py-2 text-xs font-bold text-[#141a15] hover:bg-[#e0c587] shadow transition"
          >
            <Scissors className="h-4 w-4" />
            Execute Slice & Generate Unique RGB
          </button>

          {/* Success Feedback & definition.csv info */}
          {sliceSuccessMsg && (
            <div className="p-3 rounded bg-[#182319] border border-[#41683d] text-xs space-y-1">
              <span className="text-[#a6bd87] font-semibold flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Slice Complete
              </span>
              <p className="text-[11px] text-[#e3e5d9] whitespace-pre-line">
                {sliceSuccessMsg}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-xs text-[#909b88] space-y-2">
          <Info className="h-8 w-8 text-[#536044]" />
          <span>Click on any province on the map canvas to begin partition slicing.</span>
        </div>
      )}
    </div>
  );
};
