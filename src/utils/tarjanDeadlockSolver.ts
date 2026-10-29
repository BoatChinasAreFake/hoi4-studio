import type { FocusNodeData } from '../types/focus';
import type { DeadlockAnalysisResult } from '../types/simulation';

/**
 * Solves dependency cycles, reachability, and mutual exclusion deadlocks
 * in Hearts of Iron IV national focus trees using Tarjan's Strongly Connected Components (SCC)
 * and transitive reachability analysis.
 */
export function analyzeFocusTreeDeadlocks(focuses: FocusNodeData[]): DeadlockAnalysisResult {
  const focusMap = new Map<string, FocusNodeData>();
  for (const f of focuses) {
    focusMap.set(f.id, f);
  }

  // Build Adjacency List for Directed Prerequisite Graph: Parent -> Children
  // In HOI4: if focus B has prerequisite A, then A enables B (edge A -> B)
  const adj = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>(); // Child -> Parents

  for (const f of focuses) {
    adj.set(f.id, []);
    reverseAdj.set(f.id, []);
  }

  for (const f of focuses) {
    for (const group of f.prerequisites) {
      for (const parentId of group) {
        if (focusMap.has(parentId)) {
          adj.get(parentId)?.push(f.id);
          reverseAdj.get(f.id)?.push(parentId);
        }
      }
    }
  }

  // 1. Tarjan's Strongly Connected Components Algorithm for Cycle Detection
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Map<string, boolean>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(u: string) {
    indices.set(u, index);
    lowlinks.set(u, index);
    index++;
    stack.push(u);
    onStack.set(u, true);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!indices.has(v)) {
        strongConnect(v);
        lowlinks.set(u, Math.min(lowlinks.get(u)!, lowlinks.get(v)!));
      } else if (onStack.get(v)) {
        lowlinks.set(u, Math.min(lowlinks.get(u)!, indices.get(v)!));
      }
    }

    if (lowlinks.get(u) === indices.get(u)) {
      const scc: string[] = [];
      let w = '';
      do {
        w = stack.pop()!;
        onStack.set(w, false);
        scc.push(w);
      } while (w !== u);

      // An SCC is a cycle if it contains more than 1 node, or a self-loop
      if (scc.length > 1 || (scc.length === 1 && (adj.get(scc[0]) || []).includes(scc[0]))) {
        sccs.push(scc);
      }
    }
  }

  for (const f of focuses) {
    if (!indices.has(f.id)) {
      strongConnect(f.id);
    }
  }

  // 2. Identify Roots (Focuses without any valid prerequisite)
  const roots: string[] = [];
  for (const f of focuses) {
    const parents = reverseAdj.get(f.id) || [];
    if (parents.length === 0) {
      roots.push(f.id);
    }
  }

  // 3. Compute Reachability from Roots
  const reachableFromRoots = new Set<string>();
  const queue = [...roots];
  for (const r of roots) {
    reachableFromRoots.add(r);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = adj.get(curr) || [];
    for (const child of children) {
      if (!reachableFromRoots.has(child)) {
        reachableFromRoots.add(child);
        queue.push(child);
      }
    }
  }

  const unreachableFocuses = focuses
    .map((f) => f.id)
    .filter((id) => !reachableFromRoots.has(id));

  // 4. Mutual Exclusion Deadlock Detection
  // Case A: A is mutually exclusive with B, but B requires A as prerequisite (or vice versa)
  // Compute transitive closure of reachability
  const reaches = new Map<string, Set<string>>();
  for (const f of focuses) {
    const visited = new Set<string>();
    const q = [f.id];
    while (q.length > 0) {
      const curr = q.shift()!;
      for (const next of adj.get(curr) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          q.push(next);
        }
      }
    }
    reaches.set(f.id, visited);
  }

  const mutualExclusions: { focusA: string; focusB: string; reason: string }[] = [];
  const processedPairs = new Set<string>();

  for (const f of focuses) {
    for (const exclId of f.mutually_exclusive) {
      const pairKey = [f.id, exclId].sort().join(':::');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      // Check if f transitively reaches exclId
      const fReachesExcl = reaches.get(f.id)?.has(exclId);
      const exclReachesF = reaches.get(exclId)?.has(f.id);

      if (fReachesExcl) {
        mutualExclusions.push({
          focusA: f.id,
          focusB: exclId,
          reason: `Focus '${exclId}' transitively depends on '${f.id}', but is mutually exclusive with it.`,
        });
      } else if (exclReachesF) {
        mutualExclusions.push({
          focusA: f.id,
          focusB: exclId,
          reason: `Focus '${f.id}' transitively depends on '${exclId}', but is mutually exclusive with it.`,
        });
      }

      // Case B: Child focus requires BOTH A and B simultaneously (AND logic), but A and B are mutually exclusive
      for (const child of focuses) {
        // Look into AND prerequisite groups
        for (const group of child.prerequisites) {
          if (group.includes(f.id) && group.includes(exclId)) {
            mutualExclusions.push({
              focusA: f.id,
              focusB: exclId,
              reason: `Focus '${child.id}' requires both '${f.id}' and '${exclId}' in the same prerequisite group, but they are mutually exclusive.`,
            });
          }
        }
      }
    }
  }

  return {
    hasCycles: sccs.length > 0,
    cycles: sccs,
    hasMutualExclusionDeadlocks: mutualExclusions.length > 0,
    mutualExclusions,
    unreachableFocuses,
    independentRoots: roots,
    totalEvaluated: focuses.length,
  };
}
