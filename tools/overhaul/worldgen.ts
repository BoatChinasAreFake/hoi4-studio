/**
 * Procedural world for the Ashen Concord total-conversion test mod: a land mask, provinces (Voronoi cells that are
 * repaired until every province is one connected region with no four-way pixel corners), states, countries,
 * strategic regions and supply areas. Everything is deterministic for a given seed.
 */

export interface Rng {
  next(): number;
  int(n: number): number;
  pick<T>(a: T[]): T;
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n), pick: (a) => a[Math.floor(next() * a.length)] };
}

export type Terrain = 'plains' | 'forest' | 'hills' | 'mountain' | 'desert' | 'marsh' | 'jungle' | 'urban' | 'ocean' | 'lakes';

export interface Province {
  id: number;
  isSea: boolean;
  color: [number, number, number];
  terrain: Terrain;
  coastal: boolean;
  /** pixel centroid (top-down) */
  cx: number;
  cy: number;
  area: number;
  neighbors: Set<number>;
  stateId: number; // 0 for sea
  regionId: number;
  continent: number; // 1 for land, 0 for sea
}

export interface State {
  id: number;
  provinces: number[];
  owner: number; // country index
  name: string;
  coastal: boolean;
  supplyArea: number;
  regionId: number;
  capitalProvince: number;
}

export interface World {
  width: number;
  height: number;
  /** province id per pixel, row-major top-down */
  grid: Uint16Array;
  /** height value per pixel (0-255) */
  heights: Uint8Array;
  provinces: Province[]; // index = id - 1 ... id 0 is not stored
  states: State[];
  landRegions: number[][]; // lists of state ids
  seaRegions: number[][]; // lists of province ids
  supplyAreas: number[][]; // lists of state ids
  countryCapitalStates: number[]; // per country index
  stateOwner: Map<number, number>;
}

// ---------------------------------------------------------------------------
// noise
// ---------------------------------------------------------------------------

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 144665) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * f, y * f, seed + i * 101);
    amp *= 0.5;
    f *= 2;
  }
  return v;
}

// ---------------------------------------------------------------------------
// provinces
// ---------------------------------------------------------------------------

interface Seed { x: number; y: number }

