import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseBmp8, serializeBmp8, applyBrush, undoDelta, regionProvinces, regionId, moveProvincesToRegion, validateStrategicRegions,
  createStrategicRegion, createSupplyArea, moveStatesToSupplyArea, supplyAreaStates, validateSupplyAreas,
  addAdjacency, parseAdjacencies, validateAdjacency, type TextFiles,
} from '../src/utils/mapFiles';
import { addResearchFolder } from '../src/utils/researchFolders';

const NL = String.fromCharCode(10);

function makeBmp(width: number, height: number, fill: (x: number, y: number) => number): Uint8Array {
  const rowSize = Math.ceil(width / 4) * 4;
  const headerSize = 54 + 1024;
  const out = new Uint8Array(headerSize + rowSize * height);
  const v = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  v.setUint32(2, out.length, true);
  v.setUint32(10, headerSize, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true); // bottom-up like vanilla
  v.setUint16(26, 1, true);
  v.setUint16(28, 8, true);
  v.setUint32(46, 256, true);
  for (let i = 0; i < 256; i++) out.set([i, i, i, 0], 54 + i * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out[headerSize + (height - 1 - y) * rowSize + x] = fill(x, y);
  return out;
}

describe('BMP editing', () => {
  it('round-trips byte for byte, including row padding', () => {
    const bytes = makeBmp(7, 5, (x, y) => (x * 31 + y * 7) & 255);
    expect(Array.from(serializeBmp8(parseBmp8(bytes)))).toEqual(Array.from(bytes));
  });

  it('brushes change pixels and undo restores them', () => {
    const bmp = parseBmp8(makeBmp(32, 32, () => 100));
    const before = bmp.pixels.slice();
    const up = applyBrush(bmp, { x: 16, y: 16, radius: 5, mode: 'raise', value: 40 });
    expect(bmp.pixels[16 * 32 + 16]).toBeGreaterThan(100);
    expect(bmp.pixels[0]).toBe(100);
    undoDelta(bmp, up);
    expect(Array.from(bmp.pixels)).toEqual(Array.from(before));
  });

  it('level pulls towards a target, smooth averages, paint sets, values clamp', () => {
    const bmp = parseBmp8(makeBmp(16, 16, (x) => (x < 8 ? 0 : 255)));
    applyBrush(bmp, { x: 8, y: 8, radius: 3, mode: 'smooth', value: 0, softness: 0 });
    const mid = bmp.pixels[8 * 16 + 7];
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(255);
    applyBrush(bmp, { x: 2, y: 2, radius: 1, mode: 'paint', value: 300 });
    expect(bmp.pixels[2 * 16 + 2]).toBe(255);
    applyBrush(bmp, { x: 12, y: 12, radius: 2, mode: 'level', value: 50, softness: 0 });
    expect(bmp.pixels[12 * 16 + 12]).toBe(50);
  });

  it('rejects non-8-bit images', () => {
    const bytes = makeBmp(4, 4, () => 0);
    new DataView(bytes.buffer).setUint16(28, 24, true);
    expect(() => parseBmp8(bytes)).toThrow(/8-bit/);
  });
});

const region = (id: number, provinces: number[]) => `strategic_region={${NL}\tid=${id}${NL}\tname="R${id}"${NL}\tprovinces={${NL}\t\t${provinces.join(' ')} ${NL}\t}${NL}\tweather={ }${NL}}${NL}`;

describe('strategic regions, supply areas, adjacencies', () => {
  const regions: TextFiles = new Map([['1-A.txt', region(1, [1, 2, 3])], ['2-B.txt', region(2, [4, 5])]]);

  it('moves provinces so each stays in exactly one region', () => {
    const changed = moveProvincesToRegion(regions, [3, 4], 2);
    expect(regionProvinces(changed.get('1-A.txt')!)).toEqual([1, 2]);
    expect(regionProvinces(changed.get('2-B.txt')!)).toEqual([3, 4, 5]);
    expect(() => moveProvincesToRegion(regions, [1], 99)).toThrow();
  });

  it('validates coverage against definition.csv', () => {
    const csv = ['0;0;0;0;land;false;unknown;0', '1;1;1;1;land;false;plains;1', '2;2;2;2;land;false;plains;1', '3;3;3;3;land;false;plains;1', '4;4;4;4;sea;false;ocean;0', '5;5;5;5;sea;false;ocean;0', '6;6;6;6;land;false;plains;1'].join(NL);
    const issues = validateStrategicRegions(csv, regions);
    expect(issues.map((i) => i.code)).toEqual(['province-in-no-region']);
    const dup: TextFiles = new Map([...regions, ['3-C.txt', region(3, [1])]]);
    expect(validateStrategicRegions(csv, dup).some((i) => i.code === 'province-in-multiple-regions')).toBe(true);
  });

  it('creates a region from a template', () => {
    const text = createStrategicRegion(regions.get('1-A.txt')!, 9, 'STRATEGICREGION_9', [30, 10]);
    expect(regionId(text)).toBe(9);
    expect(regionProvinces(text)).toEqual([10, 30]);
  });

  it('supply areas', () => {
    const areas: TextFiles = new Map([['1.txt', createSupplyArea(1, 'S1', 12, [5, 85])], ['2.txt', createSupplyArea(2, 'S2', 8, [7])]]);
    const changed = moveStatesToSupplyArea(areas, [85], 2);
    expect(supplyAreaStates(changed.get('1.txt')!)).toEqual([5]);
    expect(supplyAreaStates(changed.get('2.txt')!)).toEqual([7, 85]);
    expect(validateSupplyAreas([5, 7, 85, 99], areas)).toEqual(['State 99 is in no supply area.']);
  });

  it('adds an adjacency before the terminator row and validates it', () => {
    const csv = ['From;To;Type;Through;start_x;start_y;stop_x;stop_y;adjacency_rule_name;Comment', '1;2;sea;3;-1;-1;-1;-1;;Strait', '-1;-1;;-1;-1;-1;-1;-1;;'].join(NL);
    const out = addAdjacency(csv, { from: 4, to: 5, type: 'sea', through: 6, rule: 'MY_STRAIT', comment: 'Mine' });
    const lines = out.split(NL);
    expect(lines[lines.length - 2]).toBe('4;5;sea;6;-1;-1;-1;-1;MY_STRAIT;Mine');
    expect(lines[lines.length - 1].startsWith('-1;-1')).toBe(true);
    expect(parseAdjacencies(out).length).toBe(3);
    expect(validateAdjacency({ from: 4, to: 4, type: 'sea', through: 99 }, new Set([4, 5, 6]))).toHaveLength(2);
  });
});

describe('research folders', () => {
  const gui = `guiTypes = {
	containerWindowType = {
		name = "countrytechtreeview"
		containerWindowType = {
			name = "electronics_folder"
			iconType = { name = "electronics_bg" spriteType = "GFX_electronics_techtree_bg" }
		}
		containerWindowType = {
			name = "folder_tabs"
			buttonType = {
				name = "a_folder_tab"
				position = { x = 22 y = 0 }
			}
			buttonType = {
				position = { x = 645 y = 0 }
				name = "electronics_folder_tab"
				quadTextureSprite = "GFX_techtree_engineering_tab"
			}
		}
	}
}
`;
  const gfx = `spriteTypes = {
	spriteType = {
		name = "GFX_electronics_techtree_bg"
		textureFile = "gfx//interface//techtree//bg.dds"
	}
}
`;

  it('clones the folder window and tab and aliases its sprites', () => {
    const r = addResearchFolder(gui, gfx, { id: 'gdx_folder', cloneFrom: 'electronics_folder' });
    expect(r.gui).toContain('name = "gdx_folder"');
    expect(r.gui).toContain('name = "gdx_folder_tab"');
    expect(r.gui).toContain('x = 734');
    expect(r.gui).toContain('GFX_gdx_techtree_bg');
    expect(r.gfx).toContain('name = "GFX_gdx_techtree_bg"');
    expect(r.gfx).toContain('bg.dds');
    expect((r.gui.match(/\{/g) ?? []).length).toBe((r.gui.match(/\}/g) ?? []).length);
    expect(() => addResearchFolder(r.gui, gfx, { id: 'gdx_folder', cloneFrom: 'electronics_folder' })).toThrow(/already exists/);
    expect(() => addResearchFolder(gui, gfx, { id: 'Bad Id' })).toThrow();
  });
});

// Checks against the real game files when a local install is present.
const GAME = 'C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV';
describe.skipIf(!existsSync(GAME))('against the installed game', () => {
  it('every vanilla province is in a strategic region and none is unknown', () => {
    const dir = join(GAME, 'map/strategicregions');
    const regions: TextFiles = new Map(readdirSync(dir).map((f) => [f, readFileSync(join(dir, f), 'utf8')]));
    const issues = validateStrategicRegions(readFileSync(join(GAME, 'map/definition.csv'), 'utf8'), regions);
    // The shipped game itself has a few provinces listed in two regions (253/254), so only coverage is asserted.
    expect(issues.filter((i) => i.code === 'province-in-no-region' || i.code === 'unknown-province')).toEqual([]);
  });

  it('adds a research folder to the real tech gui with balanced braces', () => {
    const gui = readFileSync(join(GAME, 'interface/countrytechtreeview.gui'), 'utf8');
    const gfx = readFileSync(join(GAME, 'interface/countrytechtreeview.gfx'), 'utf8');
    const r = addResearchFolder(gui, gfx, { id: 'gdx_folder' });
    const clean = r.gui.replace(/#[^\n]*/g, '').replace(/"[^"\n]*"/g, '""');
    expect((clean.match(/\{/g) ?? []).length).toBe((clean.match(/\}/g) ?? []).length);
    expect(r.gui).toContain('gdx_folder_tab');
  });

  it('terrain.bmp parses and round-trips', () => {
    const bytes = new Uint8Array(readFileSync(join(GAME, 'map/terrain.bmp')));
    const bmp = parseBmp8(bytes);
    expect(bmp.width).toBe(5632);
    expect(Buffer.from(serializeBmp8(bmp)).equals(Buffer.from(bytes))).toBe(true);
  });
});
