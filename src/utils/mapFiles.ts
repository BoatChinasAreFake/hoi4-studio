/**
 * Map file tools: 8-bit BMP heightmap/terrain editing with undoable brushes, strategic regions, supply areas
 * and adjacencies (straits/canals).
 *
 * Every function takes the COMPLETE vanilla text/bytes you start from and returns a complete file. HOI4 replaces
 * single files such as map/adjacencies.csv or heightmap.bmp wholesale, so a partial file removes everything that
 * is not in it. Never write a result back unless it was derived from the full vanilla file.
 */

const NL = String.fromCharCode(10);

// ---------------------------------------------------------------------------
// 8-bit indexed BMP
// ---------------------------------------------------------------------------

export interface Bmp8 {
  width: number;
  height: number;
  /** Everything before the pixel data (file header, info header, palette), kept so the file round-trips exactly. */
  header: Uint8Array;
  /** Pixel indices, top row first, width * height bytes. */
  pixels: Uint8Array;
}

export function parseBmp8(bytes: Uint8Array): Bmp8 {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) throw new Error('Not a BMP file.');
  const offset = view.getUint32(10, true);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  if (bpp !== 8 || compression !== 0) throw new Error(`Expected an uncompressed 8-bit BMP, got ${bpp}-bit (compression ${compression}).`);
  const height = Math.abs(rawHeight);
  const bottomUp = rawHeight > 0;
  const rowSize = Math.ceil(width / 4) * 4;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const srcRow = bottomUp ? height - 1 - y : y;
    pixels.set(bytes.subarray(offset + srcRow * rowSize, offset + srcRow * rowSize + width), y * width);
  }
  return { width, height, header: bytes.slice(0, offset), pixels };
}

export function serializeBmp8(bmp: Bmp8): Uint8Array {
  const view = new DataView(bmp.header.buffer, bmp.header.byteOffset, bmp.header.byteLength);
  const rawHeight = view.getInt32(22, true);
  const bottomUp = rawHeight > 0;
  const rowSize = Math.ceil(bmp.width / 4) * 4;
  const out = new Uint8Array(bmp.header.length + rowSize * bmp.height);
  out.set(bmp.header, 0);
  for (let y = 0; y < bmp.height; y++) {
    const dstRow = bottomUp ? bmp.height - 1 - y : y;
    out.set(bmp.pixels.subarray(y * bmp.width, (y + 1) * bmp.width), bmp.header.length + dstRow * rowSize);
  }
  return out;
}

export type BrushMode = 'raise' | 'lower' | 'level' | 'smooth' | 'paint';

export interface Brush {
  x: number;
  y: number;
  radius: number;
  mode: BrushMode;
  /** raise/lower: amount per stroke; level/paint: target value (0-255). */
  value: number;
  /** 0-1 falloff softness for raise/lower/smooth. Default 0.5. */
  softness?: number;
}

/** Changed pixels as [index, previousValue] pairs so a stroke can be undone. */
export type Delta = Array<[number, number]>;

export function applyBrush(bmp: Bmp8, brush: Brush): Delta {
  const delta: Delta = [];
  const r = Math.max(1, Math.round(brush.radius));
  const soft = brush.softness ?? 0.5;
  const { width, height, pixels } = bmp;
  // Smoothing reads neighbours that the same stroke is changing, so it works from a copy of just the brush area.
  const x0 = Math.max(0, brush.x - r - 1), x1 = Math.min(width - 1, brush.x + r + 1);
  const y0 = Math.max(0, brush.y - r - 1), y1 = Math.min(height - 1, brush.y + r + 1);
  const areaW = x1 - x0 + 1;
  let area: Uint8Array | undefined;
  if (brush.mode === 'smooth' && x1 >= x0 && y1 >= y0) {
    area = new Uint8Array(areaW * (y1 - y0 + 1));
    for (let yy = y0; yy <= y1; yy++) area.set(pixels.subarray(yy * width + x0, yy * width + x1 + 1), (yy - y0) * areaW);
  }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  for (let dy = -r; dy <= r; dy++) {
    const py = brush.y + dy;
    if (py < 0 || py >= height) continue;
    for (let dx = -r; dx <= r; dx++) {
      const px = brush.x + dx;
      if (px < 0 || px >= width) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) continue;
      const falloff = 1 - soft * (dist / r);
      const i = py * width + px;
      const old = pixels[i];
      let next = old;
      switch (brush.mode) {
        case 'raise': next = clamp(old + brush.value * falloff); break;
        case 'lower': next = clamp(old - brush.value * falloff); break;
        case 'level': next = clamp(old + (brush.value - old) * falloff); break;
        case 'paint': next = clamp(brush.value); break;
        case 'smooth': {
          let sum = 0, n = 0;
          for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) {
            const ny = py + sy, nx = px + sx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) { sum += area![(ny - y0) * areaW + (nx - x0)]; n++; }
          }
          next = clamp(old + (sum / n - old) * falloff);
          break;
        }
      }
      if (next !== old) {
        delta.push([i, old]);
        pixels[i] = next;
      }
    }
  }
  return delta;
}