function scatter(rng: Rng, count: number, ok: (x: number, y: number) => boolean, w: number, h: number, minDist: number): Seed[] {
  const seeds: Seed[] = [];
  let attempts = 0;
  while (seeds.length < count && attempts < count * 400) {
    attempts++;
    // best-candidate: sample several, keep the one farthest from existing seeds
    let best: Seed | undefined;
    let bestD = -1;
    for (let k = 0; k < 8; k++) {
      const x = rng.int(w), y = rng.int(h);
      if (!ok(x, y)) continue;
      let d = Infinity;
      for (const s of seeds) d = Math.min(d, (s.x - x) ** 2 + (s.y - y) ** 2);
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    if (best && (seeds.length === 0 || bestD >= minDist * minDist)) seeds.push(best);
  }
  return seeds;
}

export interface WorldOptions {
  width: number;
  height: number;
  seed: number;
  landProvinces: number;
  seaProvinces: number;
  statesTarget: number;
  countries: number;
}

export function generateWorld(opt: WorldOptions): World {
  const { width: W, height: H } = opt;
  const rng = makeRng(opt.seed);
  const idx = (x: number, y: number) => y * W + x;

  // ---- land mask: a main continent, a smaller one and islands, with a sea border
  const landMask = new Uint8Array(W * H);
  const elevation = new Float32Array(W * H);
  const centers = [{ x: 0.42, y: 0.5, r: 0.36 }, { x: 0.82, y: 0.3, r: 0.12 }, { x: 0.78, y: 0.78, r: 0.1 }];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H;
      let falloff = 0;
      for (const c of centers) {
        const d = Math.sqrt(((nx - c.x) * 2) ** 2 + (ny - c.y) ** 2) / c.r;
        falloff = Math.max(falloff, 1 - d);
      }
      const n = fbm(x / 70, y / 70, opt.seed, 5);
      const v = falloff * 1.15 + (n - 0.5) * 0.9;
      const border = Math.min(x, y, W - 1 - x, H - 1 - y) < 14 ? -1 : 0; // keep a sea margin at the edge
      elevation[idx(x, y)] = v + border;
      landMask[idx(x, y)] = v + border > 0.18 ? 1 : 0;
    }
  }

  // ---- seeds
  const landSeeds = scatter(rng, opt.landProvinces, (x, y) => landMask[idx(x, y)] === 1, W, H, 20);
  const seaSeeds = scatter(rng, opt.seaProvinces, (x, y) => landMask[idx(x, y)] === 0, W, H, 34);
  const seeds: Seed[] = [...landSeeds, ...seaSeeds];
  const isSeaSeed = (i: number) => i >= landSeeds.length;

  // ---- nearest seed of the same class
  const grid = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const land = landMask[idx(x, y)] === 1;
      const from = land ? 0 : landSeeds.length;
      const to = land ? landSeeds.length : seeds.length;
      let best = from, bestD = Infinity;
      for (let i = from; i < to; i++) {
        const d = (seeds[i].x - x) ** 2 + (seeds[i].y - y) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
      grid[idx(x, y)] = best + 1;
    }
  }

  const classOf = new Map<number, boolean>(); // ids created while repairing (islets that become their own province)
  const seaOfId = (id: number) => (classOf.has(id) ? classOf.get(id)! : isSeaSeed(id - 1));
  repairProvinces(grid, W, H, seaOfId, classOf, seeds.length);
  repairProvinces(grid, W, H, seaOfId, classOf, seeds.length + 1000); // second pass: the corner fix can split a province
  // The game rejects provinces whose bounding box is too large ("TOO LARGE BOX"): cut those in two and repair again.
  for (let round = 0; round < 6; round++) {
    if (!splitOversized(grid, W, H, classOf, seaOfId, 10000 + round * 2000)) break;
    repairProvinces(grid, W, H, seaOfId, classOf, 11000 + round * 2000);
  }
  const compact = compactIds(grid, seeds.length, seaOfId);

  // ---- province table
  const provinces: Province[] = [];
  const count = compact.count;
  const sums = new Array(count + 1).fill(0).map(() => ({ x: 0, y: 0, n: 0 }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = sums[grid[idx(x, y)]];
    s.x += x; s.y += y; s.n++;
  }
  for (let id = 1; id <= count; id++) {
    const s = sums[id];
    provinces.push({
      id,
      isSea: compact.sea[id],
      color: [0, 0, 0],
      terrain: 'ocean',
      coastal: false,
      cx: Math.round(s.x / s.n),
      cy: Math.round(s.y / s.n),
      area: s.n,
      neighbors: new Set(),
      stateId: 0,
      regionId: 0,
      continent: compact.sea[id] ? 0 : 1,
    });
  }
  const P = (id: number) => provinces[id - 1];

  // ---- unique colours
  const used = new Set<number>();
  for (const p of provinces) {
    let c: number;
    do { c = (rng.int(250) + 3) * 65536 + (rng.int(250) + 3) * 256 + (rng.int(250) + 3); } while (used.has(c));
    used.add(c);
    p.color = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  }

  // ---- adjacency (4-connected) and coastal flags
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = grid[idx(x, y)];
    if (x + 1 < W) { const b = grid[idx(x + 1, y)]; if (a !== b) { P(a).neighbors.add(b); P(b).neighbors.add(a); } }
    if (y + 1 < H) { const b = grid[idx(x, y + 1)]; if (a !== b) { P(a).neighbors.add(b); P(b).neighbors.add(a); } }
  }
  for (const p of provinces) if (!p.isSea) p.coastal = [...p.neighbors].some((n) => P(n).isSea);

  // ---- heights and terrain
  const heights = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    heights[i] = landMask[i] === 1 ? Math.min(255, Math.round(98 + Math.max(0, elevation[i] - 0.18) * 150 + fbm(x / 20, y / 20, 7, 3) * 14)) : 89;
  }
  // the grid may differ from the mask after repairs: make heights follow the provinces
  for (let i = 0; i < W * H; i++) if (P(grid[i]).isSea) heights[i] = 89; else if (heights[i] < 96) heights[i] = 98;
  for (const p of provinces) {
    if (p.isSea) { p.terrain = 'ocean'; continue; }
    const mean = elevation[idx(p.cx, p.cy)];
    const wet = fbm(p.cx / 90, p.cy / 90, 99, 3);
    const lat = Math.abs(p.cy / H - 0.5) * 2;
    if (mean > 0.62) p.terrain = 'mountain';
    else if (mean > 0.48) p.terrain = 'hills';
    else if (lat < 0.22 && wet > 0.5) p.terrain = 'jungle';
    else if (wet < 0.34) p.terrain = 'desert';
    else if (wet > 0.66 && mean < 0.33) p.terrain = 'marsh';
    else if (wet > 0.5) p.terrain = 'forest';
    else p.terrain = 'plains';
  }

  // ---- states: grow from seeds over land adjacency
  const landIds = provinces.filter((p) => !p.isSea).map((p) => p.id);
  const stateOf = new Map<number, number>();
  const perState = Math.max(2, Math.round(landIds.length / opt.statesTarget));
  const stateProvs: number[][] = [];
  const free = new Set(landIds);
  while (free.size > 0) {
    const start = [...free][rng.int(free.size)];
    const members = [start];
    free.delete(start);
    stateOf.set(start, stateProvs.length + 1);
    const frontier = [start];
    while (members.length < perState && frontier.length > 0) {
      const cur = frontier[rng.int(frontier.length)];
      const options = [...P(cur).neighbors].filter((n) => free.has(n));
      if (options.length === 0) { frontier.splice(frontier.indexOf(cur), 1); continue; }
      const nxt = rng.pick(options);
      free.delete(nxt);
      stateOf.set(nxt, stateProvs.length + 1);
      members.push(nxt);
      frontier.push(nxt);
    }
    stateProvs.push(members);
  }
  // merge singleton leftovers into a neighbouring state
  for (let s = 0; s < stateProvs.length; s++) {
    if (stateProvs[s].length === 1) {
      const p = stateProvs[s][0];
      const nb = [...P(p).neighbors].map((n) => stateOf.get(n)).filter((v): v is number => v !== undefined && v !== s + 1);
      if (nb.length > 0) {
        const target = nb[0];
        stateProvs[target - 1].push(p);
        stateOf.set(p, target);
        stateProvs[s] = [];
      }
    }
  }
  // renumber states without holes
  const remap = new Map<number, number>();
  const states: State[] = [];
  stateProvs.forEach((members, i) => {
    if (members.length === 0) return;
    const id = states.length + 1;
    remap.set(i + 1, id);
    const centroid = members.reduce((a, m) => ({ x: a.x + P(m).cx, y: a.y + P(m).cy }), { x: 0, y: 0 });
    const cap = members.slice().sort((a, b) => (P(a).cx - centroid.x / members.length) ** 2 + (P(a).cy - centroid.y / members.length) ** 2 - ((P(b).cx - centroid.x / members.length) ** 2 + (P(b).cy - centroid.y / members.length) ** 2))[0];
    states.push({ id, provinces: members, owner: -1, name: '', coastal: members.some((m) => P(m).coastal), supplyArea: 0, regionId: 0, capitalProvince: cap });
  });
  for (const st of states) for (const m of st.provinces) { P(m).stateId = st.id; }
  const stateNeighbors = (id: number) => {
    const out = new Set<number>();
    for (const m of states[id - 1].provinces) for (const n of P(m).neighbors) { const s = P(n).stateId; if (s && s !== id) out.add(s); }
    return out;
  };

  // ---- countries: multi-source growth over state adjacency
  const owner = new Map<number, number>();
  const capitals: number[] = [];
  const cs = scatterStates(rng, states, opt.countries, P);
  cs.forEach((sid, ci) => { owner.set(sid, ci); capitals.push(sid); });
  const queue = [...cs];
  while (owner.size < states.length) {
    let progressed = false;
    for (let ci = 0; ci < opt.countries; ci++) {
      const mine = [...owner.entries()].filter(([, c]) => c === ci).map(([s]) => s);
      const options: number[] = [];
      for (const s of mine) for (const n of stateNeighbors(s)) if (!owner.has(n)) options.push(n);
      if (options.length > 0) {
        owner.set(rng.pick(options), ci);
        progressed = true;
      }
    }
    if (!progressed) {
      // disconnected islands: give them to the nearest country capital
      for (const st of states) if (!owner.has(st.id)) {
        let best = 0, bd = Infinity;
        capitals.forEach((cap, ci) => { const a = P(states[cap - 1].capitalProvince), b = P(st.capitalProvince); const d = (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2; if (d < bd) { bd = d; best = ci; } });
        owner.set(st.id, best);
      }
    }
  }
  void queue;
  for (const st of states) st.owner = owner.get(st.id)!;

  // ---- strategic regions: land regions are unions of whole states (a state must not straddle two regions)
  const landRegions = groupStates(rng, states, 3, stateNeighbors);
  landRegions.forEach((list, i) => list.forEach((s) => { states[s - 1].regionId = i + 1; for (const m of states[s - 1].provinces) P(m).regionId = i + 1; }));
  const seaIds = provinces.filter((p) => p.isSea).map((p) => p.id);
  const seaRegions = groupProvinces(rng, seaIds, 5, (id) => [...P(id).neighbors].filter((n) => P(n).isSea));
  seaRegions.forEach((list, i) => list.forEach((id) => { P(id).regionId = landRegions.length + i + 1; }));

  // ---- supply areas
  const supplyAreas = groupStates(rng, states, 4, stateNeighbors);
  supplyAreas.forEach((list, i) => list.forEach((s) => { states[s - 1].supplyArea = i + 1; }));

  return { width: W, height: H, grid, heights, provinces, states, landRegions, seaRegions, supplyAreas, countryCapitalStates: capitals, stateOwner: owner };
}

