import { validateFlagTga } from './phase5Generators';
import { stripUtf8Bom } from './politicsGenerators';

/**
 * Mod project helpers: a mod is a Map of relative path -> bytes. Provides validation ("problems panel"),
 * ZIP export and ZIP/folder import without any dependency.
 */

export type ModFiles = Map<string, Uint8Array>;

export type ProblemSeverity = 'error' | 'warning' | 'info';

export interface ModProblem {
  severity: ProblemSeverity;
  code: string;
  file: string;
  message: string;
}

const NL = String.fromCharCode(10);
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

export function textFile(content: string): Uint8Array {
  return enc.encode(content);
}

export function readText(files: ModFiles, path: string): string | undefined {
  const b = files.get(path);
  return b ? stripUtf8Bom(b).text : undefined;
}

function stripCommentsAndStrings(src: string): string {
  return src
    .split(NL)
    .map((line) => {
      let out = '';
      let inStr = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inStr = !inStr;
        if (!inStr && ch === '#') break;
        out += inStr ? ' ' : ch;
      }
      return out;
    })
    .join(NL);
}

/** Keys that open a block (`key = {`) at the given brace depth, regardless of indentation style. */
export function keysAtDepth(src: string, depth: number): string[] {
  const clean = stripCommentsAndStrings(src);
  const keys: string[] = [];
  let d = 0;
  let word = '';
  let lastWord = '';
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (/[A-Za-z0-9_.:]/.test(ch)) {
      word += ch;
      continue;
    }
    if (word) {
      lastWord = word;
      word = '';
    }
    if (ch === '=') {
      let j = i + 1;
      while (j < clean.length && /\s/.test(clean[j])) j++;
      if (clean[j] === '{' && d === depth && lastWord) keys.push(lastWord);
    } else if (ch === '{') d++;
    else if (ch === '}') d--;
  }
  return keys;
}

function braceBalance(src: string): number {
  let depth = 0;
  for (const ch of stripCommentsAndStrings(src)) {
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth < 0) return depth;
    }
  }
  return depth;
}

