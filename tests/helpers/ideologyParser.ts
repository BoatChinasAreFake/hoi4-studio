export interface IdeologyType {
  name: string
}

export interface IdeologyGroup {
  name: string
  subTypes: string[]
  color?: [number, number, number]
  dynamicFactionNames: string[]
  rules?: Record<string, boolean>
}

export function extractBlock(source: string, key: string): string | null {
  const regex = new RegExp(`\\b${key}\\s*=\\s*\\{`, 'm')
  const match = regex.exec(source)
  if (!match) return null

  const braceStart = match.index + match[0].length - 1
  let depth = 0

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) {
        return source.slice(braceStart + 1, i)
      }
    }
  }

  return null
}

export function parseIdeologies(content: string): { ideologies: Record<string, IdeologyGroup>; errors: string[] } {
  const ideologies: Record<string, IdeologyGroup> = {}
  const errors: string[] = []

  const body = extractBlock(content, 'ideologies')
  if (!body) {
    return { ideologies: {}, errors: ['No ideologies = { ... } block found'] }
  }

  // Known major ideologies: democratic, communism, fascism, neutrality
  const majorGroups = ['democratic', 'communism', 'fascism', 'neutrality']

  for (const groupName of majorGroups) {
    const gBody = extractBlock(body, groupName)
    if (!gBody) continue

    // Types / sub-ideologies block
    const subTypes: string[] = []
    const typesBody = extractBlock(gBody, 'types')
    if (typesBody) {
      // Find each token = { ... } inside typesBody
      const typeMatches = Array.from(typesBody.matchAll(/([a-zA-Z0-9_]+)\s*=\s*\{/g))
      for (const m of typeMatches) {
        subTypes.push(m[1])
      }
    }

    // Color: color = { 0 0 255 }
    let color: [number, number, number] | undefined
    const colMatch = gBody.match(/color\s*=\s*\{\s*(\d+)\s+(\d+)\s+(\d+)\s*\}/)
    if (colMatch) {
      color = [parseInt(colMatch[1], 10), parseInt(colMatch[2], 10), parseInt(colMatch[3], 10)]
    }

    // Dynamic faction names
    const dynamicFactionNames: string[] = []
    const factionBody = extractBlock(gBody, 'dynamic_faction_names')
    if (factionBody) {
      const names = factionBody.match(/"([^"]+)"/g)
      if (names) {
        for (const n of names) {
          dynamicFactionNames.push(n.replace(/"/g, ''))
        }
      }
    }

    // Rules
    const rules: Record<string, boolean> = {}
    const rulesBody = extractBlock(gBody, 'rules')
    if (rulesBody) {
      const rLines = rulesBody.split(/\r?\n/)
      for (const rLine of rLines) {
        const rm = rLine.trim().match(/^([a-zA-Z0-9_]+)\s*=\s*(yes|no)/)
        if (rm) {
          rules[rm[1]] = rm[2] === 'yes'
        }
      }
    }

    ideologies[groupName] = {
      name: groupName,
      subTypes,
      color,
      dynamicFactionNames,
      rules,
    }
  }

  return { ideologies, errors }
}
