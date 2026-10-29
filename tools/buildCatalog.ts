/**
 * Builds public/script_catalog.json from the documentation folder of a local HOI4 install, so the Script Editor can
 * autocomplete effects, triggers and modifiers. The output is generated on your machine and git-ignored.
 *
 *   npm run catalog -- "C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV"
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog } from '../src/utils/scriptCatalog';

const gameDir = process.argv[2] ?? 'C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV';
const docs = join(gameDir, 'documentation');
const read = (name: string) => {
  const p = join(docs, name);
  if (!existsSync(p)) throw new Error(`Missing ${p}. Pass the game folder as the first argument.`);
  return readFileSync(p, 'utf8');
};

const catalog = buildCatalog({
  effects: read('effects_documentation.md'),
  triggers: read('triggers_documentation.md'),
  modifiers: read('modifiers_documentation.md'),
});
const out = join('public', 'script_catalog.json');
writeFileSync(out, JSON.stringify(catalog));
const count = (k: string) => catalog.filter((e) => e.kind === k).length;
console.log(`Wrote ${catalog.length} entries (${count('effect')} effects, ${count('trigger')} triggers, ${count('modifier')} modifiers) to ${out}`);
