import React, { useState, useMemo } from 'react';
import type { Province, State, RiverPath, MapLinterIssue } from '../../types/map';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  Search,
} from 'lucide-react';

interface MapLinterProps {
  provinces: Province[];
  states: State[];
  rivers: RiverPath[];
  onAutoFixIssue: (issue: MapLinterIssue) => void;
  onSelectProvince?: (id: number) => void;
}

export function runMapDiagnosticsScan(
  provinces: Province[],
  states: State[],
  rivers: RiverPath[]
): MapLinterIssue[] {
  const issues: MapLinterIssue[] = [];

  // 1. Check Duplicate RGBs
  const rgbMap = new Map<string, number[]>();
  for (const prov of provinces) {
    const key = `${prov.rgb[0]},${prov.rgb[1]},${prov.rgb[2]}`;
    if (!rgbMap.has(key)) {
      rgbMap.set(key, []);
    }
    rgbMap.get(key)!.push(prov.id);
  }

  for (const [key, provIds] of rgbMap.entries()) {
    if (provIds.length > 1) {
      issues.push({
        id: `dup_rgb_${key}`,
        severity: 'error',
        category: 'duplicate_rgb',
        title: `Duplicate RGB Color (${key})`,
        description: `Provinces [${provIds.join(', ')}] share identical RGB color (${key}). Causes CTD in map generation.`,
        location: { provinceId: provIds[1] },
        autoFixable: true,
      });
    }
  }

  // 2. Check Reserved / Rogue RGB Colors
  const isReserved = (r: number, g: number, b: number) => {
    return (
      (r === 0 && g === 0 && b === 0) ||
      (r === 0 && g === 255 && b === 0) ||
      (r === 255 && g === 0 && b === 0) ||
      (r === 255 && g === 252 && b === 0)
    );
  };

  for (const prov of provinces) {
    if (isReserved(prov.rgb[0], prov.rgb[1], prov.rgb[2])) {
      issues.push({
        id: `reserved_rgb_${prov.id}`,
        severity: 'error',
        category: 'rogue_pixel',
        title: `Reserved Paradox Color on Province ${prov.name} (${prov.id})`,
        description: `Province uses reserved color (${prov.rgb.join(', ')}). Reserved for map separators or river markers.`,
        location: { provinceId: prov.id },
        autoFixable: true,
      });
    }
  }

  // 3. Coastal Flag Mismatches
  const seaProvinceIds = new Set(
    provinces.filter((p) => p.type === 'sea').map((p) => p.id)
  );

  for (const prov of provinces) {
    if (prov.type === 'land') {
      const touchesSea = prov.adjacentProvinceIds.some((adjId) =>
        seaProvinceIds.has(adjId)
      );

      if (prov.coastal && !touchesSea) {
        issues.push({
          id: `coastal_mismatch_false_coast_${prov.id}`,
          severity: 'warning',
          category: 'coastal_mismatch',
          title: `False Coastal Flag on ${prov.name} (${prov.id})`,
          description: `Province marked coastal = true, but does not touch any sea province in definition.csv.`,
          location: { provinceId: prov.id },
          autoFixable: true,
        });
      } else if (!prov.coastal && touchesSea) {
        issues.push({
          id: `coastal_mismatch_missing_coast_${prov.id}`,
          severity: 'warning',
          category: 'coastal_mismatch',
          title: `Missing Coastal Flag on ${prov.name} (${prov.id})`,
          description: `Province touches a sea zone, but coastal is set to false in definition.csv.`,
          location: { provinceId: prov.id },
          autoFixable: true,
        });
      }
    }
  }

  // 4. River Bottlenecks & Topological Rules
  for (const river of rivers) {
    if (!river.valid1px || river.violations.length > 0) {
      issues.push({
        id: `river_bottleneck_${river.id}`,
        severity: 'error',
        category: 'river_bottleneck',
        title: `River Violation in '${river.name}'`,
        description: river.violations.join('; ') || 'River contains illegal 2x2 pixel cluster.',
        autoFixable: false,
      });
    }

    if (river.pixels.length < 2) {
      issues.push({
        id: `river_too_short_${river.id}`,
        severity: 'warning',
        category: 'river_bottleneck',
        title: `River '${river.name}' Too Short`,
        description: 'River has fewer than 2 pixels.',
        autoFixable: false,
      });
    }
  }

  // 5. Unassigned Provinces in States
  const assignedProvinceIds = new Set<number>();
  for (const st of states) {
    for (const p of st.provinces) {
      assignedProvinceIds.add(p);
    }
  }

  for (const prov of provinces) {
    if (prov.type === 'land' && !assignedProvinceIds.has(prov.id)) {
      issues.push({
        id: `unassigned_prov_${prov.id}`,
        severity: 'error',
        category: 'unassigned_province',
        title: `Unassigned Province: ${prov.name} (${prov.id})`,
        description: `Land province ${prov.id} is not assigned to any state in history/states/. Causes engine crash.`,
        location: { provinceId: prov.id },
        autoFixable: true,
      });
    }
  }

  return issues;
}

