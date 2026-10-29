import React, { useState, useMemo } from 'react';
import type { Province, Railway, SupplyNode } from '../../types/map';
import {
  TrainTrack,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  FileText,
  Navigation,
  Copy,
  Check,
} from 'lucide-react';

interface RailwayNetworkBuilderProps {
  provinces: Province[];
  railways: Railway[];
  supplyNodes: SupplyNode[];
  onSaveRailways: (railways: Railway[]) => void;
  onSaveSupplyNodes: (nodes: SupplyNode[]) => void;
  selectedProvinceId: number | null;
  onSelectProvince: (id: number | null) => void;
  activeBuildingRailProvinces: number[];
  onUpdateBuildingRailProvinces: (provs: number[]) => void;
  isBuildingRail: boolean;
  onSetIsBuildingRail: (building: boolean) => void;
}

export interface SupplyConnectivityResult {
  capitalProvinceId: number;
  connectedSupplyNodes: number[];
  disconnectedSupplyNodes: number[];
  allReachableProvinces: Set<number>;
}

// Breadth-First Search (BFS) to verify unbroken supply connectivity to the capital province
export function verifySupplyConnectivity(
  capitalProv: number,
  railways: Railway[],
  supplyNodes: SupplyNode[]
): SupplyConnectivityResult {
  const adj = new Map<number, number[]>();

  for (const rail of railways) {
    for (let i = 0; i < rail.provinces.length - 1; i++) {
      const u = rail.provinces[i];
      const v = rail.provinces[i + 1];

      if (!adj.has(u)) adj.set(u, []);
      if (!adj.has(v)) adj.set(v, []);

      adj.get(u)!.push(v);
      adj.get(v)!.push(u);
    }
  }

  const reachable = new Set<number>();
  const queue: number[] = [capitalProv];
  reachable.add(capitalProv);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current) || [];
    for (const next of neighbors) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  const connected: number[] = [];
  const disconnected: number[] = [];

  for (const node of supplyNodes) {
    if (reachable.has(node.provinceId)) {
      connected.push(node.provinceId);
    } else {
      disconnected.push(node.provinceId);
    }
  }

  return {
    capitalProvinceId: capitalProv,
    connectedSupplyNodes: connected,
    disconnectedSupplyNodes: disconnected,
    allReachableProvinces: reachable,
  };
}

export function generateRailwaysTxt(railways: Railway[]): string {
  return railways
    .map((r) => `${r.level} ${r.provinces.length} ${r.provinces.join(' ')}`)
    .join('\n');
}

export function generateSupplyNodesTxt(supplyNodes: SupplyNode[]): string {
  return supplyNodes.map((n) => `${n.level} ${n.provinceId}`).join('\n');
}

