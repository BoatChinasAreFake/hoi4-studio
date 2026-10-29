export interface CountryLeaderRole {
  ideology: string
  traits: string[]
  expire?: string
  id?: number
}

export interface CorpsCommanderRole {
  skill: number
  attack: number
  defense: number
  planning: number
  logistics: number
  traits: string[]
}

export interface NavyLeaderRole {
  skill: number
  attack: number
  defense: number
  maneuvering: number
  coordination: number
  traits: string[]
}

export interface AdvisorRole {
  slot: string
  ideaToken?: string
  traits: string[]
}

export interface ScientistRole {
  specializations: Record<string, number>
}

export interface ParsedCharacter {
  token: string
  name: string
  portraits: {
    civilianLarge?: string
    civilianSmall?: string
    armyLarge?: string
    armySmall?: string
  }
  countryLeader?: CountryLeaderRole
  corpsCommander?: CorpsCommanderRole
  navyLeader?: NavyLeaderRole
  advisor?: AdvisorRole
  scientist?: ScientistRole
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

export function extractTopLevelBlocks(source: string): Array<{ key: string; body: string }> {
  const blocks: Array<{ key: string; body: string }> = []
  let depth = 0
  let i = 0

  while (i < source.length) {
    if (source[i] === '#') {
      // Skip comment to end of line
      while (i < source.length && source[i] !== '\n') i++
      continue
    }

    if (depth === 0) {
      // Look for `<token> = {`
      const slice = source.slice(i)
      const match = slice.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*\{/)
      if (match) {
        const key = match[1]
        const braceStart = i + match[0].length - 1
        let blockDepth = 1
        let j = braceStart + 1
        while (j < source.length && blockDepth > 0) {
          if (source[j] === '#') {
            while (j < source.length && source[j] !== '\n') j++
            continue
          }
          if (source[j] === '{') blockDepth++
          else if (source[j] === '}') blockDepth--
          j++
        }
        const body = source.slice(braceStart + 1, j - 1)
        blocks.push({ key, body })
        i = j
        continue
      }
    }

    if (source[i] === '{') depth++
    else if (source[i] === '}') depth--
    i++
  }

  return blocks
}

export function parseCharactersFile(content: string): { characters: ParsedCharacter[]; errors: string[] } {
  const characters: ParsedCharacter[] = []
  const errors: string[] = []

  const rootBody = extractBlock(content, 'characters')
  if (!rootBody) {
    return { characters: [], errors: ['No characters = { ... } block found'] }
  }

  // Parse only direct top-level children of `characters`
  const topBlocks = extractTopLevelBlocks(rootBody)

  for (const { key: token, body } of topBlocks) {
    // Name
    const nameMatch = body.match(/name\s*=\s*"([^"]+)"/) || body.match(/name\s*=\s*([a-zA-Z0-9_]+)/)
    const name = nameMatch ? nameMatch[1] : token

    // Portraits
    const portraits: ParsedCharacter['portraits'] = {}
    const civBlock = extractBlock(body, 'civilian')
    if (civBlock) {
      const civLarge = civBlock.match(/large\s*=\s*"([^"]+)"/) || civBlock.match(/large\s*=\s*([a-zA-Z0-9_]+)/)
      if (civLarge) portraits.civilianLarge = civLarge[1]
      const civSmall = civBlock.match(/small\s*=\s*"([^"]+)"/) || civBlock.match(/small\s*=\s*([a-zA-Z0-9_]+)/)
      if (civSmall) portraits.civilianSmall = civSmall[1]
    }

    const armyBlock = extractBlock(body, 'army')
    if (armyBlock) {
      const armyLarge = armyBlock.match(/large\s*=\s*"([^"]+)"/) || armyBlock.match(/large\s*=\s*([a-zA-Z0-9_]+)/)
      if (armyLarge) portraits.armyLarge = armyLarge[1]
      const armySmall = armyBlock.match(/small\s*=\s*"([^"]+)"/) || armyBlock.match(/small\s*=\s*([a-zA-Z0-9_]+)/)
      if (armySmall) portraits.armySmall = armySmall[1]
    }

    const char: ParsedCharacter = {
      token,
      name,
      portraits,
    }

    // Country Leader role
    const leaderBody = extractBlock(body, 'country_leader')
    if (leaderBody) {
      const ideoMatch = leaderBody.match(/ideology\s*=\s*([a-zA-Z0-9_]+)/)
      const expMatch = leaderBody.match(/expire\s*=\s*"([^"]+)"/)
      const traitsBody = extractBlock(leaderBody, 'traits')
      char.countryLeader = {
        ideology: ideoMatch ? ideoMatch[1] : 'neutrality',
        expire: expMatch ? expMatch[1] : undefined,
        traits: traitsBody ? traitsBody.trim().split(/\s+/).filter(Boolean) : [],
      }
    }

    // Corps Commander role
    const corpsBody = extractBlock(body, 'corps_commander')
    if (corpsBody) {
      const skill = parseInt((corpsBody.match(/skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const atk = parseInt((corpsBody.match(/attack_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const def = parseInt((corpsBody.match(/defense_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const plan = parseInt((corpsBody.match(/planning_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const log = parseInt((corpsBody.match(/logistics_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const traitsBody = extractBlock(corpsBody, 'traits')
      char.corpsCommander = {
        skill,
        attack: atk,
        defense: def,
        planning: plan,
        logistics: log,
        traits: traitsBody ? traitsBody.trim().split(/\s+/).filter(Boolean) : [],
      }
    }

    // Navy Leader role
    const navyBody = extractBlock(body, 'navy_leader')
    if (navyBody) {
      const skill = parseInt((navyBody.match(/skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const atk = parseInt((navyBody.match(/attack_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const def = parseInt((navyBody.match(/defense_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const man = parseInt((navyBody.match(/maneuvering_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const coor = parseInt((navyBody.match(/coordination_skill\s*=\s*(\d+)/) || [])[1] || '1', 10)
      const traitsBody = extractBlock(navyBody, 'traits')
      char.navyLeader = {
        skill,
        attack: atk,
        defense: def,
        maneuvering: man,
        coordination: coor,
        traits: traitsBody ? traitsBody.trim().split(/\s+/).filter(Boolean) : [],
      }
    }

    // Advisor role
    const advisorBody = extractBlock(body, 'advisor')
    if (advisorBody) {
      const slotM = advisorBody.match(/slot\s*=\s*([a-zA-Z0-9_]+)/)
      const ideaM = advisorBody.match(/idea_token\s*=\s*([a-zA-Z0-9_]+)/)
      const traitsBody = extractBlock(advisorBody, 'traits')
      char.advisor = {
        slot: slotM ? slotM[1] : 'political_advisor',
        ideaToken: ideaM ? ideaM[1] : undefined,
        traits: traitsBody ? traitsBody.trim().split(/\s+/).filter(Boolean) : [],
      }
    }

    // Scientist role
    const sciBody = extractBlock(body, 'scientist')
    if (sciBody) {
      const skillsBody = extractBlock(sciBody, 'skills')
      const specs: Record<string, number> = {}
      if (skillsBody) {
        const pairs = skillsBody.replace(/=/g, ' ').trim().split(/\s+/).filter(Boolean)
        for (let i = 0; i < pairs.length - 1; i += 2) {
          const key = pairs[i]
          const val = parseInt(pairs[i + 1], 10)
          if (key && !isNaN(val)) specs[key] = val
        }
      }
      char.scientist = { specializations: specs }
    }

    characters.push(char)
  }

  return { characters, errors }
}