function scatterStates(rng: Rng, states: State[], n: number, P: (id: number) => Province): number[] {
  const picks: number[] = [];
  const first = states[rng.int(states.length)];
  picks.push(first.id);
  while (picks.length < n) {
    let best = states[0].id, bd = -1;
    for (const st of states) {
      if (picks.includes(st.id)) continue;
      let d = Infinity;
      for (const p of picks) { const a = P(states[p - 1].capitalProvince), b = P(st.capitalProvince); d = Math.min(d, (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2); }
      if (d > bd) { bd = d; best = st.id; }
    }
    picks.push(best);
  }
  return picks;
}

function groupStates(rng: Rng, states: State[], size: number, nb: (id: number) => Set<number>): number[][] {
  const left = new Set(states.map((s) => s.id));
  const groups: number[][] = [];
  while (left.size > 0) {
    const start = [...left][rng.int(left.size)];
    const g = [start];
    left.delete(start);
    while (g.length < size) {
      const options = new Set<number>();
      for (const s of g) for (const n of nb(s)) if (left.has(n)) options.add(n);
      if (options.size === 0) break;
      const pick = [...options][rng.int(options.size)];
      g.push(pick);
      left.delete(pick);
    }
    groups.push(g);
  }
  return groups;
}

function groupProvinces(rng: Rng, ids: number[], size: number, nb: (id: number) => number[]): number[][] {
  const left = new Set(ids);
  const groups: number[][] = [];
  while (left.size > 0) {
    const start = [...left][rng.int(left.size)];
    const g = [start];
    left.delete(start);
    while (g.length < size) {
      const options = new Set<number>();
      for (const s of g) for (const n of nb(s)) if (left.has(n)) options.add(n);
      if (options.size === 0) break;
      const pick = [...options][rng.int(options.size)];
      g.push(pick);
      left.delete(pick);
    }
    groups.push(g);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// province repair
// ---------------------------------------------------------------------------

/** Make every province one 4-connected region (extra fragments are absorbed by a neighbour), then remove 2x2 corners. */
function repairProvinces(grid: Uint16Array, W: number, H: number, isSea: (id: number) => boolean, classOf: Map<number, boolean>, seedCount: number): void {
  let nextId = seedCount + 1;
  const label = new Int32Array(W * H).fill(-1);
  const comps: { id: number; pixels: number[] }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < W * H; start++) {
    if (label[start] >= 0) continue;
    const id = grid[start];
    const c = { id, pixels: [] as number[] };
    const ci = comps.length;
    stack.push(start);
    label[start] = ci;
    while (stack.length) {
      const p = stack.pop()!;
      c.pixels.push(p);
      const x = p % W, y = (p / W) | 0;
      const nbs = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const n of nbs) if (n >= 0 && label[n] < 0 && grid[n] === id) { label[n] = ci; stack.push(n); }
    }
    comps.push(c);
  }
  const biggest = new Map<number, number>();
  comps.forEach((c, i) => { const cur = biggest.get(c.id); if (cur === undefined || comps[cur].pixels.length < c.pixels.length) biggest.set(c.id, i); });
  const MIN = 90;
  // small or secondary fragments take the id of their most common neighbour of the same class
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    comps.forEach((c, i) => {
      if (c.pixels.length === 0) return;
      const keep = biggest.get(c.id) === i && c.pixels.length >= MIN;
      if (keep) return;
      const votes = new Map<number, number>();
      for (const p of c.pixels) {
        const x = p % W, y = (p / W) | 0;
        for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
          if (n < 0) continue;
          const g = grid[n];
          if (g !== c.id && isSea(g) === isSea(c.id)) votes.set(g, (votes.get(g) ?? 0) + 1);
        }
      }
      let best = -1, bv = 0;
      for (const [g, v] of votes) if (v > bv) { bv = v; best = g; }
      if (best < 0) {
        // no neighbour of the same class: an islet. Big enough to stand alone, otherwise it joins whatever surrounds it.
        if (c.pixels.length >= MIN) {
          const id = nextId++;
          classOf.set(id, isSea(c.id));
          for (const p of c.pixels) grid[p] = id;
          return;
        }
        const any = new Map<number, number>();
        for (const p of c.pixels) {
          const x = p % W, y = (p / W) | 0;
          for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
            if (n >= 0 && grid[n] !== c.id) any.set(grid[n], (any.get(grid[n]) ?? 0) + 1);
          }
        }
        for (const [g, v] of any) if (v > bv) { bv = v; best = g; }
      }
      if (best >= 0) {
        for (const p of c.pixels) grid[p] = best;
        c.pixels = [];
        changed = true;
      }
    });
    if (!changed) break;
  }
  // a province that lost every fragment-size check keeps its biggest piece (already handled above)
  // remove four-way corners: where a 2x2 block holds 3+ distinct ids, copy the left neighbour into the odd pixel
  for (let pass = 0; pass < 8; pass++) {
    let fixed = 0;
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = grid[y * W + x], b = grid[y * W + x + 1], c = grid[(y + 1) * W + x], d = grid[(y + 1) * W + x + 1];
      if (a !== b && a !== c && a !== d && b !== c && b !== d && c !== d) { grid[(y + 1) * W + x + 1] = c; fixed++; }
    }
    if (fixed === 0) break;
  }
}

