/**
 * Strips references to vanilla tags, focuses and tag-prefixed scripted triggers/effects from a vanilla script file, so
 * the generic parts of it (economy laws, spirits, occupation laws) can stay in a total conversion without filling the
 * error log. A matching line is removed together with its brace block; an emptied `OR = { }` is left in place, which the
 * game accepts.
 */
const OWN_TAGS = new Set(['AUR', 'VRD', 'KRS', 'OST', 'HAL', 'DSK', 'SLV', 'IRV']);

const braceDelta = (line: string): number => {
  const text = line.replace(/#.*$/, '');
  return (text.match(/\{/g)?.length ?? 0) - (text.match(/\}/g)?.length ?? 0);
};

function isForeignReference(line: string): boolean {
  const code = line.replace(/#.*$/, '');
  if (/\bhas_completed_focus\s*=\s*\w+/.test(code)) return true;
  if (/\b(?:has_active_mission|has_decision|is_in_array|has_global_flag)\s*=\s*[A-Z]{3}_/.test(code)) return true;
  const tagAssign = /^\s*(?:original_tag|tag|is_ally_with|has_war_with|is_subject_of|exists|is_in_faction_with|owns_state_of)\s*=\s*([A-Z]{3})\b/.exec(code);
  if (tagAssign && !OWN_TAGS.has(tagAssign[1])) return true;
  const scope = /^\s*([A-Z]{3})\s*=\s*[{\w]/.exec(code);
  if (scope && !OWN_TAGS.has(scope[1])) return true;
  if (/^\s*[A-Z]{3}_\w+\s*=/.test(code) && !OWN_TAGS.has(code.trim().slice(0, 3))) return true;
  if (/^\s*(?:fascism|communism|democratic|neutrality)\s*[<>=]/.test(code)) return true;
  if (/^\s*(?:has_military_academy|has_air_academy|has_naval_academy|has_air_force_command|should_play_\w+)\s*=/.test(code)) return true;
  return false;
}

export function sanitizeVanillaScript(text: string): string {
  const out: string[] = [];
  let skipDepth = 0;
  for (const line of text.split(/\r?\n/)) {
    if (skipDepth > 0) {
      skipDepth += braceDelta(line);
      continue;
    }
    if (isForeignReference(line)) {
      const delta = braceDelta(line);
      if (delta > 0) skipDepth = delta;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

const IDEOLOGY_MAP: Record<string, string> = { democratic: 'concordism', communism: 'syndicalism', fascism: 'dominionism', neutrality: 'traditionalism' };

/** Points vanilla ideology names at this mod's ideologies, so generic scripts that test them keep working instead of erroring. */
export function remapIdeologies(text: string): string {
  return text.replace(/\b(democratic|communism|fascism|neutrality)\b(?!\w)/g, (m) => IDEOLOGY_MAP[m]);
}

/** Points inline vanilla tag references (tag = X, countries = { X Y }) at a stand-in tag so the files still parse. */
export function redirectTags(text: string, standIn: string): string {
  const own = (t: string) => OWN_TAGS.has(t);
  return text
    .replace(/\b(original_tag|tag)(\s*=\s*)([A-Z][A-Z0-9]{2})\b/g, (m, k, eq, t) => (own(t) ? m : `${k}${eq}${standIn}`))
    .replace(/\b(countries|enable_for_controllers)(\s*=\s*\{)([^}]*)\}/g, (m, k, open, list) => `${k}${open} ${list.trim().split(/\s+/).map((t: string) => (own(t) ? t : standIn)).filter((t: string, i: number, a: string[]) => a.indexOf(t) === i).join(' ')} }`);
}
