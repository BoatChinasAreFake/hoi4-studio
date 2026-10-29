import React, { useState } from 'react';
import type { Province, State, StateCategory } from '../../types/map';
import {
  Paintbrush,
  Lasso,
  MousePointer,
  Undo2,
  Redo2,
  PlusCircle,
  FileCode,
  Check,
  Trash2,
  Copy,
} from 'lucide-react';

interface StateReassignmentToolProps {
  provinces: Province[];
  states: State[];
  selectedProvinceIds: number[];
  onSelectProvinces: (ids: number[]) => void;
  onUpdateStates: (newStates: State[], updatedProvinces: Province[]) => void;
  activeSelectionMode: 'click' | 'brush' | 'lasso';
  onChangeSelectionMode: (mode: 'click' | 'brush' | 'lasso') => void;
  brushRadius: number;
  onChangeBrushRadius: (r: number) => void;
}

export function generateStateFileClausewitz(state: State): string {
  const vpLines = state.victoryPoints
    .map((vp) => `        victory_points = { ${vp.provinceId} ${vp.points} }`)
    .join('\n');

  const coreLines = state.cores
    .map((c) => `        add_core_of = ${c}`)
    .join('\n');

  const buildingsEntries: string[] = [];
  if (state.buildings.infrastructure) {
    buildingsEntries.push(`            infrastructure = ${state.buildings.infrastructure}`);
  }
  if (state.buildings.industrial_complex) {
    buildingsEntries.push(`            industrial_complex = ${state.buildings.industrial_complex}`);
  }
  if (state.buildings.arms_factory) {
    buildingsEntries.push(`            arms_factory = ${state.buildings.arms_factory}`);
  }
  if (state.buildings.air_base) {
    buildingsEntries.push(`            air_base = ${state.buildings.air_base}`);
  }
  if (state.buildings.naval_bases) {
    for (const [pId, lvl] of Object.entries(state.buildings.naval_bases)) {
      buildingsEntries.push(`            ${pId} = { naval_base = ${lvl} }`);
    }
  }

  const buildingsBlock =
    buildingsEntries.length > 0
      ? `        buildings = {\n${buildingsEntries.join('\n')}\n        }`
      : '        buildings = { }';

  return `state = {
    id = ${state.id}
    name = "STATE_${state.id}"
    manpower = ${state.manpower}
    state_category = ${state.category}

    history = {
        owner = ${state.owner}
${vpLines ? vpLines + '\n' : ''}${coreLines ? coreLines + '\n' : ''}${buildingsBlock}
    }

    provinces = {
        ${state.provinces.join(' ')}
    }
    local_supplies = 0.0
}`;
}

