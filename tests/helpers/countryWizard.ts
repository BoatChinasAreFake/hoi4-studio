import { createTgaBuffer } from './tgaValidator'
import { prependUtf8Bom } from './utf8Bom'

export interface CountryWizardConfig {
  tag: string
  name: string
  adjective: string
  color: [number, number, number]
  graphicalCulture: string
  capitalProvinceId: number
  stateId: number
  stateName: string
  stateProvinces: number[]
  rulingParty: 'democratic' | 'communism' | 'fascism' | 'neutrality'
  leaderName: string
  leaderIdeology: string
  leaderPortrait?: string
}

export interface GeneratedFile {
  path: string
  content: string | Uint8Array
  isBinary: boolean
}

export interface CountryWizardResult {
  tag: string
  files: GeneratedFile[]
  directories: string[]
}

export function scaffoldCountryFiles(config: CountryWizardConfig): CountryWizardResult {
  const { tag, name, adjective, color, graphicalCulture, capitalProvinceId, stateId, stateName, stateProvinces, rulingParty, leaderName, leaderIdeology } = config

  const files: GeneratedFile[] = []

  // 1. common/countries/<name>.txt
  const countryCommon = [
    `graphical_culture = ${graphicalCulture}`,
    `graphical_culture_2d = ${graphicalCulture}_2d`,
    `color = { ${color[0]} ${color[1]} ${color[2]} }`,
    '',
  ].join('\n')
  files.push({
    path: `common/countries/${name}.txt`,
    content: countryCommon,
    isBinary: false,
  })

  // 2. common/country_tags/<tag>.txt
  const tagContent = `${tag} = "countries/${name}.txt"\n`
  files.push({
    path: `common/country_tags/${tag}.txt`,
    content: tagContent,
    isBinary: false,
  })

  // 3. history/countries/<tag> - <name>.txt
  const countryHistory = [
    `capital = ${stateId}`,
    `set_research_slots = 3`,
    `set_convoys = 10`,
    `set_politics = {`,
    `\truling_party = ${rulingParty}`,
    `\tlast_election = "1936.1.1"`,
    `\telection_frequency = 48`,
    `\telections_allowed = ${rulingParty === 'democratic' ? 'yes' : 'no'}`,
    `}`,
    `set_popularities = {`,
    `\t${rulingParty} = 100`,
    `}`,
    `recruit_character = ${tag}_${leaderName.replace(/\s+/g, '_').toLowerCase()}`,
    '',
  ].join('\n')
  files.push({
    path: `history/countries/${tag} - ${name}.txt`,
    content: countryHistory,
    isBinary: false,
  })

  // 4. history/states/<stateId>-<stateName>.txt
  const stateHistory = [
    `state = {`,
    `\tid = ${stateId}`,
    `\tname = "STATE_${stateId}"`,
    `\tmanpower = 500000`,
    `\tstate_category = town`,
    `\thistory = {`,
    `\t\towner = ${tag}`,
    `\t\tadd_core_of = ${tag}`,
    `\t\tvictory_points = { ${capitalProvinceId} 10 }`,
    `\t\tbuildings = {`,
    `\t\t\tinfrastructure = 2`,
    `\t\t\tindustrial_complex = 1`,
    `\t\t\tarms_factory = 1`,
    `\t\t}`,
    `\t}`,
    `\tprovinces = { ${stateProvinces.join(' ')} }`,
    `\tlocal_supplies = 0.0`,
    `}`,
    '',
  ].join('\n')
  files.push({
    path: `history/states/${stateId}-${stateName}.txt`,
    content: stateHistory,
    isBinary: false,
  })

  // 5. gfx/flags/<tag>.tga (82x52)
  const standardFlag = createTgaBuffer(82, 52, color)
  files.push({
    path: `gfx/flags/${tag}.tga`,
    content: standardFlag,
    isBinary: true,
  })

  // 6. gfx/flags/medium/<tag>.tga (41x26)
  const mediumFlag = createTgaBuffer(41, 26, color)
  files.push({
    path: `gfx/flags/medium/${tag}.tga`,
    content: mediumFlag,
    isBinary: true,
  })

  // 7. gfx/flags/small/<tag>.tga (10x7)
  const smallFlag = createTgaBuffer(10, 7, color)
  files.push({
    path: `gfx/flags/small/${tag}.tga`,
    content: smallFlag,
    isBinary: true,
  })

  // 8. common/characters/<tag>.txt
  const leaderId = `${tag}_${leaderName.replace(/\s+/g, '_').toLowerCase()}`
  const characterContent = [
    `characters = {`,
    `\t${leaderId} = {`,
    `\t\tname = "${leaderName}"`,
    `\t\tportraits = {`,
    `\t\t\tcivilian = {`,
    `\t\t\t\tlarge = "${config.leaderPortrait || `GFX_portrait_${tag}_leader`}"`,
    `\t\t\t}`,
    `\t\t}`,
    `\t\tcountry_leader = {`,
    `\t\t\tideology = ${leaderIdeology}`,
    `\t\t\texpire = "1965.1.1"`,
    `\t\t\tid = -1`,
    `\t\t}`,
    `\t}`,
    `}`,
    '',
  ].join('\n')
  files.push({
    path: `common/characters/${tag}.txt`,
    content: characterContent,
    isBinary: false,
  })

  // 9. common/ideas/<tag>.txt
  const ideaContent = [
    `ideas = {`,
    `\tcountry = {`,
    `\t\t${tag}_national_spirit = {`,
    `\t\t\tpicture = generic_intel_bonus`,
    `\t\t\tallowed = { always = yes }`,
    `\t\t\tmodifier = {`,
    `\t\t\t\tpolitical_power_gain = 0.15`,
    `\t\t\t}`,
    `\t\t}`,
    `\t}`,
    `}`,
    '',
  ].join('\n')
  files.push({
    path: `common/ideas/${tag}.txt`,
    content: ideaContent,
    isBinary: false,
  })

  // 10. localisation/english/<tag>_l_english.yml (with mandatory UTF-8 BOM)
  const locYaml = [
    `l_english:`,
    ` ${tag}:0 "${name}"`,
    ` ${tag}_DEF:0 "The ${name}"`,
    ` ${tag}_ADJ:0 "${adjective}"`,
    ` STATE_${stateId}:0 "${stateName}"`,
    ` ${leaderId}:0 "${leaderName}"`,
    '',
  ].join('\n')
  const locBytes = prependUtf8Bom(locYaml)
  files.push({
    path: `localisation/english/${tag}_l_english.yml`,
    content: locBytes,
    isBinary: true,
  })

  // Determine unique parent directories
  const dirSet = new Set<string>()
  for (const f of files) {
    const parts = f.path.split('/')
    parts.pop()
    const dir = parts.join('/')
    dirSet.add(dir)
  }

  return {
    tag,
    files,
    directories: Array.from(dirSet),
  }
}
