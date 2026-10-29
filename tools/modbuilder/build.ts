import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildMod, MOD_ID } from './grandDuchy';
import { buildExperimentalMod, EXP_MOD_ID } from './experimental';

const outRoot = process.argv[2] ?? join('mods');

for (const [id, build] of [[MOD_ID, buildMod], [EXP_MOD_ID, buildExperimentalMod]] as const) {
  const modDir = join(outRoot, id);
  rmSync(modDir, { recursive: true, force: true });

  const { files, launcher } = build();
  for (const f of files) {
    const full = join(modDir, f.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, f.content);
  }
  mkdirSync(outRoot, { recursive: true });
  writeFileSync(join(outRoot, launcher.path), launcher.content);
  console.log(`Wrote ${files.length} files to ${modDir} and ${join(outRoot, launcher.path)}`);
}