export function undoDelta(bmp: Bmp8, delta: Delta): void {
  for (let k = delta.length - 1; k >= 0; k--) bmp.pixels[delta[k][0]] = delta[k][1];
}

// ---------------------------------------------------------------------------
// Strategic regions: map/strategicregions/<id>-<name>.txt
// ---------------------------------------------------------------------------

export type TextFiles = Map<string, string>;

const PROVINCES_BLOCK = /provinces\s*=\s*\{([^{}]*)\}/;

function parseIds(body: string): number[] {
  return body.split(/\s+/).filter(Boolean).map(Number).filter((n) => !Number.isNaN(n));
}

export function regionProvinces(text: string): number[] {
  const m = text.match(PROVINCES_BLOCK);
  return m ? parseIds(m[1]) : [];
}

export function regionId(text: string): number | undefined {
  const m = text.match(/\bid\s*=\s*(\d+)/);
  return m ? Number(m[1]) : undefined;
}

function setRegionProvinces(text: string, ids: number[]): string {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const body = NL + '\t\t' + sorted.join(' ') + ' ' + NL + '\t';
  return PROVINCES_BLOCK.test(text) ? text.replace(PROVINCES_BLOCK, () => `provinces={${body}}`) : text;
}

/**
 * Move provinces into the strategic region with id `toId`. They are removed from whichever region holds them,
 * keeping every province in exactly one region (a province in two regions, or in none, is a load error).
 * Returns a new map containing only the files that changed.
 */
export function moveProvincesToRegion(regions: TextFiles, provinceIds: number[], toId: number): TextFiles {
  const moving = new Set(provinceIds);
  const changed: TextFiles = new Map();
  let targetPath: string | undefined;
  for (const [path, text] of regions) {
    if (regionId(text) === toId) targetPath = path;
  }
  if (!targetPath) throw new Error(`No strategic region with id ${toId}.`);
  for (const [path, text] of regions) {
    const current = regionProvinces(text);
    if (path === targetPath) {
      changed.set(path, setRegionProvinces(text, [...current, ...moving]));
    } else if (current.some((p) => moving.has(p))) {
      changed.set(path, setRegionProvinces(text, current.filter((p) => !moving.has(p))));
    }
  }
  return changed;
}

export interface RegionIssue {
  code: 'province-in-multiple-regions' | 'province-in-no-region' | 'unknown-province' | 'empty-region';
  provinceId?: number;
  regionId?: number;
  message: string;
}

/** Provinces come from definition.csv; sea/land/lake provinces all need a region except province 0. */
export function validateStrategicRegions(definitionCsv: string, regions: TextFiles): RegionIssue[] {
  const defined = new Set<number>();
  for (const line of definitionCsv.split(NL)) {
    const id = Number(line.split(';')[0]);
    if (!Number.isNaN(id) && line.trim() && id > 0) defined.add(id);
  }
  const owner = new Map<number, number>();
  const issues: RegionIssue[] = [];
  for (const text of regions.values()) {
    const id = regionId(text);
    const provinces = regionProvinces(text);
    if (provinces.length === 0) issues.push({ code: 'empty-region', regionId: id, message: `Strategic region ${id} has no provinces.` });
    for (const p of provinces) {
      if (!defined.has(p)) issues.push({ code: 'unknown-province', provinceId: p, regionId: id, message: `Region ${id} lists province ${p}, which definition.csv does not define.` });
      if (owner.has(p)) issues.push({ code: 'province-in-multiple-regions', provinceId: p, regionId: id, message: `Province ${p} is in regions ${owner.get(p)} and ${id}.` });
      else owner.set(p, id ?? -1);
    }
  }
  for (const p of defined) {
    if (!owner.has(p)) issues.push({ code: 'province-in-no-region', provinceId: p, message: `Province ${p} is in no strategic region.` });
  }
  return issues;
}

/** A new region file; it copies the weather block of an existing region so the file is complete. */
export function createStrategicRegion(template: string, id: number, name: string, provinceIds: number[]): string {
  let text = template.replace(/\bid\s*=\s*\d+/, `id=${id}`).replace(/name\s*=\s*"[^"]*"/, `name="${name}"`);
  text = setRegionProvinces(text, provinceIds);
  return text;
}

