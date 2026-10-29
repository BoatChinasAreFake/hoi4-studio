import React, { useState, useEffect, useMemo } from 'react';
import type {
  Province,
  State,
  RiverPath,
  Railway,
  SupplyNode,
  MapPositionPin,
  MapLayerVisibility,
  MapLinterIssue,
} from '../../types/map';
import {
  INITIAL_PROVINCES,
  INITIAL_STATES,
  INITIAL_RIVERS,
  INITIAL_RAILWAYS,
  INITIAL_SUPPLY_NODES,
  INITIAL_PINS,
} from '../../utils/mapDefaults';
import { MapCanvas, isPointInPolygon } from './MapCanvas';
import { StateReassignmentTool } from './StateReassignmentTool';
import { ProvinceSlicer, generateUniqueRGB } from './ProvinceSlicer';
import { RiverPencil } from './RiverPencil';
import { PositionsPinPlacer } from './PositionsPinPlacer';
import { RailwayNetworkBuilder } from './RailwayNetworkBuilder';
import { MapLinter } from './MapLinter';
import { MapFilesTool } from './MapFilesTool';
import {
  Map as MapIcon,
  Paintbrush,
  Scissors,
  Waves,
  MapPin,
  TrainTrack,
  ShieldAlert,
  FileCog,
} from 'lucide-react';

export type MapStudioTab =
  | 'canvas'
  | 'states'
  | 'slicer'
  | 'river'
  | 'pins'
  | 'railways'
  | 'linter'
  | 'files';

interface WorldMapStudioProps {
  initialTab?: MapStudioTab;
  onNotify?: (msg: string) => void;
}