/** Keys defined in a .yml localisation file: ` key:0 "text"`. */
export function parseLocKeys(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(NL)) {
    const m = line.match(/^\s*([A-Za-z0-9_.\-']+):\d*\s+"(.*)"\s*(?:#.*)?$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function languageOf(path: string): string | undefined {
  const m = path.match(/^localisation\/(?:replace\/)?([a-z_]+)\//) ?? path.match(/_l_([a-z_]+)\.yml$/);
  return m?.[1];
}

export interface ValidateOptions {
  /** GFX names defined by the base game. When omitted, references that are not defined in the mod are reported as info. */
  vanillaGfx?: Set<string>;
  /** Languages that must contain every key found in english. Default: none. */
  requiredLanguages?: string[];
}

const LOC_REF = /\b(?:title|desc|name|description|tooltip|text)\s*=\s*([A-Za-z_][A-Za-z0-9_.\-]*)/g;

export function validateModProject(files: ModFiles, options: ValidateOptions = {}): ModProblem[] {
  const problems: ModProblem[] = [];
  const add = (severity: ProblemSeverity, code: string, file: string, message: string) =>
    problems.push({ severity, code, file, message });

  const paths = Array.from(files.keys());
  const isScript = (p: string) => /\.(txt|gui|gfx|asset|mod)$/.test(p);

  // --- descriptor
  const descriptor = readText(files, 'descriptor.mod');
  if (descriptor === undefined) add('error', 'descriptor-missing', 'descriptor.mod', 'descriptor.mod is missing.');
  else {
    if (!/\bname\s*=\s*"[^"]+"/.test(descriptor)) add('error', 'descriptor-name', 'descriptor.mod', 'descriptor.mod has no name.');
    if (!/\bsupported_version\s*=\s*"[^"]+"/.test(descriptor)) add('error', 'descriptor-version', 'descriptor.mod', 'descriptor.mod has no supported_version.');
    if (/^\s*path\s*=/m.test(descriptor)) add('warning', 'descriptor-path', 'descriptor.mod', 'The descriptor inside the mod folder should not contain path=; only the launcher .mod file needs it.');
  }

  // --- syntax and encoding
  for (const p of paths) {
    const bytes = files.get(p)!;
    if (isScript(p)) {
      const text = stripUtf8Bom(bytes).text;
      const depth = braceBalance(text);
      if (depth !== 0) add('error', 'braces', p, depth > 0 ? `${depth} unclosed "{".` : 'A "}" has no matching "{".');
    }
    if (p.endsWith('.yml')) {
      if (!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
        add('error', 'loc-bom', p, 'Localisation files must start with a UTF-8 BOM or the game ignores them.');
      }
      const text = stripUtf8Bom(bytes).text;
      const header = text.split(NL).find((l) => l.trim() && !l.trim().startsWith('#'));
      const lang = languageOf(p);
      if (!header || !/^l_[a-z_]+:\s*$/.test(header.trim())) add('error', 'loc-header', p, 'Missing "l_<language>:" header line.');
      else if (lang && header.trim() !== `l_${lang}:`) add('warning', 'loc-lang', p, `Header ${header.trim()} does not match the folder/file language "${lang}".`);
    }
  }

  // --- collect definitions
  const locByLang = new Map<string, Map<string, string>>();
  const locOrigin = new Map<string, string>();
  for (const p of paths.filter((x) => x.endsWith('.yml'))) {
    const lang = languageOf(p) ?? 'english';
    const keys = parseLocKeys(readText(files, p)!);
    if (!locByLang.has(lang)) locByLang.set(lang, new Map());
    const target = locByLang.get(lang)!;
    for (const [k, v] of keys) {
      const id = `${lang}:${k}`;
      if (locOrigin.has(id) && locOrigin.get(id) !== p) {
        add('warning', 'loc-duplicate', p, `Localisation key "${k}" is also defined in ${locOrigin.get(id)}.`);
      }
      locOrigin.set(id, p);
      target.set(k, v);
    }
  }
  const english = locByLang.get('english') ?? new Map<string, string>();
  const hasLoc = (key: string) => english.has(key) || Array.from(locByLang.values()).some((m) => m.has(key));

  const focusIds = new Map<string, string>();
  const eventIds = new Map<string, string>();
  const ideaIds = new Map<string, string>();
  const characterIds = new Map<string, string>();
  const gfxDefined = new Set<string>();

  for (const p of paths) {
    const text = isScript(p) ? readText(files, p)! : '';
    if (p.startsWith('common/national_focus/')) {
      for (const m of text.matchAll(/(^|[^_A-Za-z0-9])focus\s*=\s*\{[^{}]*?\bid\s*=\s*([A-Za-z0-9_]+)/g)) {
        if (focusIds.has(m[2])) add('error', 'focus-duplicate', p, `Focus id "${m[2]}" is also defined in ${focusIds.get(m[2])}.`);
        focusIds.set(m[2], p);
      }
    }
    if (p.startsWith('events/')) {
      for (const m of text.matchAll(/\b(?:country_event|news_event|state_event|unit_leader_event|operative_leader_event)\s*=\s*\{[^{}]*?\bid\s*=\s*([A-Za-z0-9_.]+)/g)) {
        if (eventIds.has(m[1])) add('error', 'event-duplicate', p, `Event id "${m[1]}" is also defined in ${eventIds.get(m[1])}.`);
        eventIds.set(m[1], p);
      }
    }
    if (p.startsWith('common/ideas/')) {
      // ideas = { <category> = { <idea> = { ... } } }; a few mods add one more `country` level
      for (const id of [...keysAtDepth(text, 2), ...keysAtDepth(text, 3)]) ideaIds.set(id, p);
    }
    if (p.startsWith('common/characters/')) {
      for (const id of keysAtDepth(text, 1)) characterIds.set(id, p);
    }
    if (p.endsWith('.gfx')) {
      for (const m of text.matchAll(/\bname\s*=\s*"?(GFX_[A-Za-z0-9_]+)"?/g)) gfxDefined.add(m[1]);
      for (const m of text.matchAll(/\btexturefile\s*=\s*"([^"]+)"/g)) {
        if (!files.has(m[1].replace(/\\/g, '/'))) add('info', 'gfx-texture', p, `texturefile "${m[1]}" is not in the mod (fine if it is a vanilla texture).`);
      }
    }
  }

  // --- references and localisation
  for (const p of paths) {
    if (!isScript(p) || p.endsWith('.gfx') || p.endsWith('.mod')) continue;
    const text = readText(files, p)!;

    if (p.startsWith('common/national_focus/')) {
      for (const m of text.matchAll(/(?:prerequisite|mutually_exclusive)\s*=\s*\{([^{}]*)\}/g)) {
        for (const r of m[1].matchAll(/\bfocus\s*=\s*([A-Za-z0-9_]+)/g)) {
          if (!focusIds.has(r[1])) add('error', 'focus-ref', p, `Unknown focus "${r[1]}" in prerequisite/mutually_exclusive (not defined in this mod; vanilla focuses are not checked).`);
        }
      }
      for (const id of [...focusIds.keys()].filter((k) => focusIds.get(k) === p)) {
        if (!hasLoc(id)) add('warning', 'loc-missing', p, `Focus "${id}" has no localisation key.`);
      }
    }

    for (const m of text.matchAll(/\b(?:country_event|news_event|state_event)\s*=\s*\{\s*id\s*=\s*([A-Za-z0-9_.]+)/g)) {
      if (!eventIds.has(m[1])) add('warning', 'event-ref', p, `Event "${m[1]}" is fired but not defined in this mod.`);
    }
    for (const m of text.matchAll(/\brecruit_character\s*=\s*([A-Za-z0-9_]+)/g)) {
      if (!characterIds.has(m[1])) add('warning', 'character-ref', p, `Character "${m[1]}" is recruited but not defined in this mod.`);
    }
    for (const m of text.matchAll(/\b(?:add_ideas|add_idea|remove_ideas|remove_idea|swap_ideas)\s*=\s*([A-Za-z0-9_]+)/g)) {
      if (!ideaIds.has(m[1])) add('info', 'idea-ref', p, `Idea "${m[1]}" is not defined in this mod (fine for vanilla ideas).`);
    }

    if (p.startsWith('events/') || p.startsWith('common/decisions/') || p.startsWith('common/ideas/')) {
      const clean = stripCommentsAndStrings(text);
      for (const m of clean.matchAll(LOC_REF)) {
        const key = m[1];
        if (/^(yes|no|always|none)$/.test(key) || /^[a-z_]+$/.test(key) && !key.includes('_')) continue;
        if (!/[A-Z]|\./.test(key) && !key.includes('_')) continue;
        if (!hasLoc(key) && /^(gdr|[A-Za-z]{3}_|[a-z]+\.\d+)/.test(key)) add('warning', 'loc-missing', p, `Localisation key "${key}" is not defined in any .yml.`);
      }
    }

    // GFX references
    for (const m of text.matchAll(/\bGFX_[A-Za-z0-9_]+/g)) {
      const name = m[0];
      if (gfxDefined.has(name)) continue;
      if (options.vanillaGfx) {
        if (!options.vanillaGfx.has(name)) add('error', 'gfx-missing', p, `Sprite "${name}" is not defined by the base game or this mod.`);
      }
    }
  }
  if (!options.vanillaGfx) {
    const refs = new Set<string>();
    for (const p of paths) {
      if (!isScript(p) || p.endsWith('.gfx')) continue;
      for (const m of readText(files, p)!.matchAll(/\bGFX_[A-Za-z0-9_]+/g)) if (!gfxDefined.has(m[0])) refs.add(m[0]);
    }
    if (refs.size > 0) add('info', 'gfx-unchecked', '(project)', `${refs.size} GFX_ references are not defined in the mod; load your game's interface folder to check them against vanilla.`);
  }

  // --- flags
  for (const p of paths.filter((x) => x.startsWith('gfx/flags/') && x.endsWith('.tga'))) {
    const kind = p.startsWith('gfx/flags/medium/') ? 'medium' : p.startsWith('gfx/flags/small/') ? 'small' : 'standard';
    const r = validateFlagTga(files.get(p)!, kind);
    if (!r.valid) add('error', 'flag-tga', p, r.error ?? 'Invalid flag TGA.');
  }

  // --- content that needs a vanilla GUI file edited
  const guiText = paths.filter((x) => x.endsWith('.gui')).map((x) => readText(files, x) ?? '').join('\n');
  const techFiles = paths.filter((x) => x.startsWith('common/technologies/') && x.endsWith('.txt'));
  if (techFiles.length > 0 && !/gridboxtype/i.test(guiText)) {
    add('warning', 'tech-gridbox', techFiles[0], 'Custom technologies are placed by a gridbox in countrytechtreeview.gui; without one the game logs "Found no grid box for tech". Use the Custom Research Folder tool.');
  }
  for (const rf of paths.filter((x) => x.startsWith('common/resources/') && x.endsWith('.txt'))) {
    for (const id of keysAtDepth(readText(files, rf) ?? '', 1)) {
      if (!guiText.includes(id + '_checkbox')) add('warning', 'resource-checkbox', rf, `Resource "${id}" has no "${id}_checkbox" in a production gui; the game logs an error when the production screen opens.`);
    }
  }

  // --- vanilla singleton overrides (the classic way to break a whole game)
  const singletons = ['map/definition.csv', 'map/provinces.bmp', 'map/rivers.bmp', 'map/railways.txt', 'map/supply_nodes.txt', 'common/countries/colors.txt'];
  for (const s of singletons) {
    if (files.has(s)) add('warning', 'vanilla-singleton', s, 'This file replaces a vanilla file wholesale. A partial copy breaks every province/country not in it.');
  }

  // --- translations
  for (const lang of options.requiredLanguages ?? []) {
    const other = locByLang.get(lang) ?? new Map<string, string>();
    const missing = [...english.keys()].filter((k) => !other.has(k));
    if (missing.length > 0) add('warning', 'loc-untranslated', `localisation/${lang}`, `${missing.length} english keys have no ${lang} entry (first: ${missing.slice(0, 3).join(', ')}).`);
  }

  return problems;
}

export function summarizeProblems(problems: ModProblem[]): { errors: number; warnings: number; infos: number } {
  return {
    errors: problems.filter((p) => p.severity === 'error').length,
    warnings: problems.filter((p) => p.severity === 'warning').length,
    infos: problems.filter((p) => p.severity === 'info').length,
  };
}

// ---------------------------------------------------------------------------
// ZIP (store method) writer
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function createZip(files: ModFiles, rootFolder?: string): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];
  const u32 = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
  const dosTime = 0;
  const dosDate = (1 << 5) | 1 | ((2026 - 1980) << 9); // 2026-01-01

  for (const [rawPath, data] of [...files.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const path = rootFolder ? `${rootFolder}/${rawPath}` : rawPath;
    const name = enc.encode(path);
    const crc = crc32(data);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
    ]);
    parts.push(local, name, data);
    central.push(
      new Uint8Array([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ]),
      name
    );
    offset += local.length + name.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.size), ...u16(files.size),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// ZIP reader (stored + deflate) for importing an existing mod
// ---------------------------------------------------------------------------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZip(zip: Uint8Array): Promise<ModFiles> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a ZIP file (end of central directory not found).');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files: ModFiles = new Map();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Corrupt ZIP central directory.');
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = zip.subarray(start, start + compSize);
    if (method === 0) files.set(name, raw.slice());
    else if (method === 8) files.set(name, await inflateRaw(raw));
    else throw new Error(`Unsupported ZIP compression method ${method} for ${name}.`);
  }
  return files;
}

/** Drop a single common top-level folder (e.g. "my_mod/") that wraps the whole project. */
export function stripCommonRoot(files: ModFiles): ModFiles {
  const tops = new Set([...files.keys()].map((k) => k.split('/')[0]));
  const hasRootFiles = [...files.keys()].some((k) => !k.includes('/'));
  if (tops.size !== 1 || hasRootFiles) return files;
  const root = [...tops][0] + '/';
  const out: ModFiles = new Map();
  for (const [k, v] of files) out.set(k.slice(root.length), v);
  return out;
}

/** Folder import: `<input webkitdirectory>` gives File objects with webkitRelativePath. */
export async function filesFromFileList(list: FileList | File[]): Promise<ModFiles> {
  const out: ModFiles = new Map();
  for (const f of Array.from(list)) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    out.set(rel, new Uint8Array(await f.arrayBuffer()));
  }
  return stripCommonRoot(out);
}

export interface ImportReport {
  files: ModFiles;
  notes: string[];
}

/** Import notes mirror what a user needs to know: which files are binary/unsupported for editing. */
export function describeImport(files: ModFiles): string[] {
  const notes: string[] = [];
  const count = (re: RegExp) => [...files.keys()].filter((k) => re.test(k)).length;
  notes.push(`${files.size} files imported.`);
  const focus = count(/^common\/national_focus\/.*\.txt$/);
  if (focus) notes.push(`${focus} focus tree file(s) can be opened in the Focus Tree Studio.`);
  const map = count(/^map\//);
  if (map) notes.push(`${map} map file(s) are kept as-is and re-exported untouched; the suite does not edit them.`);
  const binary = count(/\.(dds|tga|png|ogg|wav|bmp|mesh|anim|asset)$/i);
  if (binary) notes.push(`${binary} binary asset(s) are preserved byte-for-byte.`);
  if (!files.has('descriptor.mod')) notes.push('No descriptor.mod found: add one before exporting.');
  return notes;
}
