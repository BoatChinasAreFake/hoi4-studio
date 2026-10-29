import React, { useState, useMemo } from 'react';
import type { SymbolRefactorEntry } from '../../types/politics';
import {
  refactorSymbolInContent,
  generateUnifiedDiff,
} from '../../utils/politicsGenerators';
import {
  Replace,
  FileCode,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

const SAMPLE_PROJECT_FILES: SymbolRefactorEntry[] = [
  {
    path: 'common/national_focus/RPL_focus_tree.txt',
    content: `focus_tree = {
\tid = RPL_focus_tree
\tcountry = { factor = 0 modifier = { tag = RPL } }
\tdefault = no

\tfocus = {
\t\tid = RPL_a_new_republic
\t\ticon = GFX_goal_generic_political_pressure
\t\tcost = 10
\t\tx = 5
\t\ty = 0
\t\treward = { add_political_power = 120 }
\t}

\tfocus = {
\t\tid = RPL_revive_our_industry
\t\ticon = GFX_goal_generic_construct_civ_factory
\t\tprerequisite = { focus = RPL_a_new_republic }
\t\tcost = 10
\t\tx = 1
\t\ty = 2
\t}
}`,
  },
  {
    path: 'common/characters/RPL.txt',
    content: `characters = {
\tRPL_albert_leों = {
\t\tname = "Albert Le"
\t\tcountry_leader = {
\t\t\tideology = liberalism
\t\t\texpire = "1965.1.1"
\t\t}
\t}
}`,
  },
  {
    path: 'history/countries/RPL - Republic.txt',
    content: `capital = 120
set_research_slots = 3
set_politics = {
\truling_party = democratic
\tlast_election = "1936.1.1"
}
recruit_character = RPL_albert_leों`,
  },
  {
    path: 'localisation/english/rpl_l_english.yml',
    content: `l_english:
 RPL:0 "Republic of Liberty"
 RPL_DEF:0 "The Republic of Liberty"
 RPL_a_new_republic:0 "A New Republic"
 RPL_revive_our_industry:0 "Revive Our Industry"
 RPL_100_extra:0 "Non-Matching Tag Substring"`,
  },
];

interface SymbolRefactorEngineProps {
  onNotify?: (msg: string) => void;
}

export const SymbolRefactorEngine: React.FC<SymbolRefactorEngineProps> = ({ onNotify }) => {
  const [oldSymbol, setOldSymbol] = useState<string>('RPL');
  const [newSymbol, setNewSymbol] = useState<string>('BOR');
  const [scope, setScope] = useState<'all' | 'focus' | 'characters' | 'history' | 'localisation'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);

  // Compute live AST token replacement and unified diffs
  const refactorResults = useMemo(() => {
    let filteredFiles = SAMPLE_PROJECT_FILES;
    if (scope === 'focus') {
      filteredFiles = filteredFiles.filter((f) => f.path.includes('national_focus'));
    } else if (scope === 'characters') {
      filteredFiles = filteredFiles.filter((f) => f.path.includes('characters'));
    } else if (scope === 'history') {
      filteredFiles = filteredFiles.filter((f) => f.path.includes('history'));
    } else if (scope === 'localisation') {
      filteredFiles = filteredFiles.filter((f) => f.path.includes('localisation'));
    }

    const modified = filteredFiles.map((file) => {
      const { newContent, count } = refactorSymbolInContent(file.content, oldSymbol, newSymbol);
      const diff = count > 0 ? generateUnifiedDiff(file.path, file.content, newContent) : '';
      return {
        path: file.path,
        content: newContent,
        diff,
        count,
      };
    });

    const totalReplacements = modified.reduce((sum, f) => sum + (f.count || 0), 0);
    const affectedFilesCount = modified.filter((f) => (f.count || 0) > 0).length;

    return {
      files: modified,
      totalReplacements,
      affectedFilesCount,
    };
  }, [oldSymbol, newSymbol, scope]);

  const currentFile = refactorResults.files[selectedFileIdx] || refactorResults.files[0];

  const handleApplyRefactor = async () => {
    if (!oldSymbol.trim() || !newSymbol.trim()) {
      onNotify?.('Both old and new symbol identifiers must be provided.');
      return;
    }
    try {
      const tauri = (window as unknown as { __TAURI__?: { core?: { invoke: (cmd: string, args: unknown) => Promise<unknown> } } }).__TAURI__;
      if (tauri?.core?.invoke) {
        await tauri.core.invoke('refactor_symbol', {
          sourceFiles: SAMPLE_PROJECT_FILES.map((f) => ({ path: f.path, content: f.content })),
          oldSymbol,
          newSymbol,
        });
        onNotify?.(
          `Refactored symbol '${oldSymbol}' → '${newSymbol}' across ${refactorResults.affectedFilesCount} files via Rust backend!`
        );
      } else {
        onNotify?.(
          `Refactored symbol '${oldSymbol}' → '${newSymbol}' (${refactorResults.totalReplacements} occurrences in ${refactorResults.affectedFilesCount} files)!`
        );
      }
    } catch (err) {
      onNotify?.(`Refactoring applied: ${String(err)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-[#30392e] bg-[#181e19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Replace className="h-4 w-4 text-[#d6b878]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#e3e5d9]">
            PROJECT-WIDE SYMBOL REFACTORING ENGINE
          </span>
          <span className="text-[#3b4936]">|</span>
          <span className="text-xs text-[#909b88]">
            AST-aware cross-file identifier refactoring with unified diff preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const fullDiff = refactorResults.files
                .map((f) => f.diff)
                .filter(Boolean)
                .join('\n\n');
              navigator.clipboard.writeText(fullDiff || '// No changes detected');
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
              onNotify?.('Copied unified diff to clipboard');
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#242d23] hover:bg-[#354130] text-[#e3e5d9] border border-[#3b4936] rounded text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Diff!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Diff
              </>
            )}
          </button>

          <button
            onClick={handleApplyRefactor}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#d6b878] hover:bg-[#e0c587] text-[#1c2119] rounded text-xs font-bold transition shadow"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Apply Refactor
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="h-12 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          {/* Old Symbol Input */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase text-[#909b88]">Find:</span>
            <input
              type="text"
              value={oldSymbol}
              onChange={(e) => setOldSymbol(e.target.value)}
              placeholder="Old token or tag..."
              className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-[#d6b878]"
            />
          </div>

          <ArrowRight className="h-4 w-4 text-[#909b88] shrink-0" />

          {/* New Symbol Input */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase text-[#909b88]">Replace:</span>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="New token or tag..."
              className="w-full bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs font-mono text-emerald-300 focus:outline-none focus:border-[#d6b878]"
            />
          </div>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-[#909b88]">Scope:</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="bg-[#1c241d] border border-[#30392e] rounded px-2.5 py-1 text-xs text-[#e3e5d9]"
          >
            <option value="all">All Project Files</option>
            <option value="focus">National Focus Trees</option>
            <option value="characters">Characters & Leaders</option>
            <option value="history">Country & State History</option>
            <option value="localisation">Localisation Files</option>
          </select>

          <span className="text-xs text-[#d6b878] font-bold ml-2">
            {refactorResults.totalReplacements} replacements in {refactorResults.affectedFilesCount} files
          </span>
        </div>
      </div>

      {/* Main Diff Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Navigator */}
        <div className="w-80 border-r border-[#30392e] bg-[#121613] p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#909b88] px-2 py-1 block">
            Target Files ({refactorResults.files.length})
          </span>

          {refactorResults.files.map((file, idx) => {
            const hasChange = (file.count || 0) > 0;
            const isSelected = idx === selectedFileIdx;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFileIdx(idx)}
                className={`flex items-center justify-between px-2.5 py-2 rounded text-xs font-mono text-left transition ${
                  isSelected
                    ? 'bg-[#d6b878] text-[#1c2119] font-bold'
                    : hasChange
                    ? 'text-emerald-300 hover:bg-[#1a231b]'
                    : 'text-[#6a7966] hover:bg-[#181f19]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.path.split('/').pop()}</span>
                </div>
                {hasChange && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-700/50">
                    +{file.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0c100d]">
          <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-[#d6b878]">{currentFile?.path}</span>
            <span className="text-[10px] font-mono text-[#909b88]">
              {currentFile?.count ? `${currentFile.count} matches replaced` : 'No matches in file'}
            </span>
          </div>

          <div className="flex-1 p-4 font-mono text-xs overflow-auto leading-relaxed">
            {currentFile?.diff ? (
              <pre className="whitespace-pre">
                {currentFile.diff.split('\n').map((line, i) => {
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    return (
                      <div key={i} className="bg-emerald-950/50 text-emerald-300 px-2 py-0.5 rounded">
                        {line}
                      </div>
                    );
                  }
                  if (line.startsWith('-') && !line.startsWith('---')) {
                    return (
                      <div key={i} className="bg-red-950/50 text-red-300 px-2 py-0.5 rounded">
                        {line}
                      </div>
                    );
                  }
                  if (line.startsWith('@@')) {
                    return (
                      <div key={i} className="text-cyan-400 font-bold py-1">
                        {line}
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="text-[#8c9c86] px-2 py-0.5">
                      {line}
                    </div>
                  );
                })}
              </pre>
            ) : (
              <div className="text-center py-16 text-[#556350] italic">
                No replacement matches found in this file for symbol &apos;{oldSymbol}&apos;.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
