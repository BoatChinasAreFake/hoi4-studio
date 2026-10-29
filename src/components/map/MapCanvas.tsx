import React, { useRef, useState, useCallback, useMemo } from 'react';
import type {
  Province,
  State,
  RiverPath,
  Railway,
  SupplyNode,
  MapPositionPin,
  MapLayerVisibility,
} from '../../types/map';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  MapPin,
  Anchor,
  Boxes,
} from 'lucide-react';

interface MapCanvasProps {
  provinces: Province[];
  states: State[];
  rivers: RiverPath[];
  railways: Railway[];
  supplyNodes: SupplyNode[];
  pins: MapPositionPin[];
  selectedProvinceId: number | null;
  selectedProvinceIds?: number[];
  onSelectProvince: (id: number | null) => void;
  layers: MapLayerVisibility;
  onToggleLayer: (layer: keyof MapLayerVisibility) => void;
  mapMode: 'terrain' | 'political' | 'provinces';
  onMapModeChange?: (mode: 'terrain' | 'political' | 'provinces') => void;
  activeTool?: 'navigate' | 'brush' | 'lasso' | 'slice' | 'river' | 'pin';
  brushRadius?: number;
  onCanvasPointerDown?: (geoX: number, geoY: number, e: React.PointerEvent) => void;
  onCanvasPointerMove?: (geoX: number, geoY: number, e: React.PointerEvent) => void;
  onCanvasPointerUp?: (geoX: number, geoY: number, e: React.PointerEvent) => void;
  overlaySvgElements?: React.ReactNode;
}