const MAX_BOX_H = 55, MAX_BOX_W = 85;

/** Cut every province whose bounding box exceeds the limits at the median of its longer side. Returns whether anything was split. */
function splitOversized(grid: Uint16Array, W: number, H: number, classOf: Map<number, boolean>, isSea: (id: number) => boolean, firstId: number): boolean {
  const box = new Map<number, number[]>();
  for (let p = 0; p < grid.length; p++) {
    const x = p % W, y = (p / W) | 0, b = box.get(grid[p]);
    if (!b) box.set(grid[p], [x, x, y, y]);
    else { if (x < b[0]) b[0] = x; if (x > b[1]) b[1] = x; if (y < b[2]) b[2] = y; if (y > b[3]) b[3] = y; }
  }
  let nextId = firstId, split = false;
  for (const [id, b] of box) {
    const w = b[1] - b[0] + 1, h = b[3] - b[2] + 1;
    if (h <= MAX_BOX_H && w <= MAX_BOX_W) continue;
    const alongY = h / MAX_BOX_H >= w / MAX_BOX_W;
    const coords: number[] = [];
    for (let p = 0; p < grid.length; p++) if (grid[p] === id) coords.push(alongY ? (p / W) | 0 : p % W);
    coords.sort((a, c) => a - c);
    const cut = coords[coords.length >> 1];
    const fresh = nextId++;
    classOf.set(fresh, isSea(id));
    for (let p = 0; p < grid.length; p++) if (grid[p] === id && (alongY ? (p / W) | 0 : p % W) >= cut) grid[p] = fresh;
    split = true;
  }
  return split;
}

/** Renumber ids to 1..n without gaps; returns sea flags. */
function compactIds(grid: Uint16Array, seedCount: number, isSea: (id: number) => boolean): { count: number; sea: boolean[] } {
  const map = new Map<number, number>();
  const sea: boolean[] = [false];
  for (let i = 0; i < grid.length; i++) {
    const g = grid[i];
    let m = map.get(g);
    if (m === undefined) { m = map.size + 1; map.set(g, m); sea[m] = isSea(g); }
    grid[i] = m;
  }
  void seedCount;
  return { count: map.size, sea };
}
