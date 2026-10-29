/**
 * Catalog of effects, triggers and modifiers read from the game's own `documentation/` folder
 * (effects_documentation.md, triggers_documentation.md, modifiers_documentation.md).
 * The catalog is built on the user's machine from their install and is not shipped with the suite.
 */

export type CatalogKind = 'effect' | 'trigger' | 'modifier';

export interface CatalogEntry {
  name: string;
  kind: CatalogKind;
  /** Scopes the entry works in, e.g. COUNTRY, STATE. For modifiers this is the modifier group (country, army...). */
  scopes: string[];
  targets: string[];
  doc: string;
}

const NL = String.fromCharCode(10);
const FENCE = String.fromCharCode(96).repeat(3);

function splitList(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== 'none');
}

/** Parse effects_documentation.md / triggers_documentation.md: `## name`, `* Supported Scopes:`, fenced description. */
export function parseEffectOrTriggerDocs(md: string, kind: 'effect' | 'trigger'): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const lines = md.split(NL);
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].match(/^## ([a-z_][A-Za-z0-9_:.]*)\s*$/);
    if (!head) continue;
    let scopes: string[] = [];
    let targets: string[] = [];
    const doc: string[] = [];
    let inFence = false;
    let j = i + 1;
    for (; j < lines.length && !lines[j].startsWith('## '); j++) {
      const l = lines[j];
      const s = l.match(/^\* Supported Scopes:\s*(.*)$/);
      const t = l.match(/^\* Supported Targets:\s*(.*)$/);
      if (s) scopes = splitList(s[1]);
      else if (t) targets = splitList(t[1]);
      else if (l.trim().startsWith(FENCE)) inFence = !inFence;
      else if (inFence || (l.trim() && !l.startsWith('*'))) doc.push(l);
    }
    out.push({ name: head[1], kind, scopes, targets, doc: doc.join(NL).trim() });
    i = j - 1;
  }
  return out;
}

/** Parse modifiers_documentation.md: `## Modifiers for scope X` followed by a bullet list of names. */
export function parseModifierDocs(md: string): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  let group = '';
  for (const line of md.split(NL)) {
    const g = line.match(/^## Modifiers for scope ([a-z_]+)/);
    if (g) {
      group = g[1];
      continue;
    }
    const m = line.match(/^\* \[([a-z_][A-Za-z0-9_]*)\]/);
    if (m && group) out.push({ name: m[1], kind: 'modifier', scopes: [group], targets: [], doc: `Modifier (${group}).` });
  }
  return out;
}

export function buildCatalog(docs: { effects?: string; triggers?: string; modifiers?: string }): CatalogEntry[] {
  return [
    ...(docs.effects ? parseEffectOrTriggerDocs(docs.effects, 'effect') : []),
    ...(docs.triggers ? parseEffectOrTriggerDocs(docs.triggers, 'trigger') : []),
    ...(docs.modifiers ? parseModifierDocs(docs.modifiers) : []),
  ];
}

export function searchCatalog(catalog: CatalogEntry[], query: string, kind?: CatalogKind, limit = 50): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  const pool = kind ? catalog.filter((e) => e.kind === kind) : catalog;
  if (!q) return pool.slice(0, limit);
  const words = q.split(/\s+/);
  const scored: Array<[number, CatalogEntry]> = [];
  for (const e of pool) {
    const name = e.name.toLowerCase();
    const doc = e.doc.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (name === w) score += 100;
      else if (name.startsWith(w)) score += 40;
      else if (name.includes(w)) score += 20;
      else if (doc.includes(w)) score += 5;
      else {
        score = -1;
        break;
      }
    }
    if (score > 0) scored.push([score, e]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length).slice(0, limit).map((s) => s[1]);
}

/** Hover text for a word under the cursor. */
export function describeEntry(entry: CatalogEntry): string {
  const scope = entry.scopes.length > 0 ? `Scopes: ${entry.scopes.join(', ')}` : '';
  const target = entry.targets.length > 0 ? `Targets: ${entry.targets.join(', ')}` : '';
  return [`**${entry.name}** (${entry.kind})`, scope, target, entry.doc].filter(Boolean).join(NL + NL);
}

/** Cheap structural lint used by the script editor: brace balance, `=` spacing and unknown top-level words. */
export interface ScriptDiagnostic {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export function lintScript(text: string, catalog?: CatalogEntry[]): ScriptDiagnostic[] {
  const diags: ScriptDiagnostic[] = [];
  const known = catalog ? new Set(catalog.map((e) => e.name)) : undefined;
  let depth = 0;
  const lines = text.split(NL);
  lines.forEach((raw, idx) => {
    let line = '';
    let inStr = false;
    for (const ch of raw) {
      if (ch === '"') inStr = !inStr;
      if (!inStr && ch === '#') break;
      line += inStr ? ' ' : ch;
    }
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth < 0) {
          diags.push({ line: idx + 1, message: 'Unmatched "}".', severity: 'error' });
          depth = 0;
        }
      }
    }
    if (known) {
      for (const m of line.matchAll(/\b([a-z][a-z0-9_]{3,})\s*=\s*(?:\{|[^\s{}]+)/g)) {
        const word = m[1];
        if (!known.has(word) && /^(add|set|remove|has|is|can|every|any|random|clr|create|give|send|start|end|transfer|annex|declare)_/.test(word)) {
          diags.push({ line: idx + 1, message: `"${word}" is not a known effect or trigger in the loaded documentation.`, severity: 'warning' });
        }
      }
    }
  });
  if (depth > 0) diags.push({ line: lines.length, message: `${depth} unclosed "{".`, severity: 'error' });
  return diags;
}