export const StateReassignmentTool: React.FC<StateReassignmentToolProps> = ({
  provinces,
  states,
  selectedProvinceIds,
  onSelectProvinces,
  onUpdateStates,
  activeSelectionMode,
  onChangeSelectionMode,
  brushRadius,
  onChangeBrushRadius,
}) => {
  // Undo / Redo history for state reassignments
  const [history, setHistory] = useState<{ states: State[]; provinces: Province[] }[]>([]);
  const [future, setFuture] = useState<{ states: State[]; provinces: Province[] }[]>([]);

  // Selected target state to reassign to
  const [targetStateId, setTargetStateId] = useState<number | ''>(
    states.length > 0 ? states[0].id : ''
  );

  // New State Wizard Modal
  const [isNewStateModalOpen, setIsNewStateModalOpen] = useState(false);
  const [newStateName, setNewStateName] = useState('New Custom State');
  const [newStateOwner, setNewStateOwner] = useState('FRA');
  const [newStateCategory, setNewStateCategory] = useState<StateCategory>('town');
  const [newStateManpower, setNewStateManpower] = useState(250000);

  // Preview generated Clausewitz code modal
  const [viewingStateCode, setViewingStateCode] = useState<State | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Push snapshot for undo
  const pushHistory = () => {
    setHistory((prev) => [...prev, { states: [...states], provinces: [...provinces] }]);
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((f) => [{ states, provinces }, ...f]);
    setHistory((h) => h.slice(0, -1));
    onUpdateStates(previous.states, previous.provinces);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, { states, provinces }]);
    setFuture((f) => f.slice(1));
    onUpdateStates(next.states, next.provinces);
  };

  // Reassign selected provinces to targetStateId
  const handleApplyReassignment = () => {
    if (selectedProvinceIds.length === 0 || targetStateId === '') return;

    pushHistory();

    const selectedSet = new Set(selectedProvinceIds);

    // 1. Remove selected provinces from all other states
    const updatedStates = states.map((s) => {
      if (s.id === targetStateId) {
        // Add provinces avoiding duplicates
        const mergedProvinces = Array.from(new Set([...s.provinces, ...selectedProvinceIds]));
        return { ...s, provinces: mergedProvinces };
      } else {
        // Remove reallocated provinces
        const filteredProvinces = s.provinces.filter((p) => !selectedSet.has(p));
        return { ...s, provinces: filteredProvinces };
      }
    });

    // 2. Update provinces' stateId references
    const updatedProvinces = provinces.map((p) => {
      if (selectedSet.has(p.id)) {
        return { ...p, stateId: Number(targetStateId) };
      }
      return p;
    });

    onUpdateStates(updatedStates, updatedProvinces);
    onSelectProvinces([]);
  };

  // Create New State from selected provinces
  const handleCreateNewState = () => {
    if (selectedProvinceIds.length === 0) return;

    pushHistory();

    const newId = Math.max(...states.map((s) => s.id), 0) + 1;
    const selectedSet = new Set(selectedProvinceIds);

    const newState: State = {
      id: newId,
      name: newStateName,
      manpower: newStateManpower,
      category: newStateCategory,
      owner: newStateOwner,
      cores: [newStateOwner],
      victoryPoints: [{ provinceId: selectedProvinceIds[0], points: 5 }],
      provinces: [...selectedProvinceIds],
      buildings: {
        infrastructure: 2,
        industrial_complex: 1,
      },
    };

    // Remove from other states
    const updatedStates = states.map((s) => ({
      ...s,
      provinces: s.provinces.filter((p) => !selectedSet.has(p)),
    }));
    updatedStates.push(newState);

    // Update provinces
    const updatedProvinces = provinces.map((p) => {
      if (selectedSet.has(p.id)) {
        return { ...p, stateId: newId };
      }
      return p;
    });

    onUpdateStates(updatedStates, updatedProvinces);
    setIsNewStateModalOpen(false);
    setTargetStateId(newId);
    onSelectProvinces([]);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#141a15] text-[#e3e5d9] border-r border-[#30392e] w-80 p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#30392e]">
        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-[#d6b878]" />
          State Reassignment
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo State Change"
            className="p-1 rounded bg-[#20291e] border border-[#3b4936] text-[#e3e5d9] disabled:opacity-40 hover:bg-[#2c382a]"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={future.length === 0}
            title="Redo State Change"
            className="p-1 rounded bg-[#20291e] border border-[#3b4936] text-[#e3e5d9] disabled:opacity-40 hover:bg-[#2c382a]"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Selection Mode Selector */}
      <div className="mt-4 space-y-2">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider">
          Selection Mode
        </label>
        <div className="grid grid-cols-3 gap-1 bg-[#1a211a] p-1 rounded border border-[#30392e]">
          <button
            onClick={() => onChangeSelectionMode('click')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded text-xs transition ${
              activeSelectionMode === 'click'
                ? 'bg-[#d6b878] text-[#141a15] font-bold shadow'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            <MousePointer className="h-4 w-4" />
            Click
          </button>
          <button
            onClick={() => onChangeSelectionMode('brush')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded text-xs transition ${
              activeSelectionMode === 'brush'
                ? 'bg-[#d6b878] text-[#141a15] font-bold shadow'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            <Paintbrush className="h-4 w-4" />
            Brush
          </button>
          <button
            onClick={() => onChangeSelectionMode('lasso')}
            className={`flex flex-col items-center gap-1 py-1.5 rounded text-xs transition ${
              activeSelectionMode === 'lasso'
                ? 'bg-[#d6b878] text-[#141a15] font-bold shadow'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            <Lasso className="h-4 w-4" />
            Lasso
          </button>
        </div>

        {activeSelectionMode === 'brush' && (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-[#909b88] mb-1">
              <span>Brush Radius</span>
              <span className="text-[#d6b878]">{brushRadius}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={brushRadius}
              onChange={(e) => onChangeBrushRadius(Number(e.target.value))}
              className="w-full accent-[#d6b878]"
            />
          </div>
        )}
      </div>

      {/* Selected Provinces Counter & Actions */}
      <div className="mt-4 p-3 rounded bg-[#1a211a] border border-[#30392e] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#909b88]">Selected Provinces:</span>
          <span className="font-bold text-[#d6b878] text-sm">
            {selectedProvinceIds.length}
          </span>
        </div>

        {selectedProvinceIds.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => onSelectProvinces([])}
              className="flex-1 flex items-center justify-center gap-1 rounded bg-[#242d23] border border-[#3b4936] py-1 text-xs text-[#e3e5d9] hover:bg-[#354130]"
            >
              <Trash2 className="h-3 w-3 text-[#bd785c]" />
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Reassign to Existing State */}
      <div className="mt-4 space-y-2">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider">
          Reassign to Existing State
        </label>
        <select
          value={targetStateId}
          onChange={(e) => setTargetStateId(Number(e.target.value))}
          className="w-full bg-[#1b221b] border border-[#3b4936] rounded px-2.5 py-1.5 text-xs text-[#e3e5d9] focus:outline-none focus:border-[#d6b878]"
        >
          {states.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name} (ID: {st.id}, {st.owner}, {st.provinces.length} provs)
            </option>
          ))}
        </select>

        <button
          onClick={handleApplyReassignment}
          disabled={selectedProvinceIds.length === 0 || targetStateId === ''}
          className="w-full flex items-center justify-center gap-2 rounded bg-[#d6b878] py-2 text-xs font-bold text-[#141a15] hover:bg-[#e0c587] disabled:opacity-40 shadow transition"
        >
          <Check className="h-4 w-4" />
          Assign {selectedProvinceIds.length} Provinces
        </button>

        <button
          onClick={() => setIsNewStateModalOpen(true)}
          disabled={selectedProvinceIds.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded bg-[#242d23] border border-[#3b4936] py-1.5 text-xs font-medium text-[#d6b878] hover:bg-[#2e3a2c] disabled:opacity-40 transition"
        >
          <PlusCircle className="h-4 w-4" />
          Carve Out Into New State...
        </button>
      </div>

      {/* State Files Explorer / Generator */}
      <div className="mt-6 space-y-2 flex-1">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider flex items-center justify-between">
          <span>State Definitions</span>
          <span className="text-[10px] text-[#717c6a]">{states.length} states</span>
        </label>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {states.map((st) => (
            <div
              key={st.id}
              className="flex items-center justify-between p-2 rounded bg-[#1a211a] border border-[#30392e] text-xs hover:border-[#46543f]"
            >
              <div>
                <span className="font-semibold text-[#e3e5d9]">{st.name}</span>
                <div className="text-[10px] text-[#909b88]">
                  ID: {st.id} · {st.owner} · {st.provinces.length} provs
                </div>
              </div>
              <button
                onClick={() => setViewingStateCode(st)}
                title="View Clausewitz State File"
                className="p-1 rounded bg-[#242d23] border border-[#3b4936] text-[#d6b878] hover:bg-[#354130]"
              >
                <FileCode className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: New State Wizard */}
      {isNewStateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-[#526044] bg-[#181e19] p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-[#e3e5d9] flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-[#d6b878]" />
              New State Wizard ({selectedProvinceIds.length} Provinces)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#909b88] block mb-1">State Name</label>
                <input
                  type="text"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  className="w-full bg-[#121613] border border-[#3b4936] rounded px-3 py-1.5 text-[#e3e5d9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#909b88] block mb-1">Owner Tag</label>
                  <input
                    type="text"
                    value={newStateOwner}
                    maxLength={3}
                    onChange={(e) => setNewStateOwner(e.target.value.toUpperCase())}
                    className="w-full bg-[#121613] border border-[#3b4936] rounded px-3 py-1.5 text-[#e3e5d9]"
                  />
                </div>
                <div>
                  <label className="text-[#909b88] block mb-1">Manpower</label>
                  <input
                    type="number"
                    value={newStateManpower}
                    onChange={(e) => setNewStateManpower(Number(e.target.value))}
                    className="w-full bg-[#121613] border border-[#3b4936] rounded px-3 py-1.5 text-[#e3e5d9]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#909b88] block mb-1">Category</label>
                <select
                  value={newStateCategory}
                  onChange={(e) => setNewStateCategory(e.target.value as StateCategory)}
                  className="w-full bg-[#121613] border border-[#3b4936] rounded px-3 py-1.5 text-[#e3e5d9]"
                >
                  <option value="wasteland">Wasteland</option>
                  <option value="enclave">Enclave</option>
                  <option value="tiny_island">Tiny Island</option>
                  <option value="pastoral">Pastoral</option>
                  <option value="rural">Rural</option>
                  <option value="town">Town</option>
                  <option value="large_town">Large Town</option>
                  <option value="city">City</option>
                  <option value="large_city">Large City</option>
                  <option value="metropolis">Metropolis</option>
                  <option value="megalopolis">Megalopolis</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30392e]">
              <button
                onClick={() => setIsNewStateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#242d23] text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewState}
                className="px-4 py-1.5 rounded bg-[#d6b878] text-xs font-bold text-[#141a15] hover:bg-[#e0c587]"
              >
                Create State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Clausewitz State File Code */}
      {viewingStateCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg border border-[#526044] bg-[#181e19] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30392e] pb-2">
              <h3 className="font-bold text-sm text-[#e3e5d9] flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#d6b878]" />
                history/states/{viewingStateCode.id}-{viewingStateCode.name.replace(/\s+/g, '_')}.txt
              </h3>
              <button
                onClick={() => handleCopyCode(generateStateFileClausewitz(viewingStateCode))}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs text-[#d6b878] hover:bg-[#354130]"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="max-h-96 overflow-y-auto p-3 rounded bg-[#101411] border border-[#2b3529] font-mono text-xs text-[#a6bd87] whitespace-pre">
              {generateStateFileClausewitz(viewingStateCode)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingStateCode(null)}
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
