export interface SuperEventDef {
  id: string
  titleLocKey: string
  descLocKey: string
  buttonLocKey: string
  bannerSprite: string
  soundEffect: string
  fireOnlyOnce: boolean
  trigger?: string
  effect?: string
}

export function validateSuperEvent(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Super event payload must be an object'] }
  }

  const se = data as Record<string, unknown>

  if (!se.id || typeof se.id !== 'string' || !/^[a-zA-Z0-9_]+$/.test(se.id)) {
    errors.push(`Invalid super event id '${se.id}': must be non-empty alphanumeric with underscores.`)
  }

  if (!se.titleLocKey || typeof se.titleLocKey !== 'string') {
    errors.push('Super event must specify titleLocKey.')
  }

  if (!se.descLocKey || typeof se.descLocKey !== 'string') {
    errors.push('Super event must specify descLocKey.')
  }

  if (!se.buttonLocKey || typeof se.buttonLocKey !== 'string') {
    errors.push('Super event must specify buttonLocKey.')
  }

  if (!se.bannerSprite || typeof se.bannerSprite !== 'string' || !se.bannerSprite.startsWith('GFX_')) {
    errors.push(`Banner sprite must begin with 'GFX_', got '${se.bannerSprite}'.`)
  }

  if (!se.soundEffect || typeof se.soundEffect !== 'string') {
    errors.push('Super event must specify soundEffect identifier.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function generateSuperEventScript(def: SuperEventDef): string {
  const lines = [
    `# Scaffolding for Super Event: ${def.id}`,
    `country_event = {`,
    `\tid = ${def.id}`,
    `\ttitle = ${def.titleLocKey}`,
    `\tdesc = ${def.descLocKey}`,
    `\tpicture = ${def.bannerSprite}`,
    `\tis_triggered_only = yes`,
    `\tfire_only_once = ${def.fireOnlyOnce ? 'yes' : 'no'}`,
    ``,
    `\timmediate = {`,
    `\t\tplay_sound = "${def.soundEffect}"`,
    `\t}`,
    ``,
    `\toption = {`,
    `\t\tname = ${def.buttonLocKey}`,
    def.effect ? `\t\t${def.effect}` : `\t\tcustom_effect_tooltip = ${def.id}_tt`,
    `\t}`,
    `}`,
  ]
  return lines.join('\n')
}
