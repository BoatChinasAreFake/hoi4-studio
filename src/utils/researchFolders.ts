/**
 * Custom research (technology) folders.
 *
 * Folder windows and their tab buttons live in vanilla's interface/countrytechtreeview.gui, one big file the game
 * replaces wholesale. `addResearchFolder` takes the COMPLETE vanilla gui and gfx text, clones an existing folder
 * window and tab under a new id, and returns the full modified gui plus a .gfx that aliases the cloned folder's
 * sprites. The mod's copy of the gui must be regenerated after every game patch that changes the vanilla file.
 */

const NL = String.fromCharCode(10);

/** Index just past the "}" that closes the "{" at or after `openAt`. Quotes and # comments are skipped. */
function blockEnd(text: string, openAt: number): number {
  let depth = 0;
  let inStr = false;
  let started = false;
  for (let i = openAt; i < text.length; i++) {
    const ch = text[i];
    if (!inStr && ch === '#') {
      while (i < text.length && text[i] !== NL) i++;
      continue;
    }
    if (ch === '"') inStr = !inStr;
    if (inStr) continue;
    if (ch === '{') {
      depth++;
      started = true;
    } else if (ch === '}') {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  throw new Error('Unbalanced braces in gui/gfx text.');
}

interface Range {
  start: number;
  end: number;
}

function findNamedBlock(text: string, keyword: string, name: string, from = 0): Range | undefined {
  const re = new RegExp(keyword + '\\s*=\\s*\\{', 'g');
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const open = m.index + m[0].length - 1;
    const end = blockEnd(text, open);
    const body = text.slice(open, end);
    // the block's own name is the first name = "..." in it
    const own = body.match(/\bname\s*=\s*"([^"]+)"/);
    if (own && own[1] === name) return { start: m.index, end };
    re.lastIndex = m.index + keyword.length;
  }
  return undefined;
}

function childBlocks(text: string, keyword: string, range: Range): Range[] {
  const inner = text.slice(range.start, range.end);
  const out: Range[] = [];
  const re = new RegExp(keyword + '\\s*=\\s*\\{', 'g');
  let m: RegExpExecArray | null;
  const first = inner.indexOf('{');
  re.lastIndex = first + 1;
  while ((m = re.exec(inner)) !== null) {
    const open = m.index + m[0].length - 1;
    const end = blockEnd(inner, open);
    out.push({ start: range.start + m.index, end: range.start + end });
    re.lastIndex = end;
  }
  return out;
}

const shortName = (folderId: string) => folderId.replace(/_?folder$/, '');

export interface AddFolderOptions {
  /** New folder id; this is what `folder = { name = <id> }` in technology files refers to. */
  id: string;
  /** Existing folder whose layout is copied. Default: electronics_folder (small). */
  cloneFrom?: string;
  /** Horizontal distance between tab buttons. Default 89 (vanilla spacing). */
  tabSpacing?: number;
}

export interface AddFolderResult {
  gui: string;
  /** interface/*.gfx content aliasing the cloned folder's sprites; empty when none were needed. */
  gfx: string;
  notes: string[];
}

