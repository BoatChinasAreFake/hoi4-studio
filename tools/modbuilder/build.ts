import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildMod, MOD_ID } from './grandDuchy';
import { buildExperimentalMod, EXP_MOD_ID } from './experimental';
import { openVanilla } from './vanilla';

const outRoot = process.argv[2] ?? join('mods');
// Optional: --game <dir> or HOI4_DIR. With the game installed, mods that must patch vanilla files get them derived locally.
const gameArg = process.argv.indexOf('--game') >= 0 ? process.argv[process.argv.indexOf('--game') + 1] : undefined;
const vanilla = openVanilla(gameArg);
console.log(vanilla ? 'Game files found at ' + vanilla.gameDir + ': including patched vanilla files (git-ignored).' : 'Game files not found: building without custom technologies, resource and vanilla patches.');

for (const [id, build] of [[MOD_ID, buildMod], [EXP_MOD_ID, buildExperimentalMod]] as const) {
  const modDir = join(outRoot, id);
  rmSync(modDir, { recursive: true, force: true });

  const { files, launcher } = build(vanilla);
  for (const f of files) {
    const full = join(modDir, f.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, f.content);
  }
  mkdirSync(outRoot, { recursive: true });
  writeFileSync(join(outRoot, launcher.path), launcher.content);
  console.log(`Wrote ${files.length} files to ${modDir} and ${join(outRoot, launcher.path)}`);
}