export const WorldMapStudio: React.FC<WorldMapStudioProps> = ({
  initialTab = 'canvas',
  onNotify,
}) => {
  // Main Map State
  const [provinces, setProvinces] = useState<Province[]>(INITIAL_PROVINCES);
  const [states, setStates] = useState<State[]>(INITIAL_STATES);
  const [rivers, setRivers] = useState<RiverPath[]>(INITIAL_RIVERS);
  const [railways, setRailways] = useState<Railway[]>(INITIAL_RAILWAYS);
  const [supplyNodes, setSupplyNodes] = useState<SupplyNode[]>(INITIAL_SUPPLY_NODES);
  const [pins, setPins] = useState<MapPositionPin[]>(INITIAL_PINS);

  // Active Sub-Studio Tool Tab
  const [activeTab, setActiveTab] = useState<MapStudioTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Province Selection
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(101);
  const [selectedProvinceIds, setSelectedProvinceIds] = useState<number[]>([101]);

  // State Reassignment selection mode
  const [selectionMode, setSelectionMode] = useState<'click' | 'brush' | 'lasso'>('click');
  const [brushRadius, setBrushRadius] = useState<number>(35);

  // Province Slicer cut line
  const [cutLine, setCutLine] = useState<[number, number][] | null>(null);

  // River Drawing in-progress
  const [activeRiverPoints, setActiveRiverPoints] = useState<[number, number][]>([]);
  const [isDrawingRiver, setIsDrawingRiver] = useState(false);

  // Pin Placing in-progress
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [pendingPinType, setPendingPinType] = useState<MapPositionPin['type']>('city');

  // Railway Building in-progress
  const [activeBuildingRailProvinces, setActiveBuildingRailProvinces] = useState<number[]>([]);
  const [isBuildingRail, setIsBuildingRail] = useState(false);

  // Layers Visibility
  const [layers, setLayers] = useState<MapLayerVisibility>({
    provinces: true,
    states: true,
    terrain: true,
    provinceLabels: true,
    stateLabels: true,
    rivers: true,
    railways: true,
    supplyNodes: true,
    pins: true,
  });

  const [mapMode, setMapMode] = useState<'terrain' | 'political' | 'provinces'>('terrain');

  const handleToggleLayer = (layer: keyof MapLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Canvas pointer event hooks for interactive drawing
  const handleCanvasPointerDown = (geoX: number, geoY: number, _e: React.PointerEvent) => {
    if (activeTab === 'river' && isDrawingRiver) {
      setActiveRiverPoints((pts) => [...pts, [Math.round(geoX), Math.round(geoY)]]);
      return;
    }

    if (activeTab === 'pins' && isPlacingPin) {
      // Find province under pin
      let targetProvId = 101;
      for (const p of provinces) {
        if (isPointInPolygon(geoX, geoY, p.polygon)) {
          targetProvId = p.id;
          break;
        }
      }

      const newPin: MapPositionPin = {
        id: `pin_${Date.now()}`,
        type: pendingPinType,
        provinceId: targetProvId,
        x: Math.round(geoX),
        y: 11.5,
        z: Math.round(geoY),
        rotation: 0,
        scale: 0.3,
        connectingSeaProv: pendingPinType === 'port' ? 901 : undefined,
      };

      setPins((prev) => [...prev, newPin]);
      setSelectedPinId(newPin.id);
      setIsPlacingPin(false);
      onNotify?.(`Placed ${pendingPinType} pin at (${newPin.x}, ${newPin.z})`);
      return;
    }

    if (activeTab === 'railways' && isBuildingRail) {
      for (const p of provinces) {
        if (isPointInPolygon(geoX, geoY, p.polygon)) {
          setActiveBuildingRailProvinces((prev) =>
            prev.includes(p.id) ? prev : [...prev, p.id]
          );
          break;
        }
      }
      return;
    }

    if (activeTab === 'states' && selectionMode === 'brush') {
      // Find all provinces intersecting brush circle
      const hitIds: number[] = [];
      for (const p of provinces) {
        const dx = p.center[0] - geoX;
        const dy = p.center[1] - geoY;
        if (Math.sqrt(dx * dx + dy * dy) <= brushRadius) {
          hitIds.push(p.id);
        }
      }
      if (hitIds.length > 0) {
        setSelectedProvinceIds((prev) => Array.from(new Set([...prev, ...hitIds])));
      }
    }
  };

  const handleCanvasPointerMove = (geoX: number, geoY: number, e: React.PointerEvent) => {
    if (activeTab === 'states' && selectionMode === 'brush' && e.buttons === 1) {
      const hitIds: number[] = [];
      for (const p of provinces) {
        const dx = p.center[0] - geoX;
        const dy = p.center[1] - geoY;
        if (Math.sqrt(dx * dx + dy * dy) <= brushRadius) {
          hitIds.push(p.id);
        }
      }
      if (hitIds.length > 0) {
        setSelectedProvinceIds((prev) => Array.from(new Set([...prev, ...hitIds])));
      }
    }
  };

  // Slice Province application
  const handleApplySlice = (
    updatedOriginal: Province,
    newProvince: Province,
    parentStateId: number
  ) => {
    // 1. Update provinces list
    setProvinces((prev) => [
      ...prev.map((p) => (p.id === updatedOriginal.id ? updatedOriginal : p)),
      newProvince,
    ]);

    // 2. Add new province to state
    setStates((prev) =>
      prev.map((s) => {
        if (s.id === parentStateId) {
          return {
            ...s,
            provinces: Array.from(new Set([...s.provinces, newProvince.id])),
          };
        }
        return s;
      })
    );

    setSelectedProvinceId(newProvince.id);
    setSelectedProvinceIds([newProvince.id]);
    onNotify?.(`Successfully sliced! Created Province ${newProvince.id} (${newProvince.name})`);
  };

  // Linter Auto-Fix Handler
  const handleAutoFixLinterIssue = (issue: MapLinterIssue) => {
    if (issue.category === 'duplicate_rgb' && issue.location?.provinceId) {
      const targetId = issue.location.provinceId;
      const otherColors = provinces
        .filter((p) => p.id !== targetId)
        .map((p) => p.rgb);
      const uniqueRGB = generateUniqueRGB(otherColors);

      setProvinces((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, rgb: uniqueRGB } : p))
      );
      onNotify?.(`Auto-fixed: Allocated unique RGB (${uniqueRGB.join(', ')}) to province ${targetId}`);
    } else if (issue.category === 'coastal_mismatch' && issue.location?.provinceId) {
      const targetId = issue.location.provinceId;
      const targetProv = provinces.find((p) => p.id === targetId);
      if (targetProv) {
        const seaIds = new Set(provinces.filter((p) => p.type === 'sea').map((p) => p.id));
        const touchesSea = targetProv.adjacentProvinceIds.some((id) => seaIds.has(id));
        setProvinces((prev) =>
          prev.map((p) => (p.id === targetId ? { ...p, coastal: touchesSea } : p))
        );
        onNotify?.(`Auto-fixed: Updated coastal status for ${targetProv.name} to ${touchesSea}`);
      }
    } else if (issue.category === 'unassigned_province' && issue.location?.provinceId) {
      const targetId = issue.location.provinceId;
      const defaultState = states[0] || INITIAL_STATES[0];
      setStates((prev) =>
        prev.map((s) =>
          s.id === defaultState.id
            ? { ...s, provinces: Array.from(new Set([...s.provinces, targetId])) }
            : s
        )
      );
      setProvinces((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, stateId: defaultState.id } : p))
      );
      onNotify?.(`Auto-fixed: Assigned province ${targetId} to State ${defaultState.name}`);
    }
  };

  // Overlay SVG Elements for Canvas
  const overlaySvgElements = useMemo(() => {
    return (
      <>
        {/* Cut Line Overlay when Slicer is active */}
        {activeTab === 'slicer' && cutLine && cutLine.length === 2 && (
          <line
            x1={cutLine[0][0]}
            y1={cutLine[0][1]}
            x2={cutLine[1][0]}
            y2={cutLine[1][1]}
            stroke="#ff3b30"
            strokeWidth={2}
            strokeDasharray="6, 4"
            className="animate-pulse"
          />
        )}

        {/* River Drawing Polyline In-Progress */}
        {activeTab === 'river' && isDrawingRiver && activeRiverPoints.length > 0 && (
          <g>
            <polyline
              points={activeRiverPoints.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="#00E1FF"
              strokeWidth={3}
              strokeDasharray="4, 2"
            />
            {activeRiverPoints.map(([x, y], idx) => (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={3}
                fill={idx === 0 ? '#00FF00' : '#ffffff'}
                stroke="#000"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* In-Progress Railway track overlay */}
        {activeTab === 'railways' && isBuildingRail && activeBuildingRailProvinces.length > 1 && (
          <polyline
            points={activeBuildingRailProvinces
              .map((id) => provinces.find((p) => p.id === id)?.center)
              .filter(Boolean)
              .map((c) => `${c![0]},${c![1]}`)
              .join(' ')}
            fill="none"
            stroke="#d1a742"
            strokeWidth={4}
            strokeDasharray="8, 4"
          />
        )}
      </>
    );
  }, [
    activeTab,
    cutLine,
    activeRiverPoints,
    isDrawingRiver,
    activeBuildingRailProvinces,
    isBuildingRail,
    provinces,
  ]);

  const navStrip = (
    <>
      {/* Sub-Studio Navigation Strip */}
      <div className="flex flex-col items-center border-r border-[#30392e] bg-[#121814] w-12 py-3 gap-2 select-none z-10 shrink-0">
        {[
          { tab: 'canvas', label: 'Vector Canvas', icon: <MapIcon className="h-4 w-4" /> },
          { tab: 'states', label: 'State Reassignment', icon: <Paintbrush className="h-4 w-4" /> },
          { tab: 'slicer', label: 'Province Slicer', icon: <Scissors className="h-4 w-4" /> },
          { tab: 'river', label: '1px River Pencil', icon: <Waves className="h-4 w-4" /> },
          { tab: 'pins', label: 'Positions Pins', icon: <MapPin className="h-4 w-4" /> },
          { tab: 'railways', label: 'Railway & Supply Hubs', icon: <TrainTrack className="h-4 w-4" /> },
          { tab: 'linter', label: 'Map Integrity Linter', icon: <ShieldAlert className="h-4 w-4" /> },
          { tab: 'files', label: 'Map Files (bitmaps, regions, supply, straits)', icon: <FileCog className="h-4 w-4" /> },
        ].map(({ tab, label, icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as MapStudioTab);
                if (tab !== 'river') setIsDrawingRiver(false);
                if (tab !== 'pins') setIsPlacingPin(false);
                if (tab !== 'railways') setIsBuildingRail(false);
              }}
              title={label}
              className={`flex h-9 w-9 items-center justify-center rounded transition duration-150 ${
                isActive
                  ? 'bg-[#354130] text-[#d6b878] border border-[#d6b878]/60 shadow-inner'
                  : 'text-[#909b88] hover:bg-[#1f281d] hover:text-[#e3e5d9]'
              }`}
            >
              {icon}
            </button>
          );
        })}
      </div>
    </>
  );

  if (activeTab === 'files') {
    return (
      <div className="flex h-full w-full overflow-hidden bg-[#101512]">
        {navStrip}
        <MapFilesTool onNotify={onNotify} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#101512]">
      {navStrip}

      {/* Left Tool Sidebar Panel */}
      {activeTab === 'states' && (
        <StateReassignmentTool
          provinces={provinces}
          states={states}
          selectedProvinceIds={selectedProvinceIds}
          onSelectProvinces={(ids) => {
            setSelectedProvinceIds(ids);
            if (ids.length > 0) setSelectedProvinceId(ids[0]);
          }}
          onUpdateStates={(newStates, updatedProvinces) => {
            setStates(newStates);
            setProvinces(updatedProvinces);
            onNotify?.('Updated state provinces and generated Clausewitz files.');
          }}
          activeSelectionMode={selectionMode}
          onChangeSelectionMode={setSelectionMode}
          brushRadius={brushRadius}
          onChangeBrushRadius={setBrushRadius}
        />
      )}

      {activeTab === 'slicer' && (
        <ProvinceSlicer
          provinces={provinces}
          states={states}
          selectedProvinceId={selectedProvinceId}
          onSelectProvince={(id) => {
            setSelectedProvinceId(id);
            if (id) setSelectedProvinceIds([id]);
          }}
          onApplySlice={handleApplySlice}
          cutLine={cutLine}
          onUpdateCutLine={setCutLine}
        />
      )}

      {activeTab === 'river' && (
        <RiverPencil
          provinces={provinces}
          rivers={rivers}
          onSaveRiver={(r) => {
            setRivers((prev) => [...prev, r]);
            onNotify?.(`Saved 1px river '${r.name}' with zero 2x2 violations!`);
          }}
          onDeleteRiver={(id) => setRivers((prev) => prev.filter((r) => r.id !== id))}
          activeRiverPoints={activeRiverPoints}
          onUpdateActiveRiverPoints={setActiveRiverPoints}
          isDrawingRiver={isDrawingRiver}
          onSetIsDrawingRiver={setIsDrawingRiver}
        />
      )}

      {activeTab === 'pins' && (
        <PositionsPinPlacer
          provinces={provinces}
          states={states}
          pins={pins}
          onSavePins={setPins}
          selectedPinId={selectedPinId}
          onSelectPinId={setSelectedPinId}
          isPlacingPin={isPlacingPin}
          onSetIsPlacingPin={setIsPlacingPin}
          pendingPinType={pendingPinType}
          onSetPendingPinType={setPendingPinType}
        />
      )}

      {activeTab === 'railways' && (
        <RailwayNetworkBuilder
          provinces={provinces}
          railways={railways}
          supplyNodes={supplyNodes}
          onSaveRailways={setRailways}
          onSaveSupplyNodes={setSupplyNodes}
          selectedProvinceId={selectedProvinceId}
          onSelectProvince={(id) => {
            setSelectedProvinceId(id);
            if (id) setSelectedProvinceIds([id]);
          }}
          activeBuildingRailProvinces={activeBuildingRailProvinces}
          onUpdateBuildingRailProvinces={setActiveBuildingRailProvinces}
          isBuildingRail={isBuildingRail}
          onSetIsBuildingRail={setIsBuildingRail}
        />
      )}

      {activeTab === 'linter' && (
        <MapLinter
          provinces={provinces}
          states={states}
          rivers={rivers}
          onAutoFixIssue={handleAutoFixLinterIssue}
          onSelectProvince={(id) => {
            setSelectedProvinceId(id);
            setSelectedProvinceIds([id]);
          }}
        />
      )}

      {/* Main 2D Interactive Canvas Surface */}
      <div className="flex-1 relative h-full w-full overflow-hidden">
        <MapCanvas
          provinces={provinces}
          states={states}
          rivers={rivers}
          railways={railways}
          supplyNodes={supplyNodes}
          pins={pins}
          selectedProvinceId={selectedProvinceId}
          selectedProvinceIds={selectedProvinceIds}
          onSelectProvince={(id) => {
            setSelectedProvinceId(id);
            if (id) {
              if (activeTab === 'states' && selectionMode === 'click') {
                setSelectedProvinceIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                );
              } else {
                setSelectedProvinceIds([id]);
              }
            }
          }}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          activeTool={
            activeTab === 'states' && selectionMode === 'brush'
              ? 'brush'
              : activeTab === 'river' && isDrawingRiver
              ? 'river'
              : 'navigate'
          }
          brushRadius={brushRadius}
          onCanvasPointerDown={handleCanvasPointerDown}
          onCanvasPointerMove={handleCanvasPointerMove}
          overlaySvgElements={overlaySvgElements}
        />
      </div>
    </div>
  );
};