export function addResearchFolder(gui: string, vanillaGfx: string, options: AddFolderOptions): AddFolderResult {
  const source = options.cloneFrom ?? 'electronics_folder';
  const id = options.id;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error('Folder id must be lowercase letters, digits and underscores.');
  if (findNamedBlock(gui, 'containerWindowType', id)) throw new Error(`A folder named "${id}" already exists.`);
  const notes: string[] = [];

  const folder = findNamedBlock(gui, 'containerWindowType', source);
  if (!folder) throw new Error(`Folder window "${source}" not found in the gui.`);
  const srcShort = shortName(source);
  const newShort = shortName(id);
  const rename = (s: string) => s.split(source).join(id).split(srcShort).join(newShort);

  const folderText = gui.slice(folder.start, folder.end);
  const clonedFolder = rename(folderText);

  // Tab button
  const tabs = findNamedBlock(gui, 'containerWindowType', 'folder_tabs');
  if (!tabs) throw new Error('folder_tabs container not found in the gui.');
  const buttons = childBlocks(gui, 'buttonType', tabs);
  const srcTab = buttons.find((b) => gui.slice(b.start, b.end).includes(`name = "${source}_tab"`));
  if (!srcTab) throw new Error(`Tab button "${source}_tab" not found.`);
  const xs = buttons.map((b) => Number((gui.slice(b.start, b.end).match(/position\s*=\s*\{\s*x\s*=\s*(-?\d+)/) ?? [])[1])).filter((n) => !Number.isNaN(n));
  const newX = (xs.length ? Math.max(...xs) : 0) + (options.tabSpacing ?? 89);
  let clonedTab = rename(gui.slice(srcTab.start, srcTab.end));
  clonedTab = clonedTab.replace(/(position\s*=\s*\{\s*x\s*=\s*)-?\d+/, `$1${newX}`);
  const lastButton = buttons[buttons.length - 1];

  // Insert the later position first so earlier offsets stay valid.
  let out = gui;
  out = out.slice(0, lastButton.end) + NL + NL + '\t\t\t' + clonedTab + out.slice(lastButton.end);
  out = out.slice(0, folder.end) + NL + NL + '\t\t' + clonedFolder + out.slice(folder.end);

  // Sprites referenced by the cloned folder that carry the folder's name need aliases in a .gfx.
  const referenced = new Set<string>();
  for (const m of (clonedFolder + clonedTab).matchAll(/"(GFX_[A-Za-z0-9_]+)"/g)) referenced.add(m[1]);
  const aliases: string[] = [];
  for (const name of referenced) {
    const original = name.split(id).join(source).split(newShort).join(srcShort);
    if (original === name) continue;
    const block = ['spriteType', 'frameAnimatedSpriteType'].map((k) => findNamedBlock(vanillaGfx, k, original)).find(Boolean);
    if (!block) {
      notes.push(`Sprite ${original} is not in the supplied gfx text; ${name} was left undefined.`);
      continue;
    }
    aliases.push('\t' + vanillaGfx.slice(block.start, block.end).replace(`"${original}"`, `"${name}"`));
  }
  const gfx = aliases.length ? ['spriteTypes = {', ...aliases, '}', ''].join(NL) : '';
  notes.push(`Tab placed at x=${newX}. Technologies join the folder with folder = { name = ${id} position = { x y } }.`);
  return { gui: out, gfx, notes };
}

/** Localisation helper: tooltip and name for the folder. */
export function researchFolderLocEntries(id: string, name: string): { key: string; value: string }[] {
  return [
    { key: id, value: name },
    { key: `${id}_tab_tooltip`, value: name },
  ];
}

// ---------------------------------------------------------------------------
// Placing custom technologies and showing custom resources
// ---------------------------------------------------------------------------

export interface GridBoxOptions {
  /** Folder window to add the gridbox to, e.g. infantry_folder. */
  folderId: string;
  /** Root technology of the new tree. The game finds the gridbox by the name `<root>_tree`. */
  rootTech: string;
  /** Where the tree's top-left slot sits inside the folder. */
  x?: number;
  y?: number;
}

/**
 * Techs are placed by a gridbox named after the tree's root tech (infantry_weapons -> infantry_weapons_tree).
 * A tech whose tree has none logs "Found no grid box for tech". This adds one to a folder in the complete vanilla
 * countrytechtreeview.gui; the tech's `folder = { name position }` then positions it inside that gridbox.
 */
export function addTechGridBox(gui: string, options: GridBoxOptions): string {
  const name = `${options.rootTech}_tree`;
  if (gui.includes(`name = "${name}"`)) throw new Error(`A gridbox named "${name}" already exists.`);
  const folder = findNamedBlock(gui, 'containerWindowType', options.folderId);
  if (!folder) throw new Error(`Folder window "${options.folderId}" not found in the gui.`);
  const box = [
    '',
    '',
    '\t\t\tgridboxtype = {',
    `\t\t\t\tname = "${name}"`,
    `\t\t\t\tposition = { x = ${options.x ?? 140} y = ${options.y ?? 1050} }`,
    '\t\t\t\tslotsize = { width = 70 height = 70 }',
    '\t\t\t\tformat = "LEFT"',
    '\t\t\t}',
    '',
  ].join(NL);
  const close = folder.end - 1; // the "}" that ends the folder window
  return gui.slice(0, close) + box + '\t\t' + gui.slice(close);
}

/**
 * Adds a resource to the production screen's resource bar in the complete vanilla countryproductionlineview.gui:
 * an icon (a frame of GFX_resources_strip) and the `<id>_checkbox` the game looks for, and widens the bar.
 */
export function addProductionResource(gui: string, resourceId: string, iconFrame = 1): string {
  if (gui.includes(`name = "${resourceId}_checkbox"`)) throw new Error(`Resource "${resourceId}" is already in the production gui.`);
  const bar = findNamedBlock(gui, 'containerWindowType', 'resources');
  if (!bar) throw new Error('The "resources" window was not found in the production gui.');
  const body = gui.slice(bar.start, bar.end);
  const xs = [...body.matchAll(/name = "[a-z_]+_icon"\s*position = \{ x=(\d+) y=\d+ \}/g)].map((m) => Number(m[1]));
  const iconX = (xs.length ? Math.max(...xs) : 0) + 66;
  const piece = [
    '',
    '\t\t\ticonType = {',
    `\t\t\t\tname = "${resourceId}_icon"`,
    `\t\t\t\tposition = { x=${iconX} y=2 }`,
    '\t\t\t\tspriteType = "GFX_resources_strip"',
    `\t\t\t\tframe = ${iconFrame}`,
    '\t\t\t}',
    '',
    '\t\t\tbuttonType = {',
    `\t\t\t\tname = "${resourceId}_checkbox"`,
    `\t\t\t\tposition = { x = ${iconX + 28} y = 1 }`,
    '\t\t\t\tquadTextureSprite ="GFX_generic_checkbox"',
    '\t\t\t\tOrientation = "UPPER_LEFT"',
    '\t\t\t\tclicksound = click_checkbox',
    '\t\t\t}',
    '',
  ].join(NL);
  const widened = body.replace(/size = \{ width = (\d+) height = 35 \}/, (_m, w) => `size = { width = ${Number(w) + 66} height = 35 }`);
  const close = widened.lastIndexOf('}');
  return gui.slice(0, bar.start) + widened.slice(0, close) + piece + '\t\t' + widened.slice(close) + gui.slice(bar.end);
}
