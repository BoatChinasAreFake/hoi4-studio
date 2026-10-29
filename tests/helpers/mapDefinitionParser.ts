export interface ProvinceDefinition {
  id: number
  red: number
  green: number
  blue: number
  type: 'land' | 'sea' | 'lake'
  coastal: boolean
  terrain: string
  continent: number
}

export interface DefinitionError {
  line: number
  rawLine: string
  message: string
  code: 'INVALID_FORMAT' | 'INVALID_RGB' | 'DUPLICATE_RGB' | 'DUPLICATE_ID' | 'INVALID_TYPE' | 'INVALID_COASTAL'
}

export interface ParseDefinitionResult {
  provinces: ProvinceDefinition[]
  errors: DefinitionError[]
  idMap: Map<number, ProvinceDefinition>
  colorMap: Map<string, ProvinceDefinition>
  duplicateRgbs: Array<{ rgb: string; provinceIds: number[] }>
}

export function parseDefinitionCsv(content: string, _options: { stopOnDuplicate?: boolean } = {}): ParseDefinitionResult {
  const lines = content.split(/\r?\n/)
  const provinces: ProvinceDefinition[] = []
  const errors: DefinitionError[] = []
  const idMap = new Map<number, ProvinceDefinition>()
  const colorMap = new Map<string, ProvinceDefinition>()
  const rgbToIds = new Map<string, number[]>()

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue // skip empty lines

    const parts = rawLine.split(';')
    if (parts.length < 8) {
      errors.push({
        line: i + 1,
        rawLine,
        message: `Expected at least 8 semicolon-separated columns, found ${parts.length}`,
        code: 'INVALID_FORMAT',
      })
      continue
    }

    const id = parseInt(parts[0].trim(), 10)
    const red = parseInt(parts[1].trim(), 10)
    const green = parseInt(parts[2].trim(), 10)
    const blue = parseInt(parts[3].trim(), 10)
    const rawType = parts[4].trim().toLowerCase()
    const rawCoastal = parts[5].trim().toLowerCase()
    const terrain = parts[6].trim().toLowerCase()
    const continent = parseInt(parts[7].trim(), 10)

    if (isNaN(id) || id < 0) {
      errors.push({
        line: i + 1,
        rawLine,
        message: `Invalid province id: ${parts[0]}`,
        code: 'INVALID_FORMAT',
      })
      continue
    }

    if (
      isNaN(red) || red < 0 || red > 255 ||
      isNaN(green) || green < 0 || green > 255 ||
      isNaN(blue) || blue < 0 || blue > 255
    ) {
      errors.push({
        line: i + 1,
        rawLine,
        message: `RGB values must be integers between 0 and 255: (${parts[1]}, ${parts[2]}, ${parts[3]})`,
        code: 'INVALID_RGB',
      })
      continue
    }

    if (rawType !== 'land' && rawType !== 'sea' && rawType !== 'lake') {
      errors.push({
        line: i + 1,
        rawLine,
        message: `Unknown province type '${rawType}', must be 'land', 'sea', or 'lake'`,
        code: 'INVALID_TYPE',
      })
      continue
    }

    if (rawCoastal !== 'true' && rawCoastal !== 'false') {
      errors.push({
        line: i + 1,
        rawLine,
        message: `Coastal flag must be 'true' or 'false', got '${rawCoastal}'`,
        code: 'INVALID_COASTAL',
      })
      continue
    }

    const rgbKey = `${red},${green},${blue}`
    const existingRgbIds = rgbToIds.get(rgbKey) || []
    existingRgbIds.push(id)
    rgbToIds.set(rgbKey, existingRgbIds)

    if (idMap.has(id)) {
      errors.push({
        line: i + 1,
        rawLine,
        message: `Duplicate province ID detected: ${id}`,
        code: 'DUPLICATE_ID',
      })
    }

    const def: ProvinceDefinition = {
      id,
      red,
      green,
      blue,
      type: rawType as 'land' | 'sea' | 'lake',
      coastal: rawCoastal === 'true',
      terrain,
      continent: isNaN(continent) ? 0 : continent,
    }

    provinces.push(def)
    idMap.set(id, def)
    if (!colorMap.has(rgbKey)) {
      colorMap.set(rgbKey, def)
    }
  }

  const duplicateRgbs: Array<{ rgb: string; provinceIds: number[] }> = []
  for (const [rgb, ids] of rgbToIds.entries()) {
    if (ids.length > 1) {
      duplicateRgbs.push({ rgb, provinceIds: ids })
      for (const pid of ids) {
        errors.push({
          line: 0,
          rawLine: `Province ${pid} shares RGB (${rgb})`,
          message: `Duplicate RGB (${rgb}) shared by provinces: ${ids.join(', ')}`,
          code: 'DUPLICATE_RGB',
        })
      }
    }
  }

  return {
    provinces,
    errors,
    idMap,
    colorMap,
    duplicateRgbs,
  }
}