// Ray-casting algorithm to test if point [x, y] is inside a polygon
export function isPointInPolygon(x: number, y: number, vs: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  provinces,
  states,
  rivers,
  railways,
  supplyNodes,
  pins,
  selectedProvinceId,
  selectedProvinceIds = [],
  onSelectProvince,
  layers,
  onToggleLayer,
  mapMode,
  onMapModeChange,
  activeTool = 'navigate',
  brushRadius = 35,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  overlaySvgElements,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transformation: scale and translation
  const [scale, setScale] = useState(1.3);
  const [offset, setOffset] = useState({ x: 60, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredProvinceId, setHoveredProvinceId] = useState<number | null>(null);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // State color palette for political map mode
  const stateColorMap = useMemo(() => {
    const map = new Map<number, string>();
    const countryColors: Record<string, string> = {
      FRA: '#345275',
      ITA: '#4e6d42',
      GER: '#474747',
      ENG: '#823737',
      SOV: '#7a2d2d',
      USA: '#2c5e50',
    };
    for (const s of states) {
      map.set(s.id, countryColors[s.owner] || '#4f5b49');
    }
    return map;
  }, [states]);

  // Terrain colors
  const terrainColors: Record<string, string> = {
    plains: '#6d8253',
    forest: '#3f5934',
    hills: '#787352',
    mountain: '#6e655c',
    urban: '#965555',
    jungle: '#2d5435',
    marsh: '#4c6156',
    desert: '#a18b57',
    ocean: '#1e334a',
    lakes: '#27435f',
  };

  // Convert client screen mouse coordinates into map SVG world coordinates
  const screenToWorld = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      if (!containerRef.current) return [0, 0];
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const worldX = (rawX - offset.x) / scale;
      const worldY = (rawY - offset.y) / scale;
      return [worldX, worldY];
    },
    [offset, scale]
  );

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.4, Math.min(6.0, scale * zoomFactor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  };

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    const [worldX, worldY] = screenToWorld(e.clientX, e.clientY);

    // If middle click or spacebar or navigate tool, start panning
    if (e.button === 1 || e.button === 2 || activeTool === 'navigate') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (onCanvasPointerDown) {
      onCanvasPointerDown(worldX, worldY, e);
    }

    // Default province click selection
    let clickedId: number | null = null;
    for (const prov of provinces) {
      if (isPointInPolygon(worldX, worldY, prov.polygon)) {
        clickedId = prov.id;
        break;
      }
    }
    onSelectProvince(clickedId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const [worldX, worldY] = screenToWorld(e.clientX, e.clientY);
    setCursorPos({ x: worldX, y: worldY });

    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (onCanvasPointerMove) {
      onCanvasPointerMove(worldX, worldY, e);
    }

    // Hover test
    let foundHover: number | null = null;
    for (const prov of provinces) {
      if (isPointInPolygon(worldX, worldY, prov.polygon)) {
        foundHover = prov.id;
        break;
      }
    }
    setHoveredProvinceId(foundHover);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    const [worldX, worldY] = screenToWorld(e.clientX, e.clientY);
    if (onCanvasPointerUp) {
      onCanvasPointerUp(worldX, worldY, e);
    }
  };

  // Center / Fit View
  const handleFitView = () => {
    setScale(1.2);
    setOffset({ x: 80, y: 40 });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-full w-full overflow-hidden bg-[#0c100e] select-none cursor-crosshair"
    >
      {/* SVG Canvas Map Surface */}
      <svg className="h-full w-full pointer-events-none">
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {/* 1. Base Provinces Polygons */}
          {layers.provinces &&
            provinces.map((prov) => {
              const isSelected =
                selectedProvinceId === prov.id ||
                selectedProvinceIds.includes(prov.id);
              const isHovered = hoveredProvinceId === prov.id;

              // Color resolution
              let fill = '#3f4f3c';
              if (prov.type === 'sea') {
                fill = '#1a293d';
              } else if (mapMode === 'political' && prov.stateId) {
                fill = stateColorMap.get(prov.stateId) || '#445540';
              } else if (mapMode === 'provinces') {
                fill = `rgb(${prov.rgb[0]}, ${prov.rgb[1]}, ${prov.rgb[2]})`;
              } else {
                fill = terrainColors[prov.terrain] || '#54664a';
              }

              const pathData =
                prov.polygon.reduce((acc, [px, py], i) => {
                  return `${acc} ${i === 0 ? 'M' : 'L'} ${px} ${py}`;
                }, '') + ' Z';

              return (
                <path
                  key={prov.id}
                  d={pathData}
                  fill={fill}
                  stroke={
                    isSelected
                      ? '#f5d378'
                      : isHovered
                      ? '#ffffff'
                      : prov.type === 'sea'
                      ? '#121f30'
                      : '#242f22'
                  }
                  strokeWidth={isSelected ? 3 / scale : isHovered ? 2 / scale : 1 / scale}
                  strokeLinejoin="round"
                  className="transition-colors duration-75"
                />
              );
            })}

          {/* 2. State Boundaries Highlight */}
          {layers.states &&
            states.map((st) => {
              // Group state provinces and render subtle state label / border
              return (
                <g key={`state_group_${st.id}`}>
                  {st.provinces.map((pId) => {
                    const prov = provinces.find((p) => p.id === pId);
                    if (!prov) return null;
                    const pathData =
                      prov.polygon.reduce((acc, [px, py], i) => {
                        return `${acc} ${i === 0 ? 'M' : 'L'} ${px} ${py}`;
                      }, '') + ' Z';
                    return (
                      <path
                        key={`state_border_${st.id}_${pId}`}
                        d={pathData}
                        fill="none"
                        stroke="#d6b878"
                        strokeWidth={1.8 / scale}
                        strokeOpacity={0.65}
                        strokeDasharray={`${4 / scale}, ${2 / scale}`}
                      />
                    );
                  })}
                </g>
              );
            })}

          {/* 3. Rivers Layer */}
          {layers.rivers &&
            rivers.map((river) => {
              const polylinePoints = river.pixels
                .map(([rx, ry]) => `${rx},${ry}`)
                .join(' ');

              const head = river.pixels[0];
              const mouth = river.pixels[river.pixels.length - 1];

              return (
                <g key={river.id}>
                  {/* River Path */}
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke={
                      river.level === 4
                        ? '#0064FF'
                        : river.level === 3
                        ? '#0096FF'
                        : river.level === 2
                        ? '#00C8FF'
                        : '#00E1FF'
                    }
                    strokeWidth={Math.max(1, (river.level * 1.2) / scale)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Green Source inland snapping */}
                  {head && (
                    <circle
                      cx={head[0]}
                      cy={head[1]}
                      r={3.5 / scale}
                      fill="#00FF00"
                      stroke="#000000"
                      strokeWidth={1 / scale}
                    />
                  )}
                  {/* Red Mouth coastal snapping */}
                  {mouth && (
                    <circle
                      cx={mouth[0]}
                      cy={mouth[1]}
                      r={3.5 / scale}
                      fill="#FF0000"
                      stroke="#000000"
                      strokeWidth={1 / scale}
                    />
                  )}
                </g>
              );
            })}

          {/* 4. Railways Layer */}
          {layers.railways &&
            railways.map((rail) => {
              const coords: [number, number][] = rail.provinces
                .map((pId) => provinces.find((p) => p.id === pId)?.center)
                .filter((c): c is [number, number] => Boolean(c));

              if (coords.length < 2) return null;
              const pointsStr = coords.map(([cx, cy]) => `${cx},${cy}`).join(' ');

              return (
                <g key={rail.id}>
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#181818"
                    strokeWidth={(rail.level * 1.5 + 2) / scale}
                    strokeLinecap="round"
                  />
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#d1a742"
                    strokeWidth={(rail.level * 1.2) / scale}
                    strokeDasharray={`${6 / scale}, ${4 / scale}`}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

          {/* 5. Supply Nodes Layer */}
          {layers.supplyNodes &&
            supplyNodes.map((node) => {
              const prov = provinces.find((p) => p.id === node.provinceId);
              if (!prov) return null;
              const [cx, cy] = prov.center;

              return (
                <g
                  key={node.id}
                  transform={`translate(${cx}, ${cy}) scale(${1 / scale})`}
                >
                  <circle r={10} fill="#182319" stroke="#5bd16f" strokeWidth={2} />
                  <Boxes className="h-3 w-3 text-[#5bd16f] -translate-x-1.5 -translate-y-1.5" />
                  <text
                    y={16}
                    textAnchor="middle"
                    fill="#9ee8ab"
                    fontSize={9}
                    fontWeight="bold"
                  >
                    Lvl {node.level}
                  </text>
                </g>
              );
            })}

          {/* 6. 3D Map Positions Pins Layer */}
          {layers.pins &&
            pins.map((pin) => {
              return (
                <g
                  key={pin.id}
                  transform={`translate(${pin.x}, ${pin.z}) scale(${1 / scale}) rotate(${
                    (pin.rotation * 180) / Math.PI
                  })`}
                >
                  {pin.type === 'city' && (
                    <g className="cursor-pointer">
                      <rect
                        x={-8}
                        y={-8}
                        width={16}
                        height={16}
                        fill="#b8860b"
                        stroke="#fff"
                        strokeWidth={1.5}
                        rx={2}
                      />
                      <MapPin className="h-3 w-3 text-white -translate-x-1.5 -translate-y-1.5" />
                    </g>
                  )}
                  {pin.type === 'port' && (
                    <g className="cursor-pointer">
                      <circle r={9} fill="#1f4b75" stroke="#7ec4f5" strokeWidth={1.5} />
                      <Anchor className="h-3.5 w-3.5 text-[#7ec4f5] -translate-x-1.5 -translate-y-1.5" />
                    </g>
                  )}
                  {pin.type === 'victory_point' && (
                    <g className="cursor-pointer">
                      <polygon
                        points="0,-10 3,-3 10,-3 4,2 6,9 0,5 -6,9 -4,2 -10,-3 -3,-3"
                        fill="#ffd700"
                        stroke="#8b6508"
                        strokeWidth={1}
                      />
                    </g>
                  )}
                  {pin.type === 'unit_stack' && (
                    <g className="cursor-pointer">
                      <rect
                        x={-12}
                        y={-7}
                        width={24}
                        height={14}
                        fill="#385437"
                        stroke="#d6b878"
                        strokeWidth={1.5}
                        rx={1}
                      />
                      <line
                        x1={-12}
                        y1={-7}
                        x2={12}
                        y2={7}
                        stroke="#d6b878"
                        strokeWidth={1}
                      />
                      <line
                        x1={-12}
                        y1={7}
                        x2={12}
                        y2={-7}
                        stroke="#d6b878"
                        strokeWidth={1}
                      />
                    </g>
                  )}
                </g>
              );
            })}

          {/* 7. Province Labels */}
          {layers.provinceLabels &&
            provinces.map((prov) => {
              if (prov.type === 'sea' && scale < 0.9) return null;
              return (
                <text
                  key={`label_${prov.id}`}
                  x={prov.center[0]}
                  y={prov.center[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#f0f2eb"
                  fontSize={Math.max(9, 12 / scale)}
                  fontWeight="600"
                  className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {prov.name} <tspan fill="#d6b878" fontSize={9 / scale}>({prov.id})</tspan>
                </text>
              );
            })}

          {/* 8. Active Brush Cursor Visualizer */}
          {activeTool === 'brush' && cursorPos && (
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r={brushRadius}
              fill="rgba(214, 184, 120, 0.15)"
              stroke="#d6b878"
              strokeWidth={1.5 / scale}
              strokeDasharray={`${4 / scale}, ${3 / scale}`}
            />
          )}

          {/* 9. Custom External SVG Elements (e.g. Cut Line for slicer) */}
          {overlaySvgElements}
        </g>
      </svg>

      {/* Floating Canvas Controls Top Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Layer Visibility Toggle Menu */}
        <div className="relative">
          <button
            onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
            title="Layer Visibility"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#3b4936] bg-[#1a211a]/90 text-[#e3e5d9] shadow hover:bg-[#253023] hover:text-[#d6b878] transition"
          >
            <Layers className="h-4 w-4" />
          </button>

          {isLayersMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded border border-[#3b4936] bg-[#181e19] p-2 text-xs shadow-xl space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#909b88] px-2 block mb-1">
                Map Layers
              </span>
              {[
                { key: 'provinces', label: 'Provinces' },
                { key: 'states', label: 'States' },
                { key: 'provinceLabels', label: 'Province Labels' },
                { key: 'rivers', label: 'Rivers' },
                { key: 'railways', label: 'Railways' },
                { key: 'supplyNodes', label: 'Supply Hubs' },
                { key: 'pins', label: 'Positions Pins' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded px-2 py-1 hover:bg-[#242d23] cursor-pointer"
                >
                  <span className="text-[#e3e5d9]">{label}</span>
                  <input
                    type="checkbox"
                    checked={layers[key as keyof MapLayerVisibility]}
                    onChange={() => onToggleLayer(key as keyof MapLayerVisibility)}
                    className="accent-[#d6b878]"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded border border-[#3b4936] bg-[#1a211a]/90 shadow overflow-hidden">
          <button
            onClick={() => setScale((s) => Math.min(6.0, s * 1.25))}
            title="Zoom In"
            className="flex h-8 w-8 items-center justify-center text-[#e3e5d9] hover:bg-[#253023] hover:text-[#d6b878] transition"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(0.4, s / 1.25))}
            title="Zoom Out"
            className="flex h-8 w-8 items-center justify-center text-[#e3e5d9] hover:bg-[#253023] hover:text-[#d6b878] transition border-t border-[#30392e]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitView}
            title="Reset / Fit View"
            className="flex h-8 w-8 items-center justify-center text-[#e3e5d9] hover:bg-[#253023] hover:text-[#d6b878] transition border-t border-[#30392e]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Map Mode Switcher */}
        {onMapModeChange && (
          <div className="flex flex-col gap-1 rounded border border-[#3b4936] bg-[#1a211a]/90 p-1 shadow">
            <button
              onClick={() => onMapModeChange('terrain')}
              className={`rounded px-2 py-1 text-[10px] font-bold transition text-left ${
                mapMode === 'terrain'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => onMapModeChange('political')}
              className={`rounded px-2 py-1 text-[10px] font-bold transition text-left ${
                mapMode === 'political'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              Political
            </button>
            <button
              onClick={() => onMapModeChange('provinces')}
              className={`rounded px-2 py-1 text-[10px] font-bold transition text-left ${
                mapMode === 'provinces'
                  ? 'bg-[#d6b878] text-[#1c2119]'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              RGB IDs
            </button>
          </div>
        )}
      </div>

      {/* Hover Info HUD Bottom Left */}
      {hoveredProvinceId !== null && (
        <div className="absolute bottom-4 left-4 z-20 rounded border border-[#3b4936] bg-[#141a15]/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xs flex items-center gap-3">
          {(() => {
            const prov = provinces.find((p) => p.id === hoveredProvinceId);
            if (!prov) return null;
            const parentState = states.find((s) => s.id === prov.stateId);
            return (
              <>
                <div
                  className="h-3.5 w-3.5 rounded-full border border-black/40 shadow-xs"
                  style={{
                    backgroundColor: `rgb(${prov.rgb[0]}, ${prov.rgb[1]}, ${prov.rgb[2]})`,
                  }}
                />
                <div>
                  <span className="font-bold text-[#e3e5d9]">{prov.name}</span>
                  <span className="text-[#909b88] ml-1.5">ID: {prov.id}</span>
                </div>
                <span className="text-[#3b4936]">|</span>
                <span className="text-[11px] text-[#a6bd87] uppercase font-semibold">
                  {prov.terrain}
                </span>
                {parentState && (
                  <>
                    <span className="text-[#3b4936]">|</span>
                    <span className="text-[#d6b878]">
                      {parentState.name} ({parentState.owner})
                    </span>
                  </>
                )}
                <span className="text-[#3b4936]">|</span>
                <span className="text-[10px] text-[#85917d]">
                  RGB: ({prov.rgb.join(', ')})
                </span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
