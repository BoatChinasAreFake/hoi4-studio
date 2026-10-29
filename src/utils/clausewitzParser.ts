import type { FocusTree, FocusNodeData, FocusProject } from '../types/focus';

// ---------------------------------------------------------------------------
// Minimal brace-aware Clausewitz scanner (comment- and string-aware).
// Replaces regex block matching, which broke on space-indented or nested blocks.
// ---------------------------------------------------------------------------

interface Entry {
  key: string;
  start: number; // index of the key
  value?: string; // scalar value, when not a block
  valueStart: number;
  valueEnd: number; // exclusive end of the scalar value
  open?: number; // index of '{' for block values
  close?: number; // index of the matching '}'
}

function skipTrivia(src: string, i: number, end: number): number {
  while (i < end) {
    const c = src[i];
    if (c === '#') {
      while (i < end && src[i] !== '\n') i++;
    } else if (/\s/.test(c)) i++;
    else break;
  }
  return i;
}

function matchBrace(src: string, open: number, end: number): number {
  let depth = 0;
  for (let i = open; i < end; i++) {
    const c = src[i];
    if (c === '#') {
      while (i < end && src[i] !== '\n') i++;
    } else if (c === '"') {
      i++;
      while (i < end && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
    } else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Depth-0 `key = value` / `key = { ... }` entries inside [from, to). */
function topLevelEntries(src: string, from = 0, to = src.length): Entry[] {
  const out: Entry[] = [];
  let i = from;
  while (i < to) {
    i = skipTrivia(src, i, to);
    if (i >= to) break;
    if (src[i] === '{') {
      const m = matchBrace(src, i, to);
      i = m < 0 ? to : m + 1;
      continue;
    }
    if (src[i] === '}') { i++; continue; }
    const start = i;
    if (src[i] === '"') {
      i++;
      while (i < to && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
      i++;
    } else {
      while (i < to && !/[\s={}#"]/.test(src[i])) i++;
    }
    const key = src.slice(start, i).replace(/^"|"$/g, '');
    let j = skipTrivia(src, i, to);
    if (src[j] !== '=') continue; // bare token (list item)
    j = skipTrivia(src, j + 1, to);
    if (src[j] === '{') {
      const close = matchBrace(src, j, to);
      if (close < 0) break;
      out.push({ key, start, valueStart: j, valueEnd: close + 1, open: j, close });
      i = close + 1;
    } else {
      const vs = j;
      if (src[j] === '"') {
        j++;
        while (j < to && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
        j++;
      } else {
        while (j < to && !/[\s{}#]/.test(src[j])) j++;
      }
      out.push({ key, start, value: src.slice(vs, j), valueStart: vs, valueEnd: j });
      i = j;
    }
  }
  return out;
}

const scalar = (es: Entry[], key: string) => es.find((e) => e.key === key && e.value !== undefined)?.value;

function dedent(body: string): string {
  const lines = body.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n').trim();
}

/** Every `focus = { }` block (at any depth) whose own top-level `id` equals focusId. */
function findFocusBlocks(src: string, focusId: string): Entry[] {
  const found: Entry[] = [];
  const walk = (from: number, to: number) => {
    for (const e of topLevelEntries(src, from, to)) {
      if (e.open === undefined) continue;
      if (e.key === 'focus' && scalar(topLevelEntries(src, e.open + 1, e.close!), 'id') === focusId) found.push(e);
      else walk(e.open + 1, e.close!);
    }
  };
  walk(0, src.length);
  return found;
}

/** Replace (or leave untouched if absent) a depth-0 scalar inside one block. */
function setScalarInBlock(src: string, block: Entry, key: string, value: string): string {
  const target = topLevelEntries(src, block.open! + 1, block.close!).find((e) => e.key === key && e.value !== undefined);
  if (!target) return src;
  return src.slice(0, target.valueStart) + value + src.slice(target.valueEnd);
}

function mutateFocus(source: string, focusId: string, key: string, value: string): string {
  // Apply back-to-front so earlier offsets stay valid.
  let out = source;
  for (const b of findFocusBlocks(source, focusId).reverse()) out = setScalarInBlock(out, b, key, value);
  return out;
}

export class ClausewitzFocusParser {
  static parse(content: string): FocusTree[] {
    const trees: FocusTree[] = [];
    for (const t of topLevelEntries(content)) {
      if (t.key !== 'focus_tree' || t.open === undefined) continue;
      const treeEntries = topLevelEntries(content, t.open + 1, t.close!);
      const treeId = scalar(treeEntries, 'id') ?? 'unnamed_tree';
      const focuses: FocusNodeData[] = [];

      for (const fe of treeEntries) {
        if (fe.key !== 'focus' || fe.open === undefined) continue;
        const f = topLevelEntries(content, fe.open + 1, fe.close!);
        const block = (key: string) => f.filter((e) => e.key === key && e.open !== undefined);
        const inner = (e: Entry) => content.slice(e.open! + 1, e.close!);
        const focusRefs = (e: Entry) =>
          topLevelEntries(content, e.open! + 1, e.close!).filter((x) => x.key === 'focus' && x.value).map((x) => x.value!);

        const id = scalar(f, 'id') ?? 'unnamed_focus';
        const icon = scalar(f, 'icon') ?? 'GFX_goal_generic_political_pressure';
        const costRaw = parseFloat(scalar(f, 'cost') ?? '');
        const xRaw = parseInt(scalar(f, 'x') ?? '', 10);
        const yRaw = parseInt(scalar(f, 'y') ?? '', 10);
        const relative_position_id = scalar(f, 'relative_position_id');

        // Each prerequisite block is an AND-term; several focuses inside one block are OR'd.
        const prereqs: string[][] = [];
        let isAnyMode = false;
        for (const pe of block('prerequisite')) {
          const group = focusRefs(pe);
          if (group.length > 1) isAnyMode = true;
          if (group.length > 0) prereqs.push(group);
        }

        const mutuallyExclusive = block('mutually_exclusive').flatMap(focusRefs);

        const availableE = block('available')[0];
        const rewardE = block('completion_reward')[0];
        const aiE = block('ai_will_do')[0];
        const aiFactor = aiE ? parseFloat(scalar(topLevelEntries(content, aiE.open! + 1, aiE.close!), 'factor') ?? '') : NaN;

        // Derive symbol from icon or default
        let symbol = '★';
        if (icon.includes('civ_factory') || icon.includes('production') || icon.includes('industry')) symbol = '⚒';
        else if (icon.includes('army')) symbol = '⚑';
        else if (icon.includes('navy')) symbol = '⚓';
        else if (icon.includes('air')) symbol = '✈';

        const humanName = id.replace(/^[A-Z0-9]{2,4}_/, '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        focuses.push({
          id,
          name: humanName,
          symbol,
          icon,
          cost: Number.isNaN(costRaw) ? 10 : costRaw,
          x: Number.isNaN(xRaw) ? 0 : xRaw,
          y: Number.isNaN(yRaw) ? 0 : yRaw,
          relative_position_id,
          prerequisites: prereqs,
          mutually_exclusive: mutuallyExclusive,
          prereqMode: isAnyMode ? 'any' : 'all',
          available: availableE ? dedent(inner(availableE)) : '',
          reward: rewardE ? dedent(inner(rewardE)) : 'add_political_power = 100',
          ai: Number.isNaN(aiFactor) ? 1 : aiFactor,
          description: '',
          status: 'available',
        });
      }

      trees.push({
        id: treeId,
        default_tree: scalar(treeEntries, 'default') === 'yes',
        focuses,
      });
    }
    return trees;
  }

  static generateScript(project: FocusProject): string {
    let s = `# Hearts of Iron IV - National Focus Tree
focus_tree = {
    id = ${project.treeId}
    country = {
        factor = 0
        modifier = {
            add = 10
            tag = ${project.tag}
        }
    }
    default = no

`;

    for (const n of project.nodes) {
      s += `    focus = {\n`;
      s += `        id = ${n.id}\n`;
      s += `        icon = ${n.icon}\n`;
      s += `        cost = ${n.cost}\n`;
      s += `        x = ${n.x}\n`;
      s += `        y = ${n.y}\n`;
      if (n.relative_position_id) {
        s += `        relative_position_id = ${n.relative_position_id}\n`;
      }

      // Flat list of parent IDs
      const flatParents = n.prerequisites.flat();
      if (flatParents.length > 0) {
        if (n.prereqMode === 'any') {
          s += `        prerequisite = { ${flatParents.map((id) => `focus = ${id}`).join(' ')} }\n`;
        } else {
          for (const parentId of flatParents) {
            s += `        prerequisite = { focus = ${parentId} }\n`;
          }
        }
      }

      if (n.mutually_exclusive.length > 0) {
        s += `        mutually_exclusive = { ${n.mutually_exclusive.map((id) => `focus = ${id}`).join(' ')} }\n`;
      }

      if (n.available && n.available.trim()) {
        const formatted = n.available
          .split('\n')
          .map((line) => `            ${line}`)
          .join('\n');
        s += `        available = {\n${formatted}\n        }\n`;
      }

      if (n.reward && n.reward.trim()) {
        const formatted = n.reward
          .split('\n')
          .map((line) => `            ${line}`)
          .join('\n');
        s += `        completion_reward = {\n${formatted}\n        }\n`;
      }

      if (n.ai !== undefined) {
        s += `        ai_will_do = { factor = ${n.ai} }\n`;
      }

      s += `    }\n\n`;
    }

    s += `}\n`;
    return s;
  }

  static generateLocalization(project: FocusProject): string {
    const escapeLoc = (text: string) => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
    let yml = '\uFEFFl_english:\n';
    for (const n of project.nodes) {
      yml += ` ${n.id}:0 "${escapeLoc(n.name || n.id)}"\n`;
      yml += ` ${n.id}_desc:0 "${escapeLoc(n.description || '')}"\n`;
    }
    return yml;
  }

  static generateGuide(project: FocusProject): string {
    return `INSTALL INTO AN EXISTING HOI4 MOD

1. Place ${project.treeId}.txt in:
   <your mod>/common/national_focus/

2. Place ${project.treeId}_l_english.yml in:
   <your mod>/localisation/english/
   The generated YAML includes the required UTF-8 BOM byte sequence.

3. Ensure country tag ${project.tag} exists in your mod.
   The country selector assigns this tree a priority score of 10 for ${project.tag}.

4. Start HOI4 with your mod enabled and with "-debug" launch option.
   In-game console: type "reload focus" to test changes live.

Tree Details:
- Total Focuses: ${project.nodes.length}
- Country Tag: ${project.tag}
- Tree ID: ${project.treeId}
- Prerequisite rules: Multiple prerequisite blocks = AND; Multiple focuses inside one prerequisite block = OR.
`;
  }

  static validateTree(project: FocusProject): string[] {
    const errors: string[] = [];
    const positions = new Set<string>();
    const ids = new Set<string>();

    if (!project.nodes || project.nodes.length === 0) {
      errors.push('Tree has no focus nodes.');
      return errors;
    }

    if (!/^[A-Za-z0-9_]+$/.test(project.treeId)) {
      errors.push(`Invalid Tree ID: "${project.treeId}". Use letters, numbers, or underscores.`);
    }

    if (!/^[A-Z0-9]{3}$/.test(project.tag)) {
      errors.push(`Invalid Country Tag: "${project.tag}". Must be 3 uppercase alphanumeric characters.`);
    }

    // Check balance of braces in script
    const checkBalanced = (str: string, fieldName: string, focusId: string) => {
      let depth = 0;
      let quote = false;
      let comment = false;
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (comment) {
          if (c === '\n') comment = false;
          continue;
        }
        if (quote) {
          if (c === '"' && str[i - 1] !== '\\') quote = false;
          continue;
        }
        if (c === '#') comment = true;
        else if (c === '"') quote = true;
        else if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth < 0) {
            errors.push(`Unbalanced closing brace in ${focusId} -> ${fieldName}`);
            return;
          }
        }
      }
      if (depth !== 0) errors.push(`Unclosed brace in ${focusId} -> ${fieldName}`);
      if (quote) errors.push(`Unclosed quotation mark in ${focusId} -> ${fieldName}`);
    };

    for (const n of project.nodes) {
      if (!n.id || !/^[A-Za-z0-9_]+$/.test(n.id)) {
        errors.push(`Invalid focus ID "${n.id}". Must be alphanumeric or underscore.`);
      }
      if (ids.has(n.id)) {
        errors.push(`Duplicate focus ID: "${n.id}". IDs must be strictly unique.`);
      }
      ids.add(n.id);

      const posKey = `${n.x},${n.y}`;
      if (positions.has(posKey)) {
        errors.push(`Overlapping coordinates at (${n.x}, ${n.y}) for focus "${n.id}".`);
      }
      positions.add(posKey);

      if (!n.icon.startsWith('GFX_')) {
        errors.push(`Icon for "${n.id}" (${n.icon}) should start with "GFX_".`);
      }

      if (n.reward) checkBalanced(n.reward, 'completion_reward', n.id);
      if (n.available) checkBalanced(n.available, 'available', n.id);

      // Check self-reference
      const flatPrereqs = n.prerequisites.flat();
      if (flatPrereqs.includes(n.id)) {
        errors.push(`Focus "${n.id}" lists itself as a prerequisite.`);
      }
      if (n.mutually_exclusive.includes(n.id)) {
        errors.push(`Focus "${n.id}" lists itself as mutually exclusive.`);
      }
    }

    // Prerequisite Cycle Detection
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const checkCycle = (id: string, path: string[]) => {
      if (visiting.has(id)) {
        errors.push(`Prerequisite cycle detected: ${[...path, id].join(' → ')}`);
        return;
      }
      if (visited.has(id)) return;

      visiting.add(id);
      const node = project.nodes.find((n) => n.id === id);
      if (node) {
        for (const parentId of node.prerequisites.flat()) {
          checkCycle(parentId, [...path, id]);
        }
      }
      visiting.delete(id);
      visited.add(id);
    };

    for (const n of project.nodes) {
      checkCycle(n.id, []);
    }

    return [...new Set(errors)];
  }

  static mutateCoordinates(source: string, focusId: string, newX: number, newY: number): string {
    return mutateFocus(mutateFocus(source, focusId, 'x', String(newX)), focusId, 'y', String(newY));
  }

  static mutateCost(source: string, focusId: string, newCost: number): string {
    return mutateFocus(source, focusId, 'cost', String(newCost));
  }

  static mutateIcon(source: string, focusId: string, newIcon: string): string {
    return mutateFocus(source, focusId, 'icon', newIcon);
  }

  static renameSymbol(source: string, oldId: string, newId: string): string {
    const regex = new RegExp(`(?<![A-Za-z0-9_])${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`, 'g');
    return source.replace(regex, newId);
  }
}
