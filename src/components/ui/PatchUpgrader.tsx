import React, { useState, useMemo } from 'react';
import type { PatchDiffBlock } from '../../types/ui';
import {
  migrateDeprecatedScript,
  computeProvinceDiff,
  realignModProvinces,
} from '../../utils/phase5Generators';
import {
  GitMerge,
  CheckCircle2,
  Sparkles,
  Wrench,
  Copy,
} from 'lucide-react';

interface PatchUpgraderProps {
  onNotify?: (msg: string) => void;
}

// Sample blocks illustrating 3-way merge scenarios
export const INITIAL_DIFF_BLOCKS: PatchDiffBlock[] = [
  {
    id: 'FRA_devalue_franc',
    blockType: 'focus',
    status: 'conflict',
    baseContent: `focus = {\n\tid = FRA_devalue_franc\n\tcost = 10\n\treward = {\n\t\tadd_political_power = 50\n\t}\n}`,
    vanillaContent: `focus = {\n\tid = FRA_devalue_franc\n\tcost = 14 # Rebalanced in vanilla 1.14\n\treward = {\n\t\tadd_political_power = 75\n\t\tadd_stability = -0.05\n\t}\n}`,
    modContent: `focus = {\n\tid = FRA_devalue_franc\n\tcost = 8 # Mod custom buff\n\treward = {\n\t\tadd_political_power = 100\n\t}\n}`,
    mergedContent: `# CONFLICT IN FRA_devalue_franc\n# Please choose: Take Mod or Take Upstream Update`,
    description: 'Both upstream vanilla and user mod modified focus parameters.',
  },
  {
    id: 'FRA_maginot_extension',
    blockType: 'focus',
    status: 'upstream_modified',
    baseContent: `focus = {\n\tid = FRA_maginot_extension\n\tcost = 10\n}`,
    vanillaContent: `focus = {\n\tid = FRA_maginot_extension\n\tcost = 12\n\tprerequisite = { focus = FRA_defensive_focus }\n}`,
    modContent: `focus = {\n\tid = FRA_maginot_extension\n\tcost = 10\n}`,
    mergedContent: `focus = {\n\tid = FRA_maginot_extension\n\tcost = 12\n\tprerequisite = { focus = FRA_defensive_focus }\n}`,
    description: 'Upstream vanilla update added prerequisite. Safe to auto-merge.',
  },
  {
    id: 'FRA_peoples_militia',
    blockType: 'focus',
    status: 'mod_custom',
    baseContent: undefined,
    vanillaContent: undefined,
    modContent: `focus = {\n\tid = FRA_peoples_militia\n\ticon = GFX_goal_generic_special_forces\n\tcost = 10\n}`,
    mergedContent: `focus = {\n\tid = FRA_peoples_militia\n\ticon = GFX_goal_generic_special_forces\n\tcost = 10\n}`,
    description: 'Mod custom focus tree branch. Preserved cleanly.',
  },
  {
    id: 'FRA_reorganize_railways',
    blockType: 'focus',
    status: 'clean',
    baseContent: `focus = {\n\tid = FRA_reorganize_railways\n\tcost = 10\n}`,
    vanillaContent: `focus = {\n\tid = FRA_reorganize_railways\n\tcost = 10\n}`,
    modContent: `focus = {\n\tid = FRA_reorganize_railways\n\tcost = 10\n}`,
    mergedContent: `focus = {\n\tid = FRA_reorganize_railways\n\tcost = 10\n}`,
    description: 'Identical across all versions.',
  },
];

const DEFAULT_OLD_DEF_CSV = `0;0;0;0;land;false;unknown;0\n3838;120;40;60;land;false;plains;1\n9851;150;50;70;land;false;hills;1\n11804;180;60;80;land;false;mountain;1\n`;
const DEFAULT_NEW_DEF_CSV = `0;0;0;0;land;false;unknown;0\n3840;120;40;60;land;false;plains;1\n9851;150;50;70;land;false;hills;1\n11804;180;60;80;land;false;mountain;1\n`;

