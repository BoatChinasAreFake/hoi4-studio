import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildMod, MOD_ID } from './grandDuchy';

const outRoot = process.argv[2] ?? join('mods');
const modDir = join(outRoot, MOD_ID);
rmSync(modDir, { recursive: true, force: true });

const { files, launcher } = buildMod();
for (const f of files) {
  const full = join(modDir, f.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, f.content);
}
mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, launcher.path), launcher.content);
console.log(`Wrote ${files.length} files to ${modDir} and ${join(outRoot, launcher.path)}`);
