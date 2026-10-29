import type { World, Province, Terrain } from './worldgen';
import { makeRng } from './worldgen';

/** Files a mod needs to replace the whole map, written from a generated world. */

const NL = String.fromCharCode(10);
const T = String.fromCharCode(9);

// ---------------------------------------------------------------------------
// BMP writers
// ---------------------------------------------------------------------------

function bmpHeader(width: number, height: number, bpp: 8 | 24, paletteBytes: number, dataSize: number): Uint8Array {
  const offset = 54 + paletteBytes;
  const out = new Uint8Array(offset);
  const v = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  v.setUint32(2, offset + dataSize, true);
  v.setUint32(10, offset, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true); // positive = rows stored bottom-up, like the vanilla files
  v.setUint16(26, 1, true);
  v.setUint16(28, bpp, true);
  v.setUint32(34, dataSize, true);
  v.setInt32(38, 2835, true);
  v.setInt32(42, 2835, true);
  return out;
}

export function bmp8(width: number, height: number, pixels: Uint8Array, palette: Array<[number, number, number]>): Uint8Array {
  const rowSize = Math.ceil(width / 4) * 4;
  const header = bmpHeader(width, height, 8, 1024, rowSize * height);
  for (let i = 0; i < 256; i++) {
    const c = palette[i] ?? [0, 0, 0];
    header.set([c[2], c[1], c[0], 0], 54 + i * 4);
  }
  const out = new Uint8Array(header.length + rowSize * height);
  out.set(header, 0);
  for (let y = 0; y < height; y++) out.set(pixels.subarray(y * width, (y + 1) * width), header.length + (height - 1 - y) * rowSize);
  return out;
}

export function bmp24(width: number, height: number, rgb: (x: number, y: number) => [number, number, number]): Uint8Array {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const header = bmpHeader(width, height, 24, 0, rowSize * height);
  const out = new Uint8Array(header.length + rowSize * height);
  out.set(header, 0);
  for (let y = 0; y < height; y++) {
    const row = header.length + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgb(x, y);
      out[row + x * 3] = b; out[row + x * 3 + 1] = g; out[row + x * 3 + 2] = r;
    }
  }
  return out;
}

const gray = Array.from({ length: 256 }, (_, i) => [i, i, i] as [number, number, number]);

// terrain.bmp palette index per province terrain (indices defined in common/terrain/00_terrain.txt)
const TERRAIN_INDEX: Record<Terrain, number> = { plains: 0, forest: 1, hills: 17, mountain: 6, desert: 3, marsh: 9, urban: 13, lakes: 14, ocean: 15, jungle: 21 };

// rivers.bmp palette as used by the vanilla file (0 source, 1 mouth, 2 junction, 3-11 widths, 254 sea, 255 land)
function riversPalette(): Array<[number, number, number]> {
  // the game checks all 256 entries: 0-15 are the river colours, 16 black, 17-253 filler
  const p: Array<[number, number, number]> = Array.from({ length: 256 }, (_, i) => (i === 16 ? [0, 0, 0] : [2, 0, 1]));
  const first: Array<[number, number, number]> = [[0, 255, 0], [255, 0, 0], [255, 252, 0], [0, 225, 255], [0, 200, 255], [0, 150, 255], [0, 100, 255], [0, 0, 255], [0, 0, 225], [0, 0, 200], [0, 0, 150], [0, 0, 100], [0, 85, 0], [0, 125, 0], [0, 158, 0], [24, 206, 0]];
  first.forEach((c, i) => (p[i] = c));
  p[254] = [122, 122, 122];
  p[255] = [255, 255, 255];
  return p;
}

const fmt = (n: number) => n.toFixed(2);

export type OutFiles = Record<string, Uint8Array | string>;