export const RailwayNetworkBuilder: React.FC<RailwayNetworkBuilderProps> = ({
  provinces,
  railways,
  supplyNodes,
  onSaveRailways,
  onSaveSupplyNodes,
  selectedProvinceId,
  onSelectProvince: _onSelectProvince,
  activeBuildingRailProvinces,
  onUpdateBuildingRailProvinces,
  isBuildingRail,
  onSetIsBuildingRail,
}) => {
  // Designated capital province for supply network checks
  const [capitalProvinceId, setCapitalProvinceId] = useState<number>(
    provinces[0]?.id || 101
  );

  const [railLevel, setRailLevel] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [viewingFile, setViewingFile] = useState<'railways' | 'supply_nodes' | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute BFS supply connectivity report
  const connectivity = useMemo(() => {
    return verifySupplyConnectivity(capitalProvinceId, railways, supplyNodes);
  }, [capitalProvinceId, railways, supplyNodes]);

  // Supply node toggling on selected province
  const isSelectedProvSupplyNode = supplyNodes.some(
    (n) => n.provinceId === selectedProvinceId
  );

  const handleToggleSupplyNode = () => {
    if (!selectedProvinceId) return;
    if (isSelectedProvSupplyNode) {
      onSaveSupplyNodes(supplyNodes.filter((n) => n.provinceId !== selectedProvinceId));
    } else {
      onSaveSupplyNodes([
        ...supplyNodes,
        { id: `node_${selectedProvinceId}`, provinceId: selectedProvinceId, level: 2 },
      ]);
    }
  };

  const handleCommitRail = () => {
    if (activeBuildingRailProvinces.length < 2) return;

    const newRail: Railway = {
      id: `rail_${Date.now()}`,
      level: railLevel,
      provinces: activeBuildingRailProvinces,
    };

    onSaveRailways([...railways, newRail]);
    onUpdateBuildingRailProvinces([]);
    onSetIsBuildingRail(false);
  };

  const handleDeleteRail = (id: string) => {
    onSaveRailways(railways.filter((r) => r.id !== id));
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
          <TrainTrack className="h-4 w-4 text-[#d1a742]" />
          Railway & Supply Builder
        </span>
        <button
          onClick={() => {
            onSetIsBuildingRail(!isBuildingRail);
            if (!isBuildingRail) {
              onUpdateBuildingRailProvinces([]);
            }
          }}
          className={`px-2.5 py-1 rounded text-xs font-bold transition ${
            isBuildingRail
              ? 'bg-[#d1a742] text-black shadow'
              : 'bg-[#242d23] border border-[#3b4936] text-[#e3e5d9] hover:bg-[#354130]'
          }`}
        >
          {isBuildingRail ? 'Stop Track' : 'Draw Track'}
        </button>
      </div>

      {/* Capital Province Selector */}
      <div className="mt-3 space-y-1.5">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider block">
          National Capital Supply Hub
        </label>
        <select
          value={capitalProvinceId}
          onChange={(e) => setCapitalProvinceId(Number(e.target.value))}
          className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9]"
        >
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (ID: {p.id})
            </option>
          ))}
        </select>
      </div>

      {/* BFS Pathfinder Diagnostics Box */}
      <div className="mt-4 p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#e3e5d9] flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-sky-400" />
            Supply Chain Connectivity
          </span>
          <span className="text-[10px] text-[#909b88]">BFS Pathfinder</span>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#a6bd87] flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected Hubs:
          </span>
          <span className="font-bold text-[#a6bd87]">
            {connectivity.connectedSupplyNodes.length} / {supplyNodes.length}
          </span>
        </div>

        {connectivity.disconnectedSupplyNodes.length > 0 && (
          <div className="p-2 rounded bg-red-950/40 border border-red-800/60 text-[11px] text-red-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {connectivity.disconnectedSupplyNodes.length} Hub(s) Disconnected from Capital!
            </div>
            <p className="text-[10px] text-red-400/90">
              Broken railway route to: [
              {connectivity.disconnectedSupplyNodes
                .map((id) => provinces.find((p) => p.id === id)?.name || id)
                .join(', ')}
              ]
            </p>
          </div>
        )}
      </div>

      {/* Active Track Drawer */}
      {isBuildingRail && (
        <div className="mt-4 p-3 rounded bg-[#1f281e] border border-[#d1a742]/50 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#d1a742]">
              Track In Progress ({activeBuildingRailProvinces.length} provs)
            </span>
            <button
              onClick={() => onUpdateBuildingRailProvinces([])}
              className="text-[10px] text-[#bd785c] hover:underline"
            >
              Clear
            </button>
          </div>

          <div>
            <label className="text-[10px] text-[#909b88] block mb-1">
              Railway Level (1 to 5)
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setRailLevel(lvl as 1 | 2 | 3 | 4 | 5)}
                  className={`py-1 rounded text-xs font-bold transition ${
                    railLevel === lvl
                      ? 'bg-[#d1a742] text-black'
                      : 'bg-[#181e19] text-[#909b88] hover:text-[#e3e5d9]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[#909b88]">
            Click provinces sequentially on the map canvas to lay track segments.
          </div>

          <button
            onClick={handleCommitRail}
            disabled={activeBuildingRailProvinces.length < 2}
            className="w-full flex items-center justify-center gap-1.5 rounded bg-[#d1a742] py-1.5 text-xs font-bold text-black hover:bg-[#e0be5b] disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Finish & Save Track
          </button>
        </div>
      )}

      {/* Selected Province Hub Action */}
      {selectedProvinceId && (
        <div className="mt-4 p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#909b88]">Selected:</span>
            <span className="font-bold text-[#e3e5d9]">
              {provinces.find((p) => p.id === selectedProvinceId)?.name} ({selectedProvinceId})
            </span>
          </div>

          <button
            onClick={handleToggleSupplyNode}
            className={`w-full flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold border transition ${
              isSelectedProvSupplyNode
                ? 'border-red-800 bg-red-950/40 text-red-300 hover:bg-red-900/60'
                : 'border-[#3b4936] bg-[#242d23] text-[#a6bd87] hover:bg-[#354130]'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            {isSelectedProvSupplyNode ? 'Remove Supply Hub' : 'Place Supply Hub'}
          </button>
        </div>
      )}

      {/* Existing Railways List */}
      <div className="mt-4 space-y-2 flex-1">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider flex items-center justify-between">
          <span>Active Railways ({railways.length})</span>
          <span className="text-[10px] text-[#717c6a]">map/railways.txt</span>
        </label>

        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {railways.map((rail) => (
            <div
              key={rail.id}
              className="flex items-center justify-between p-2 rounded bg-[#1a211a] border border-[#30392e] text-xs hover:border-[#46543f]"
            >
              <div>
                <span className="font-semibold text-[#e3e5d9]">
                  Lvl {rail.level} Line ({rail.provinces.length} stops)
                </span>
                <div className="text-[10px] text-[#909b88]">
                  {rail.provinces
                    .map((pId) => provinces.find((p) => p.id === pId)?.name || pId)
                    .join(' → ')}
                </div>
              </div>

              <button
                onClick={() => handleDeleteRail(rail.id)}
                className="p-1 rounded bg-[#242d23] border border-[#3b4936] text-[#bd785c] hover:bg-[#354130]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Code Export Buttons */}
      <div className="mt-4 pt-3 border-t border-[#30392e] grid grid-cols-2 gap-2">
        <button
          onClick={() => setViewingFile('railways')}
          className="flex items-center justify-center gap-1.5 rounded bg-[#242d23] border border-[#3b4936] py-1.5 text-xs text-[#d1a742] hover:bg-[#354130]"
        >
          <FileText className="h-3.5 w-3.5" />
          railways.txt
        </button>
        <button
          onClick={() => setViewingFile('supply_nodes')}
          className="flex items-center justify-center gap-1.5 rounded bg-[#242d23] border border-[#3b4936] py-1.5 text-xs text-[#a6bd87] hover:bg-[#354130]"
        >
          <FileText className="h-3.5 w-3.5" />
          supply_nodes.txt
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
                    viewingFile === 'railways'
                      ? generateRailwaysTxt(railways)
                      : generateSupplyNodesTxt(supplyNodes)
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs text-[#d1a742] hover:bg-[#354130]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="max-h-96 overflow-y-auto p-3 rounded bg-[#101411] border border-[#2b3529] font-mono text-xs text-[#a6bd87] whitespace-pre">
              {viewingFile === 'railways'
                ? generateRailwaysTxt(railways)
                : generateSupplyNodesTxt(supplyNodes)}
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