// ---------------------------------------------------------------------------
// Supply areas: map/supplyareas/<id>-SupplyArea.txt   supply_area={ id name value states={...} }
// ---------------------------------------------------------------------------

const STATES_BLOCK = /states\s*=\s*\{([^{}]*)\}/;

export function supplyAreaStates(text: string): number[] {
  const m = text.match(STATES_BLOCK);
  return m ? parseIds(m[1]) : [];
}

export function createSupplyArea(id: number, nameKey: string, value: number, states: number[]): string {
  return ['supply_area={', `\tid=${id}`, `\tname="${nameKey}"`, `\tvalue=${value}`, '\tstates={', `\t\t${[...states].sort((a, b) => a - b).join(' ')}`, '\t}', '}', ''].join(NL);
}

export function moveStatesToSupplyArea(areas: TextFiles, stateIds: number[], toId: number): TextFiles {
  const moving = new Set(stateIds);
  const changed: TextFiles = new Map();
  const write = (text: string, ids: number[]) => text.replace(STATES_BLOCK, () => `states={${NL}\t\t${[...new Set(ids)].sort((a, b) => a - b).join(' ')}${NL}\t}`);
  let found = false;
  for (const [path, text] of areas) {
    const current = supplyAreaStates(text);
    if (regionId(text) === toId) {
      found = true;
      changed.set(path, write(text, [...current, ...moving]));
    } else if (current.some((s) => moving.has(s))) {
      changed.set(path, write(text, current.filter((s) => !moving.has(s))));
    }
  }
  if (!found) throw new Error(`No supply area with id ${toId}.`);
  return changed;
}

export function validateSupplyAreas(stateIds: number[], areas: TextFiles): string[] {
  const owner = new Map<number, number>();
  const problems: string[] = [];
  for (const text of areas.values()) {
    const id = regionId(text) ?? -1;
    for (const s of supplyAreaStates(text)) {
      if (owner.has(s)) problems.push(`State ${s} is in supply areas ${owner.get(s)} and ${id}.`);
      else owner.set(s, id);
    }
  }
  for (const s of stateIds) if (!owner.has(s)) problems.push(`State ${s} is in no supply area.`);
  return problems;
}

// ---------------------------------------------------------------------------
// Adjacencies (straits, canals): map/adjacencies.csv
// From;To;Type;Through;start_x;start_y;stop_x;stop_y;adjacency_rule_name;Comment
// ---------------------------------------------------------------------------

export interface Adjacency {
  from: number;
  to: number;
  type: '' | 'sea' | 'impassable';
  through: number;
  startX?: number;
  startY?: number;
  stopX?: number;
  stopY?: number;
  rule?: string;
  comment?: string;
}

export function formatAdjacency(a: Adjacency): string {
  return [a.from, a.to, a.type, a.through, a.startX ?? -1, a.startY ?? -1, a.stopX ?? -1, a.stopY ?? -1, a.rule ?? '', a.comment ?? ''].join(';');
}

export function parseAdjacencies(csv: string): Adjacency[] {
  const out: Adjacency[] = [];
  for (const line of csv.split(NL)) {
    const p = line.replace(/\r$/, '').split(';');
    if (p.length < 8 || Number.isNaN(Number(p[0]))) continue;
    out.push({ from: Number(p[0]), to: Number(p[1]), type: p[2] as Adjacency['type'], through: Number(p[3]), startX: Number(p[4]), startY: Number(p[5]), stopX: Number(p[6]), stopY: Number(p[7]), rule: p[8] ?? '', comment: p[9] ?? '' });
  }
  return out;
}

/**
 * Append an adjacency to the complete vanilla CSV. HOI4 expects the file to end with a terminator row of -1s;
 * a new row goes before it when present.
 */
export function addAdjacency(csv: string, adjacency: Adjacency): string {
  const lines = csv.replace(/\r/g, '').split(NL);
  let insertAt = lines.length;
  while (insertAt > 0 && lines[insertAt - 1].trim() === '') insertAt--;
  if (insertAt > 0 && lines[insertAt - 1].startsWith('-1;-1;')) insertAt--;
  lines.splice(insertAt, 0, formatAdjacency(adjacency));
  return lines.join(NL);
}

export function validateAdjacency(a: Adjacency, definedProvinces: Set<number>): string[] {
  const problems: string[] = [];
  for (const [label, id] of [['From', a.from], ['To', a.to]] as const) {
    if (!definedProvinces.has(id)) problems.push(`${label} province ${id} is not defined.`);
  }
  if (a.type === 'sea' && a.through > 0 && !definedProvinces.has(a.through)) problems.push(`Through province ${a.through} is not defined.`);
  if (a.from === a.to) problems.push('From and To are the same province.');
  return problems;
}
