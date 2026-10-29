// HOI4 Goal Icon Registry & Search Engine

let manifestCache: Record<string, string> | null = null;
// Components re-resolve their icon when the manifest finishes loading or an icon is imported.
let iconVersion = 0;
const listeners = new Set<() => void>();
const bump = () => {
  iconVersion++;
  listeners.forEach((l) => l());
};
export function subscribeGoalIcons(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getGoalIconsVersion(): number {
  return iconVersion;
}

let manifestPromise: Promise<Record<string, string>> | null = null;

export async function loadGoalIconsManifest(): Promise<Record<string, string>> {
  if (manifestCache) return manifestCache;
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetch('/gfx/goals_manifest.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load goals manifest');
      return res.json();
    })
    .then((data) => {
      manifestCache = data;
      bump();
      return data;
    })
    .catch((err) => {
      console.warn('Could not load goals_manifest.json:', err);
      manifestCache = {};
      bump();
      return {};
    });

  return manifestPromise;
}

/** Icons imported into the current project (sprite name -> object/data URL). They win over name guessing. */
const customIcons = new Map<string, string>();

export function registerGoalIcon(spriteId: string, url: string): void {
  customIcons.set(spriteId, url);
  bump();
}

/** Generic icons used when nothing better loads, most neutral first. */
const BACKUP_ICONS = ['GFX_goal_generic_political_pressure', 'GFX_goal_generic_national_unity', 'GFX_goal_generic_production'];

/**
 * Every image worth trying for a sprite, best first: the exact sprite (imported or vanilla), close name
 * variants, a fuzzy match, then generic backups. The UI walks this list when an image fails to load.
 */
export function getGoalIconCandidates(spriteId: string): string[] {
  const out: string[] = [];
  const add = (url: string | undefined) => {
    if (url && !out.includes(url)) out.push(url);
  };
  const id = (spriteId || '').trim();
  if (id) {
    add(customIcons.get(id));
    if (manifestCache) add(manifestCache[id]);
  }
  if (manifestCache && id) {
    const base = id.replace(/^GFX_goal_/, '').replace(/^GFX_/, '');
    for (const c of [`GFX_goal_${base}`, `GFX_${base}`, `GFX_focus_${base}`, `GFX_goal_focus_${base}`, `GFX_goal_goal_${base}`]) add(manifestCache[c]);
    const lower = base.toLowerCase();
    if (lower.length >= 4) {
      for (const [key, url] of Object.entries(manifestCache)) {
        if (!key.endsWith('_shine') && key.toLowerCase().includes(lower)) {
          add(url);
          break;
        }
      }
    }
  }
  if (manifestCache) for (const b of BACKUP_ICONS) add(manifestCache[b]);
  return out;
}

/** First candidate, or null when no icon data is loaded. */
export function getCachedGoalIconUrl(spriteId: string): string | null {
  return getGoalIconCandidates(spriteId)[0] ?? null;
}

export function searchGoalIcons(query: string, limit = 60): { name: string; url: string }[] {
  if (!manifestCache) return [];
  const q = query.trim().toLowerCase();
  const results: { name: string; url: string }[] = [];
  const seenUrls = new Set<string>();

  for (const [name, url] of Object.entries(manifestCache)) {
    if (!q || name.toLowerCase().includes(q)) {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        results.push({ name, url });
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}