export const PatchUpgrader: React.FC<PatchUpgraderProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'3way_diff' | 'deprecations' | 'provinces'>('3way_diff');
  const [diffBlocks, setDiffBlocks] = useState<PatchDiffBlock[]>(INITIAL_DIFF_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('FRA_devalue_franc');

  // Deprecator state
  const [deprecationScript, setDeprecationScript] = useState(`create_country_leader = {
\tname = "Maurice Thorez"
\tdesc = "POLITICS_MAURICE_THOREZ_DESC"
\tpicture = "gfx/leaders/FRA/portrait_maurice_thorez.dds"
\texpire = "1965.1.1"
\tideology = marxism
\ttraits = { staunch_stalinist }
}

trigger = {
\tis_in_faction = yes
\tis_puppet = yes
\tcan_create_factions = yes
\thas_dlc = "Man the Guns"
}`);

  const [migratedScript, setMigratedScript] = useState('');
  const [migrationCount, setMigrationCount] = useState(0);

  // Province realignment state
  const [oldDefinitionCsv, setOldDefinitionCsv] = useState(DEFAULT_OLD_DEF_CSV);
  const [newDefinitionCsv, setNewDefinitionCsv] = useState(DEFAULT_NEW_DEF_CSV);
  const [sampleModStateScript, setSampleModStateScript] = useState(`state = {
\tid = 1
\tname = "Corsica"
\tprovinces = { 3838 9851 11804 }
\thistory = {
\t\towner = FRA
\t\tvictory_points = { 3838 1 }
\t\t3838 = { naval_base = 3 }
\t}
}`);
  const [realignedScript, setRealignedScript] = useState('');
  const [realignedCount, setRealignedCount] = useState(0);

  const activeBlock = useMemo(
    () => diffBlocks.find((b) => b.id === selectedBlockId) || diffBlocks[0],
    [diffBlocks, selectedBlockId]
  );

  const conflictCount = useMemo(
    () => diffBlocks.filter((b) => b.status === 'conflict').length,
    [diffBlocks]
  );

  // Conflict resolution actions
  const handleResolveConflict = (blockId: string, choice: 'mod' | 'vanilla' | 'custom') => {
    setDiffBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const mergedContent =
          choice === 'mod'
            ? b.modContent
            : choice === 'vanilla'
            ? b.vanillaContent
            : b.mergedContent;
        return {
          ...b,
          status: 'clean',
          mergedContent,
          description: `Resolved conflict by choosing ${choice === 'mod' ? 'Mod version' : 'Vanilla update'}.`,
        };
      })
    );
    onNotify?.(`Resolved conflict for ${blockId}`);
  };

  // Run Deprecation Migrator
  const handleMigrateDeprecations = async () => {
    try {
      const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: (cmd: string, args: unknown) => Promise<any> } } }).__TAURI__;
      if (tauri?.core?.invoke) {
        const res = await tauri.core.invoke('migrate_deprecated_triggers', { script: deprecationScript });
        setMigratedScript(res.migrated_content);
        setMigrationCount(res.total_migrations);
      } else {
        const report = migrateDeprecatedScript(deprecationScript);
        setMigratedScript(report.migratedContent);
        setMigrationCount(report.totalMigrations);
      }
      onNotify?.(`Migrated deprecated syntax blocks to modern HOI4 format!`);
    } catch (err) {
      onNotify?.(`Migration error: ${String(err)}`);
    }
  };

  // Run Province Realignment
  const handleRealignProvinces = async () => {
    try {
      const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: (cmd: string, args: unknown) => Promise<any> } } }).__TAURI__;
      if (tauri?.core?.invoke) {
        const res = await tauri.core.invoke('realign_provinces', {
          oldDefCsv: oldDefinitionCsv,
          newDefCsv: newDefinitionCsv,
          modScript: sampleModStateScript,
        });
        setRealignedScript(res.modified_script);
        setRealignedCount(res.replacements_count);
      } else {
        const diff = computeProvinceDiff(oldDefinitionCsv, newDefinitionCsv);
        const res = realignModProvinces(sampleModStateScript, diff.shiftedMap);
        setRealignedScript(res.modifiedScript);
        setRealignedCount(res.replacementsCount);
      }
      onNotify?.(`Re-aligned shifted provinces dynamically!`);
    } catch (err) {
      onNotify?.(`Realignment error: ${String(err)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden">
      {/* Top Header & Mode Switcher */}
      <div className="border-b border-[#30392e] bg-[#141a15] px-4 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#1e271c] border border-[#3b4936]">
            <GitMerge className="h-5 w-5 text-[#d6b878]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#e3e5d9] flex items-center gap-2">
              Vanilla Patch & Version Upgrader
              {conflictCount > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold border border-rose-800">
                  {conflictCount} Conflicts Detected
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20281e] text-[#a6bd87] font-bold border border-[#3b4936]">
                  All Merged & Clean
                </span>
              )}
            </h2>
            <p className="text-xs text-[#909b88]">
              3-way upstream AST diffing, automated trigger deprecation migrator, and map province ID re-alignment.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#181e19] p-1 rounded border border-[#30392e]">
          <button
            onClick={() => setActiveTab('3way_diff')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              activeTab === '3way_diff'
                ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            3-Way AST Merge
          </button>
          <button
            onClick={() => setActiveTab('deprecations')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              activeTab === 'deprecations'
                ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            Trigger Deprecator
          </button>
          <button
            onClick={() => setActiveTab('provinces')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              activeTab === 'provinces'
                ? 'bg-[#d6b878] text-[#1c2119] font-bold shadow'
                : 'text-[#909b88] hover:text-[#e3e5d9]'
            }`}
          >
            Province Re-Aligner
          </button>
        </div>
      </div>

      {/* Mode 1: 3-Way AST Merge */}
      {activeTab === '3way_diff' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Block List */}
          <div className="w-72 border-r border-[#30392e] bg-[#131814] flex flex-col overflow-y-auto select-none">
            <div className="p-3 border-b border-[#2d372c] bg-[#141a15] text-xs font-bold text-[#909b88] uppercase tracking-wider">
              Scanned Script Blocks ({diffBlocks.length})
            </div>

            <div className="p-2 space-y-1">
              {diffBlocks.map((block) => {
                const isSelected = block.id === selectedBlockId;
                return (
                  <button
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`w-full text-left p-2.5 rounded border transition flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-[#232c21] border-[#d6b878]'
                        : 'bg-[#181f19] border-[#293226] hover:bg-[#1e271c]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#e3e5d9] truncate">
                        {block.id}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                          block.status === 'conflict'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : block.status === 'upstream_modified'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : block.status === 'mod_custom'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-[#20281e] text-[#a6bd87] border border-[#3b4936]'
                        }`}
                      >
                        {block.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#909b88] line-clamp-1">
                      {block.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Diff Workspace */}
          {activeBlock && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#101512]">
              {/* Conflict Action Header */}
              {activeBlock.status === 'conflict' && (
                <div className="p-3 bg-rose-950/40 border-b border-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <span>Merge Conflict Detected: Both mod and upstream updated this block.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveConflict(activeBlock.id, 'mod')}
                      className="px-2.5 py-1 rounded text-xs font-bold bg-[#293625] text-[#d6b878] hover:bg-[#32422d] border border-[#44583d]"
                    >
                      Keep Mod Version
                    </button>
                    <button
                      onClick={() => handleResolveConflict(activeBlock.id, 'vanilla')}
                      className="px-2.5 py-1 rounded text-xs font-bold bg-[#293625] text-amber-400 hover:bg-[#32422d] border border-[#44583d]"
                    >
                      Accept Upstream Vanilla
                    </button>
                  </div>
                </div>
              )}

              {/* 3-Way Columns */}
              <div className="flex-1 grid grid-cols-3 divide-x divide-[#30392e] overflow-hidden">
                {/* Column 1: Base Vanilla */}
                <div className="flex flex-col overflow-hidden bg-[#141a15]">
                  <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-[#909b88] flex items-center justify-between">
                    <span>Base Vanilla (Previous)</span>
                    <span className="text-[10px] text-[#717b6a]">Common Ancestor</span>
                  </div>
                  <pre className="flex-1 p-3 font-mono text-xs text-[#909b88] overflow-auto leading-relaxed bg-[#121613]">
                    {activeBlock.baseContent || '# Not present in base version'}
                  </pre>
                </div>

                {/* Column 2: Upstream Paradox Update */}
                <div className="flex flex-col overflow-hidden bg-[#141a15]">
                  <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-amber-400 flex items-center justify-between">
                    <span>Updated Vanilla (New Patch)</span>
                    <span className="text-[10px] text-amber-600 font-mono">v1.14</span>
                  </div>
                  <pre className="flex-1 p-3 font-mono text-xs text-amber-200 overflow-auto leading-relaxed bg-[#171612]">
                    {activeBlock.vanillaContent || '# Deleted in new vanilla update'}
                  </pre>
                </div>

                {/* Column 3: User Mod Script */}
                <div className="flex flex-col overflow-hidden bg-[#141a15]">
                  <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-sky-400 flex items-center justify-between">
                    <span>User Mod Script</span>
                    <span className="text-[10px] text-sky-600 font-mono">Custom</span>
                  </div>
                  <pre className="flex-1 p-3 font-mono text-xs text-sky-200 overflow-auto leading-relaxed bg-[#121719]">
                    {activeBlock.modContent || '# Deleted in user mod'}
                  </pre>
                </div>
              </div>

              {/* Merged Result Bottom Bar */}
              <div className="h-44 border-t border-[#30392e] bg-[#121713] flex flex-col">
                <div className="px-3 py-1.5 border-b border-[#2d372c] bg-[#161c17] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#a6bd87]" />
                    <span className="text-xs font-bold text-[#e3e5d9]">Merged Script Output</span>
                  </div>
                  <button
                    onClick={() => {
                      if (activeBlock.mergedContent) {
                        navigator.clipboard?.writeText(activeBlock.mergedContent);
                        onNotify?.('Copied merged script to clipboard!');
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#909b88] hover:text-[#d6b878]"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <pre className="flex-1 p-3 font-mono text-xs text-[#a6bd87] overflow-auto leading-relaxed">
                  {activeBlock.mergedContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Trigger Deprecation Migrator */}
      {activeTab === 'deprecations' && (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          <div className="bg-[#181e19] border border-[#30392e] rounded p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#e3e5d9]">Deprecated Paradox Syntax Migrator</h3>
              <p className="text-xs text-[#909b88] mt-0.5">
                Automatically translates legacy Clausewitz triggers, effects, and leaders into modern 1.11+ / 1.14+ formats.
              </p>
            </div>
            <button
              onClick={handleMigrateDeprecations}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold bg-[#d6b878] text-[#1c2119] hover:bg-[#e0c587] transition shadow"
            >
              <Sparkles className="h-4 w-4" /> Run Syntax Migrator
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Input Legacy Script */}
            <div className="flex flex-col bg-[#141a15] border border-[#30392e] rounded overflow-hidden">
              <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-amber-400">
                Legacy Script (Pre-1.11 / Deprecated Triggers)
              </div>
              <textarea
                value={deprecationScript}
                onChange={(e) => setDeprecationScript(e.target.value)}
                className="flex-1 p-3 bg-transparent font-mono text-xs text-[#e3e5d9] focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Migrated Output Script */}
            <div className="flex flex-col bg-[#141a15] border border-[#30392e] rounded overflow-hidden">
              <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-emerald-400 flex items-center justify-between">
                <span>Modernized HOI4 Output</span>
                {migrationCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
                    {migrationCount} Patterns Migrated
                  </span>
                )}
              </div>
              <pre className="flex-1 p-3 font-mono text-xs text-emerald-300 overflow-auto leading-relaxed bg-[#111913]">
                {migratedScript || '# Click "Run Syntax Migrator" to generate modernized syntax.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Province Realignment Engine */}
      {activeTab === 'provinces' && (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          <div className="bg-[#181e19] border border-[#30392e] rounded p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#e3e5d9]">Map Province ID Re-Alignment Engine</h3>
              <p className="text-xs text-[#909b88] mt-0.5">
                Diffs old vs new <code className="font-mono text-[#a6bd87]">map/definition.csv</code> and remaps shifted province IDs in mod files with word-boundary safety.
              </p>
            </div>
            <button
              onClick={handleRealignProvinces}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold bg-[#d6b878] text-[#1c2119] hover:bg-[#e0c587] transition shadow"
            >
              <Wrench className="h-4 w-4" /> Remap Shifted Province IDs
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col bg-[#141a15] border border-[#30392e] rounded overflow-hidden">
              <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-[#909b88]">
                Old map/definition.csv (Reference Vanilla)
              </div>
              <textarea
                value={oldDefinitionCsv}
                onChange={(e) => setOldDefinitionCsv(e.target.value)}
                className="h-24 p-3 bg-transparent font-mono text-xs text-[#e3e5d9] focus:outline-none resize-none leading-relaxed"
              />
            </div>
            <div className="flex flex-col bg-[#141a15] border border-[#30392e] rounded overflow-hidden">
              <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-amber-400">
                New map/definition.csv (Updated Patch)
              </div>
              <textarea
                value={newDefinitionCsv}
                onChange={(e) => setNewDefinitionCsv(e.target.value)}
                className="h-24 p-3 bg-transparent font-mono text-xs text-[#e3e5d9] focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="flex flex-col bg-[#141a15] border border-[#30392e] rounded overflow-hidden">
              <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-[#909b88]">
                Mod State Script to Realign
              </div>
              <textarea
                value={sampleModStateScript}
                onChange={(e) => setSampleModStateScript(e.target.value)}
                className="flex-1 p-3 bg-transparent font-mono text-xs text-[#e3e5d9] focus:outline-none resize-none leading-relaxed min-h-[140px]"
              />
            </div>

            <div className="flex flex-col bg-[#141a15] border border-[#30392e] rounded overflow-hidden">
              <div className="p-2 border-b border-[#2d372c] bg-[#181e19] text-xs font-bold text-sky-400 flex items-center justify-between">
                <span>Re-Aligned Output Script</span>
                {realignedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono">
                    {realignedCount} IDs Remapped
                  </span>
                )}
              </div>
              <pre className="flex-1 p-3 font-mono text-xs text-sky-300 overflow-auto leading-relaxed bg-[#11161d] min-h-[140px]">
                {realignedScript || '# Click "Remap Shifted Province IDs" to execute realignment.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