export const MapLinter: React.FC<MapLinterProps> = ({
  provinces,
  states,
  rivers,
  onAutoFixIssue,
  onSelectProvince,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [filterSearch, setFilterSearch] = useState('');

  const issues = useMemo(() => {
    return runMapDiagnosticsScan(provinces, states, rivers);
  }, [provinces, states, rivers]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const healthScore = Math.max(
    0,
    100 - errorCount * 25 - warningCount * 5
  );

  const filteredIssues = issues.filter((issue) => {
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
    if (
      filterSearch &&
      !issue.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
      !issue.description.toLowerCase().includes(filterSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#141a15] text-[#e3e5d9] border-r border-[#30392e] w-80 p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#30392e]">
        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#d6b878]" />
          Low-Level Map Linter
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            healthScore === 100
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : healthScore >= 70
              ? 'bg-amber-950 text-amber-400 border border-amber-800'
              : 'bg-red-950 text-red-400 border border-red-800'
          }`}
        >
          {healthScore}% Health
        </span>
      </div>

      {/* Health Metric Cards */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="p-2.5 rounded bg-[#1a211a] border border-[#30392e]">
          <span className="text-[10px] text-[#909b88] block">Critical Errors</span>
          <span
            className={`text-lg font-black ${
              errorCount > 0 ? 'text-[#bd785c]' : 'text-[#a6bd87]'
            }`}
          >
            {errorCount}
          </span>
        </div>
        <div className="p-2.5 rounded bg-[#1a211a] border border-[#30392e]">
          <span className="text-[10px] text-[#909b88] block">Warnings</span>
          <span
            className={`text-lg font-black ${
              warningCount > 0 ? 'text-[#d6b878]' : 'text-[#a6bd87]'
            }`}
          >
            {warningCount}
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 bg-[#1a211a] border border-[#30392e] rounded px-2.5 py-1.5 text-xs">
          <Search className="h-3.5 w-3.5 text-[#909b88]" />
          <input
            type="text"
            placeholder="Search diagnostics..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="flex-1 bg-transparent text-[#e3e5d9] placeholder-[#909b88] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-1 bg-[#1a211a] p-1 rounded border border-[#30392e] text-xs">
          {(['all', 'error', 'warning'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`py-1 rounded font-semibold capitalize transition ${
                filterSeverity === s
                  ? 'bg-[#d6b878] text-black shadow'
                  : 'text-[#909b88] hover:text-[#e3e5d9]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Issues List */}
      <div className="mt-4 space-y-2 flex-1">
        <label className="text-xs uppercase font-bold text-[#909b88] tracking-wider flex items-center justify-between">
          <span>Diagnostic Findings ({filteredIssues.length})</span>
        </label>

        {filteredIssues.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#a6bd87] space-y-1 bg-[#1a211a] rounded border border-[#30392e]">
            <CheckCircle2 className="h-6 w-6 mx-auto text-[#a6bd87]" />
            <p className="font-bold">Map Integrity Verified Clean</p>
            <p className="text-[10px] text-[#909b88]">
              No duplicate RGBs, rogue pixels, coastal mismatches, or river bottlenecks found.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-2.5 rounded border text-xs space-y-1.5 transition ${
                  issue.severity === 'error'
                    ? 'border-red-900/60 bg-red-950/20'
                    : 'border-amber-900/60 bg-amber-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    {issue.severity === 'error' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-[#bd785c] shrink-0" />
                    ) : (
                      <Info className="h-3.5 w-3.5 text-[#d6b878] shrink-0" />
                    )}
                    <span
                      onClick={() =>
                        issue.location?.provinceId &&
                        onSelectProvince?.(issue.location.provinceId)
                      }
                      className={
                        issue.location?.provinceId
                          ? 'cursor-pointer hover:underline text-[#e3e5d9]'
                          : 'text-[#e3e5d9]'
                      }
                    >
                      {issue.title}
                    </span>
                  </div>

                  {issue.autoFixable && (
                    <button
                      onClick={() => onAutoFixIssue(issue)}
                      title="1-Click Auto-Fix"
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#242d23] border border-[#3b4936] text-[10px] text-[#a6bd87] hover:bg-[#354130] shrink-0"
                    >
                      <Wrench className="h-3 w-3" />
                      Fix
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[#909b88] leading-relaxed">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
