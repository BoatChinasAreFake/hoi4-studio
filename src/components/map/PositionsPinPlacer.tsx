import React, { useState } from 'react';
import type { Province, State, MapPositionPin } from '../../types/map';
import {
  MapPin,
  Anchor,
  Star,
  Shield,
  Plane,
  Building,
  Trash2,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

interface PositionsPinPlacerProps {
  provinces: Province[];
  states: State[];
  pins: MapPositionPin[];
  onSavePins: (pins: MapPositionPin[]) => void;
  selectedPinId: string | null;
  onSelectPinId: (id: string | null) => void;
  isPlacingPin: boolean;
  onSetIsPlacingPin: (placing: boolean) => void;
  pendingPinType: MapPositionPin['type'];
  onSetPendingPinType: (type: MapPositionPin['type']) => void;
}

export function generateBuildingsTxt(pins: MapPositionPin[]): string {
  const lines: string[] = [];
  for (const pin of pins) {
    if (pin.type === 'city') {
      lines.push(
        `${pin.provinceId};arms_factory;${pin.x.toFixed(2)};${pin.y.toFixed(2)};${pin.z.toFixed(2)};${pin.rotation.toFixed(2)};0`
      );
      lines.push(
        `${pin.provinceId};industrial_complex;${(pin.x + 4).toFixed(2)};${(pin.y + 0.4).toFixed(2)};${(pin.z - 3).toFixed(2)};${pin.rotation.toFixed(2)};0`
      );
    } else if (pin.type === 'air_base') {
      lines.push(
        `${pin.provinceId};air_base;${pin.x.toFixed(2)};${pin.y.toFixed(2)};${pin.z.toFixed(2)};${pin.rotation.toFixed(2)};0`
      );
    } else if (pin.type === 'port' || pin.type === 'naval_base') {
      lines.push(
        `${pin.provinceId};naval_base_spawn;${pin.x.toFixed(2)};${pin.y.toFixed(2)};${pin.z.toFixed(2)};${pin.rotation.toFixed(2)};${pin.connectingSeaProv || 0}`
      );
    }
  }
  return lines.join('\n');
}

export function generateUnitStacksTxt(pins: MapPositionPin[]): string {
  const lines: string[] = [];
  for (const pin of pins) {
    if (pin.type === 'unit_stack') {
      lines.push(
        `${pin.provinceId};0;${pin.x.toFixed(2)};${pin.y.toFixed(2)};${pin.z.toFixed(2)};${pin.rotation.toFixed(2)};${(pin.scale || 0.3).toFixed(2)}`
      );
    }
  }
  return lines.join('\n');
}

export const PositionsPinPlacer: React.FC<PositionsPinPlacerProps> = ({
  provinces,
  states: _states,
  pins,
  onSavePins,
  selectedPinId,
  onSelectPinId,
  isPlacingPin,
  onSetIsPlacingPin,
  pendingPinType,
  onSetPendingPinType,
}) => {
  const selectedPin = pins.find((p) => p.id === selectedPinId) || null;
  const [viewingFile, setViewingFile] = useState<'buildings' | 'unitstacks' | null>(null);
  const [copied, setCopied] = useState(false);

  const seaProvinces = provinces.filter((p) => p.type === 'sea' || p.coastal);

  const handleUpdateSelectedPin = (updates: Partial<MapPositionPin>) => {
    if (!selectedPinId) return;
    const newPins = pins.map((p) => (p.id === selectedPinId ? { ...p, ...updates } : p));
    onSavePins(newPins);
  };

  const handleDeletePin = (id: string) => {
    const newPins = pins.filter((p) => p.id !== id);
    onSavePins(newPins);
    if (selectedPinId === id) onSelectPinId(null);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#141a15] text-[#e3e5d9] border-r border-[#30392e] w-80 p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#30392e]">
        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#d6b878]" />
          Positions Pin Placer
        </span>
        <button
          onClick={() => onSetIsPlacingPin(!isPlacingPin)}
          className={`px-2.5 py-1 rounded text-xs font-bold transition ${
            isPlacingPin
              ? 'bg-[#d6b878] text-black shadow'
              : 'bg-[#242d23] border border-[#3b4936] text-[#e3e5d9] hover:bg-[#354130]'
          }`}
        >
          {isPlacingPin ? 'Cancel Pin' : 'Place Pin'}
        </button>
      </div>

      {/* Select Pin Type To Place */}
      <div className="mt-3 space-y-2">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider block">
          Pin Category
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { type: 'city', label: 'City / Factory', icon: <Building className="h-3.5 w-3.5" /> },
            { type: 'port', label: 'Port / Naval', icon: <Anchor className="h-3.5 w-3.5" /> },
            { type: 'victory_point', label: 'Victory Point', icon: <Star className="h-3.5 w-3.5" /> },
            { type: 'unit_stack', label: 'Unit Stack', icon: <Shield className="h-3.5 w-3.5" /> },
            { type: 'air_base', label: 'Air Base', icon: <Plane className="h-3.5 w-3.5" /> },
          ].map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => onSetPendingPinType(type as MapPositionPin['type'])}
              className={`p-2 rounded text-[11px] font-semibold flex flex-col items-center gap-1 border transition ${
                pendingPinType === type
                  ? 'border-[#d6b878] bg-[#2a3424] text-[#d6b878]'
                  : 'border-[#30392e] bg-[#1a211a] text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              {icon}
              <span className="text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Pin 3D Coordinate Inspector */}
      {selectedPin ? (
        <div className="mt-4 p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#30392e] pb-2">
            <span className="font-bold text-[#e3e5d9]">
              Pin: {selectedPin.type.toUpperCase()} ({selectedPin.provinceId})
            </span>
            <button
              onClick={() => handleDeletePin(selectedPin.id)}
              className="text-[#bd785c] hover:text-red-400 p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[#909b88] block text-[10px] mb-0.5">X (East)</label>
              <input
                type="number"
                value={selectedPin.x}
                onChange={(e) => handleUpdateSelectedPin({ x: Number(e.target.value) })}
                className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-xs text-[#e3e5d9]"
              />
            </div>
            <div>
              <label className="text-[#909b88] block text-[10px] mb-0.5">Y (Height)</label>
              <input
                type="number"
                step="0.1"
                value={selectedPin.y}
                onChange={(e) => handleUpdateSelectedPin({ y: Number(e.target.value) })}
                className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-xs text-[#e3e5d9]"
              />
            </div>
            <div>
              <label className="text-[#909b88] block text-[10px] mb-0.5">Z (North)</label>
              <input
                type="number"
                value={selectedPin.z}
                onChange={(e) => handleUpdateSelectedPin({ z: Number(e.target.value) })}
                className="w-full bg-[#121613] border border-[#3b4936] rounded px-1.5 py-1 text-xs text-[#e3e5d9]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[#909b88] mb-1">
              <span>Rotation Angle</span>
              <span className="text-[#d6b878]">
                {((selectedPin.rotation * 180) / Math.PI).toFixed(0)}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2 * Math.PI}
              step={0.05}
              value={selectedPin.rotation}
              onChange={(e) => handleUpdateSelectedPin({ rotation: Number(e.target.value) })}
              className="w-full accent-[#d6b878]"
            />
          </div>

          {(selectedPin.type === 'port' || selectedPin.type === 'naval_base') && (
            <div>
              <label className="text-[#909b88] block text-[10px] mb-1">
                Connecting Sea Province (for Ship Spawning)
              </label>
              <select
                value={selectedPin.connectingSeaProv || ''}
                onChange={(e) =>
                  handleUpdateSelectedPin({ connectingSeaProv: Number(e.target.value) })
                }
                className="w-full bg-[#121613] border border-[#3b4936] rounded px-2 py-1 text-xs text-[#e3e5d9]"
              >
                <option value="">0 (None)</option>
                {seaProvinces.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} (ID: {sp.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 p-3 rounded bg-[#1a211a] border border-[#30392e] text-xs text-[#909b88] text-center">
          Click "Place Pin" and click on the canvas to place a 3D asset pin.
        </div>
      )}

      {/* Pins List */}
      <div className="mt-4 space-y-2 flex-1">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider flex items-center justify-between">
          <span>Placed Pins ({pins.length})</span>
        </label>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {pins.map((pin) => (
            <div
              key={pin.id}
              onClick={() => onSelectPinId(pin.id)}
              className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition ${
                selectedPinId === pin.id
                  ? 'border-[#d6b878] bg-[#222c1f]'
                  : 'border-[#30392e] bg-[#1a211a] hover:border-[#46543f]'
              }`}
            >
              <div>
                <span className="font-semibold text-[#e3e5d9] capitalize">
                  {pin.type.replace('_', ' ')}
                </span>
                <div className="text-[10px] text-[#909b88]">
                  Prov: {pin.provinceId} · Pos: ({pin.x.toFixed(0)}, {pin.z.toFixed(0)})
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Export Buttons */}
      <div className="mt-4 pt-3 border-t border-[#30392e] grid grid-cols-2 gap-2">
        <button
          onClick={() => setViewingFile('buildings')}
          className="flex items-center justify-center gap-1.5 rounded bg-[#242d23] border border-[#3b4936] py-1.5 text-xs text-[#d6b878] hover:bg-[#354130]"
        >
          <FileText className="h-3.5 w-3.5" />
          buildings.txt
        </button>
        <button
          onClick={() => setViewingFile('unitstacks')}
          className="flex items-center justify-center gap-1.5 rounded bg-[#242d23] border border-[#3b4936] py-1.5 text-xs text-[#d6b878] hover:bg-[#354130]"
        >
          <FileText className="h-3.5 w-3.5" />
          unitstacks.txt
        </button>
      </div>

      {/* Code Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg border border-[#526044] bg-[#181e19] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30392e] pb-2">
              <h3 className="font-bold text-sm text-[#e3e5d9]">
                map/{viewingFile}.txt
              </h3>
              <button
                onClick={() =>
                  handleCopyCode(
                    viewingFile === 'buildings'
                      ? generateBuildingsTxt(pins)
                      : generateUnitStacksTxt(pins)
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs text-[#d6b878] hover:bg-[#354130]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="max-h-96 overflow-y-auto p-3 rounded bg-[#101411] border border-[#2b3529] font-mono text-xs text-[#a6bd87] whitespace-pre">
              {viewingFile === 'buildings'
                ? generateBuildingsTxt(pins)
                : generateUnitStacksTxt(pins)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingFile(null)}
                className="px-4 py-1.5 rounded bg-[#242d23] text-xs text-[#e3e5d9] hover:bg-[#354130]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
