import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Access to the player's own copy of the game, used only to derive patched copies of single vanilla files a mod
 * must replace (e.g. the technology tree gui). Those derived files are written into the player's mod folder and are
 * git-ignored: Paradox's files are never stored in this repository or in release downloads.
 */
export interface VanillaSource {
  gameDir: string;
  /** Text of a game file, with its original BOM and line endings. Throws when missing. */
  read(relativePath: string): string;
}

const DEFAULT_DIRS = [
  'C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV',
  'C:/Program Files/Steam/steamapps/common/Hearts of Iron IV',
];

export function findGameDir(explicit?: string): string | undefined {
  const candidates = [explicit, process.env.HOI4_DIR, ...DEFAULT_DIRS].filter((d): d is string => Boolean(d));
  return candidates.find((d) => existsSync(join(d, 'hoi4.exe')) || existsSync(join(d, 'interface')));
}

export function openVanilla(explicit?: string): VanillaSource | undefined {
  const gameDir = findGameDir(explicit);
  if (!gameDir) return undefined;
  return { gameDir, read: (rel) => readFileSync(join(gameDir, rel), 'utf8') };
}

/** Paths (relative to a mod folder) of files derived from vanilla; they are git-ignored and left out of releases. */
export const VANILLA_DERIVED_PATHS = [
  'interface/countrytechtreeview.gui',
  'interface/countryproductionlineview.gui',
  'history/countries/LUX - Luxemburg.txt',
];
