// HOI4 Goal Icon Registry & Search Engine

let manifestCache: Record<string, string> | null = null;
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
      return data;
    })
    .catch((err) => {
      console.warn('Could not load goals_manifest.json:', err);
      manifestCache = {};
      return {};
    });

  return manifestPromise;
}

export function getCachedGoalIconUrl(spriteId: string): string | null {
  if (!manifestCache || !spriteId) return null;

  // Direct match
  if (manifestCache[spriteId]) return manifestCache[spriteId];

  // Try variations
  const cleanId = spriteId.trim();
  if (manifestCache[cleanId]) return manifestCache[cleanId];

  // If starts with GFX_goal_
  const base = cleanId.replace(/^GFX_goal_/, '').replace(/^GFX_/, '');
  const candidates = [
    `GFX_goal_${base}`,
    `GFX_${base}`,
    `GFX_focus_${base}`,
    `GFX_goal_focus_${base}`,
    `GFX_goal_goal_${base}`,
    `GFX_${base}_shine`,
    `GFX_goal_${base}_shine`,
  ];

  for (const c of candidates) {
    if (manifestCache[c]) return manifestCache[c];
  }

  // Substring match in keys
  const lowerBase = base.toLowerCase();
  for (const [key, url] of Object.entries(manifestCache)) {
    if (key.toLowerCase().includes(lowerBase)) {
      return url;
    }
  }

  return null;
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