export function renderMapFiles(world: World): OutFiles {
  const { width: W, height: H, grid, heights, provinces, states } = world;
  const P = (id: number) => provinces[id - 1];
  const rng = makeRng(77);
  const files: OutFiles = {};

  // ---- bitmaps
  files['map/provinces.bmp'] = bmp24(W, H, (x, y) => P(grid[y * W + x]).color);
  files['map/heightmap.bmp'] = bmp8(W, H, heights, gray);
  const terrain = new Uint8Array(W * H);
  const rivers = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const p = P(grid[i]);
    terrain[i] = TERRAIN_INDEX[p.terrain];
    rivers[i] = p.isSea ? 254 : 255;
  }
  files['map/terrain.bmp'] = bmp8(W, H, terrain, gray);
  files['map/rivers.bmp'] = bmp8(W, H, rivers, riversPalette());
  files['map/cities.bmp'] = bmp8(W, H, new Uint8Array(W * H), gray);
  const tw = Math.round(W / 3.413), th = Math.round(H / 3.413);
  files['map/trees.bmp'] = bmp8(tw, th, new Uint8Array(tw * th), gray);
  files['map/world_normal.bmp'] = bmp24(W / 2, H / 2, () => [128, 128, 255]);

  // ---- definition.csv (province 0 is the unused black province)
  const rows = ['0;0;0;0;land;false;unknown;0'];
  for (const p of provinces) {
    rows.push([p.id, p.color[0], p.color[1], p.color[2], p.isSea ? 'sea' : 'land', p.coastal ? 'true' : 'false', p.terrain, p.continent].join(';'));
  }
  files['map/definition.csv'] = rows.join(NL) + NL;

  // ---- small text files
  files['map/default.map'] = [
    'definitions = "definition.csv"', 'provinces = "provinces.bmp"', 'positions = "positions.txt"', 'terrain = "terrain.bmp"',
    'rivers = "rivers.bmp"', 'heightmap = "heightmap.bmp"', 'tree_definition = "trees.bmp"', 'continent = "continent.txt"',
    'adjacency_rules = "adjacency_rules.txt"', 'adjacencies = "adjacencies.csv"', 'seasons = "seasons.txt"', '',
    '# Indices in trees.bmp that count as trees', 'tree = { 3 4 7 10 }', '',
  ].join(NL);
  files['map/continent.txt'] = ['continents = {', `${T}ashen_main`, '}', ''].join(NL);
  files['map/positions.txt'] = '';
  files['map/adjacency_rules.txt'] = '# No canals or straits with special rules in this world.' + NL;
  files['map/adjacencies.csv'] = ['From;To;Type;Through;start_x;start_y;stop_x;stop_y;adjacency_rule_name;Comment', '-1;-1;;-1;-1;-1;-1;-1;;', ''].join(NL);
  files['map/seasons.txt'] = '# Uses the engine defaults.' + NL;

  // ---- sample pixels per province and the coast pixel for each land/sea pair
  const samples = new Map<number, number[]>();
  const coast = new Map<string, number>();
  for (let i = 0; i < W * H; i++) {
    const id = grid[i];
    const list = samples.get(id) ?? [];
    if (list.length < 40) list.push(i); else if (rng.next() < 0.02) list[rng.int(40)] = i;
    samples.set(id, list);
    if (!P(id).isSea) {
      const x = i % W;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < W * (H - 1) ? i + W : -1]) {
        if (n >= 0 && P(grid[n]).isSea && !coast.has(id + ':' + grid[n])) coast.set(id + ':' + grid[n], i);
      }
    }
  }
  const at = (pixel: number): [number, number, number] => [pixel % W, ((H - 1 - ((pixel / W) | 0))), heights[pixel] / 10];

  // ---- buildings.txt: state buildings are keyed by state id, provincial ones by province id
  const b: string[] = [];
  const add = (key: number, type: string, pixel: number, rot = 0, port = 0) => {
    const [x, z, h] = at(pixel);
    b.push([key, type, fmt(x), fmt(h), fmt(z), fmt(rot), port].join(';'));
  };
  const stateTypes: Array<[string, number]> = [['arms_factory', 6], ['industrial_complex', 6], ['anti_air_building', 3], ['synthetic_refinery', 1], ['stronghold_network', 1], ['rocket_site_spawn', 1], ['radar_station', 1], ['nuclear_reactor_spawn', 1], ['fuel_silo', 1], ['air_base', 1]];
  for (const st of states) {
    const pool = st.provinces.flatMap((m) => samples.get(m) ?? []);
    const base = samples.get(st.capitalProvince) ?? pool;
    for (const [type, n] of stateTypes) for (let k = 0; k < n; k++) add(st.id, type, base[(k * 7) % base.length], rng.next() * 6.28);
    if (st.coastal) {
      const cp = st.provinces.find((m) => P(m).coastal)!;
      const seaId = [...P(cp).neighbors].find((n) => P(n).isSea)!;
      add(st.id, 'dockyard', coast.get(cp + ':' + seaId)!, -3);
    }
    add(st.id, 'dam_spawn', base[0], 0);
  }
  // the game validates every row against the state that owns the province, so provincial buildings are keyed by state too
  const stateOf = new Map<number, number>();
  for (const st of states) for (const m of st.provinces) stateOf.set(m, st.id);
  for (const p of provinces) {
    if (p.isSea) continue;
    const sid = stateOf.get(p.id);
    if (sid === undefined) continue;
    const pool = samples.get(p.id)!;
    add(sid, 'bunker', pool[0], rng.next() * 6.28);
    add(sid, 'supply_node', pool[1 % pool.length], rng.next() * 6.28);
    add(sid, 'special_project_facility_spawn', pool[2 % pool.length], rng.next() * 6.28);
    if (p.coastal) {
      const seaId = [...p.neighbors].find((n) => P(n).isSea)!;
      const c = coast.get(p.id + ':' + seaId)!;
      add(sid, 'naval_base_spawn', c, 0, seaId);
      add(sid, 'coastal_bunker', c, 0);
      add(sid, 'naval_headquarters', c, 0);
      add(sid, 'naval_supply_hub', c, 0);
      add(sid, 'floating_harbor', c, 0, seaId);
    }
  }
  files['map/buildings.txt'] = b.join(NL) + NL;

  // ---- unitstacks.txt
  const landTypes = [0, 1, 2, 3, 4, 5, 6, 9, 10, 21, 22, 23, 24, 25, 26, 27, 38];
  const seaTypes = [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 38];
  const us: string[] = [];
  for (const p of provinces) {
    const px = p.cx, py = H - 1 - p.cy;
    const h = heights[p.cy * W + p.cx] / 10;
    for (const t of p.isSea ? seaTypes : landTypes) {
      us.push([p.id, t, fmt(px + (t % 5) * 0.5 - 1), fmt(h), fmt(py + ((t / 5) | 0) * 0.5 - 1), fmt((t * 0.31) % 6.28), '0.30'].join(';'));
    }
  }
  files['map/unitstacks.txt'] = us.join(NL) + NL;

  // ---- weather positions: each strategic region needs a few
  const wp: string[] = [];
  const regionPixels = new Map<number, number[]>();
  for (const p of provinces) regionPixels.set(p.regionId, [...(regionPixels.get(p.regionId) ?? []), (samples.get(p.id) ?? [])[0]]);
  for (const [rid, px] of regionPixels) for (let k = 0; k < Math.min(2, px.length); k++) { const [x, z, h] = at(px[k]); wp.push([rid, fmt(x), fmt(h), fmt(z), 'small'].join(';')); }
  files['map/weatherpositions.txt'] = wp.join(NL) + NL;

  // ---- railways and supply nodes
  const rails: string[] = ['# level number_of_provinces province...'];
  const nodes: string[] = [];
  for (const st of states) {
    const cap = st.capitalProvince;
    nodes.push(`1 ${cap}`);
  }
  for (const st of states) {
    for (const n of new Set(st.provinces.flatMap((m) => [...P(m).neighbors]))) {
      const other = P(n);
      if (other.isSea || other.stateId === st.id || other.stateId < st.id) continue;
      const from = st.capitalProvince, to = states[other.stateId - 1].capitalProvince;
      // a rail line only where the two capitals are direct neighbours or share a province neighbour
      const via = [...P(from).neighbors].filter((x) => P(to).neighbors.has(x) && !P(x).isSea);
      if (P(from).neighbors.has(to)) rails.push(`2 2 ${from} ${to}`);
      else if (via.length > 0) rails.push(`2 3 ${from} ${via[0]} ${to}`);
    }
  }
  files['map/railways.txt'] = [...new Set(rails)].join(NL) + NL;
  files['map/supply_nodes.txt'] = nodes.join(NL) + NL;

  // ---- strategic regions (one file each) and supply areas
  const weatherPeriod = (lo: string, hi: string, temp: [number, number]) =>
    [`${T}${T}period={`, `${T}${T}${T}between={ ${lo} ${hi} }`, `${T}${T}${T}temperature={ ${temp[0].toFixed(1)} ${temp[1].toFixed(1)} }`, `${T}${T}${T}no_phenomenon=0.500`, `${T}${T}${T}rain_light=0.300`, `${T}${T}${T}rain_heavy=0.100`, `${T}${T}${T}snow=0.050`, `${T}${T}${T}blizzard=0.000`, `${T}${T}${T}arctic_water=0.000`, `${T}${T}${T}mud=0.100`, `${T}${T}${T}sandstorm=0.000`, `${T}${T}${T}min_snow_level=0.000`, `${T}${T}}`].join(NL);
  const regionBody = (id: number, name: string, provs: number[], naval: boolean) => {
    const sorted = provs.slice().sort((a, b) => a - b);
    const out = ['strategic_region={', `${T}id=${id}`, `${T}name="${name}"`];
    if (naval) out.push(`${T}naval_terrain=${provs.some((m) => [...P(m).neighbors].some((n) => !P(n).isSea)) ? 'water_shallow_sea' : 'water_deep_ocean'}`);
    out.push(`${T}provinces={`, `${T}${T}${sorted.join(' ')} `, `${T}}`, `${T}weather={`);
    // between = { day.month day.month }: a period spans one calendar month, last day index per month below
    const lastDay = [30, 27, 30, 29, 30, 29, 30, 30, 29, 30, 29, 30];
    lastDay.forEach((d, i) => out.push(weatherPeriod(`0.${i}`, `${d}.${i}`,[-4 + Math.sin(((i - 3) / 12) * 6.28) * 14, 8 + Math.sin(((i - 3) / 12) * 6.28) * 14])));
    out.push(`${T}}`, '}', '');
    return out.join(NL);
  };
  world.landRegions.forEach((list, i) => {
    const provs = list.flatMap((s) => states[s - 1].provinces);
    files[`map/strategicregions/${i + 1}-Region_${i + 1}.txt`] = regionBody(i + 1, `STRATEGICREGION_${i + 1}`, provs, false);
  });
  world.seaRegions.forEach((list, i) => {
    const id = world.landRegions.length + i + 1;
    files[`map/strategicregions/${id}-Sea_${i + 1}.txt`] = regionBody(id, `STRATEGICREGION_${id}`, list, true);
  });
  world.supplyAreas.forEach((list, i) => {
    files[`map/supplyareas/${i + 1}-SupplyArea.txt`] = ['supply_area={', `${T}id=${i + 1}`, `${T}name="SUPPLYAREA_${i + 1}"`, `${T}value=${6 + (i % 7)}`, `${T}states={`, `${T}${T}${list.slice().sort((a, b) => a - b).join(' ')}`, `${T}}`, '}', ''].join(NL);
  });

  return files;
}

export type { Province };
