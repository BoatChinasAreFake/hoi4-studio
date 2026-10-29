export interface BopRange {
  id: string
  min: number
  max: number
  modifier?: Record<string, number | string>
}

export interface BopSide {
  id: string
  icon?: string
  ranges: BopRange[]
}

export interface BopDefinition {
  token: string
  initialValue: number
  leftSide: string
  rightSide: string
  decisionCategory?: string
  ranges: BopRange[]
  sides: BopSide[]
}

export interface BopValidationResult {
  valid: boolean
  errors: string[]
  bop?: BopDefinition
}

export function parseBopScript(content: string): BopValidationResult {
  const errors: string[] = []

  // Token regex: <token> = { ... }
  const rootMatch = content.match(/([a-zA-Z0-9_]+)\s*=\s*\{([\s\S]*)\}/)
  if (!rootMatch) {
    return { valid: false, errors: ['Failed to match root Balance of Power block'] }
  }

  const token = rootMatch[1]
  const body = rootMatch[2]

  const initMatch = body.match(/initial_value\s*=\s*([-+]?[0-9]*\.?[0-9]+)/)
  const leftMatch = body.match(/left_side\s*=\s*([a-zA-Z0-9_]+)/)
  const rightMatch = body.match(/right_side\s*=\s*([a-zA-Z0-9_]+)/)
  const catMatch = body.match(/decision_category\s*=\s*([a-zA-Z0-9_]+)/)

  if (!initMatch) errors.push('Missing required initial_value')
  if (!leftMatch) errors.push('Missing required left_side')
  if (!rightMatch) errors.push('Missing required right_side')

  const initialValue = initMatch ? parseFloat(initMatch[1]) : 0
  const leftSide = leftMatch ? leftMatch[1] : ''
  const rightSide = rightMatch ? rightMatch[1] : ''
  const decisionCategory = catMatch ? catMatch[1] : undefined

  // Extract all range blocks
  const ranges: BopRange[] = []
  const rangeRegex = /range\s*=\s*\{([^}]*)\}/g
  let rMatch: RegExpExecArray | null

  while ((rMatch = rangeRegex.exec(body)) !== null) {
    const rBody = rMatch[1]
    const idM = rBody.match(/id\s*=\s*([a-zA-Z0-9_]+)/)
    const minM = rBody.match(/min\s*=\s*([-+]?[0-9]*\.?[0-9]+)/)
    const maxM = rBody.match(/max\s*=\s*([-+]?[0-9]*\.?[0-9]+)/)

    if (idM && minM && maxM) {
      const min = parseFloat(minM[1])
      const max = parseFloat(maxM[1])
      if (min >= max) {
        errors.push(`Range '${idM[1]}' has invalid bounds: min (${min}) >= max (${max})`)
      }
      ranges.push({ id: idM[1], min, max })
    }
  }

  // Extract side blocks
  const sides: BopSide[] = []
  const sideRegex = /side\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  let sMatch: RegExpExecArray | null

  while ((sMatch = sideRegex.exec(body)) !== null) {
    const sBody = sMatch[1]
    const idM = sBody.match(/id\s*=\s*([a-zA-Z0-9_]+)/)
    const iconM = sBody.match(/icon\s*=\s*([a-zA-Z0-9_]+)/)
    if (idM) {
      const sideRanges: BopRange[] = []
      let srMatch: RegExpExecArray | null
      const srRegex = /range\s*=\s*\{([^}]*)\}/g
      while ((srMatch = srRegex.exec(sBody)) !== null) {
        const srBody = srMatch[1]
        const sId = srBody.match(/id\s*=\s*([a-zA-Z0-9_]+)/)
        const sMin = srBody.match(/min\s*=\s*([-+]?[0-9]*\.?[0-9]+)/)
        const sMax = srBody.match(/max\s*=\s*([-+]?[0-9]*\.?[0-9]+)/)
        if (sId && sMin && sMax) {
          sideRanges.push({ id: sId[1], min: parseFloat(sMin[1]), max: parseFloat(sMax[1]) })
        }
      }
      sides.push({ id: idM[1], icon: iconM ? iconM[1] : undefined, ranges: sideRanges })
    }
  }

  // Check initial_value within [-1.0, 1.0]
  if (initialValue < -1.0 || initialValue > 1.0) {
    errors.push(`initial_value (${initialValue}) out of bounds [-1.0, 1.0]`)
  }

  const bop: BopDefinition = {
    token,
    initialValue,
    leftSide,
    rightSide,
    decisionCategory,
    ranges,
    sides,
  }

  return {
    valid: errors.length === 0,
    errors,
    bop,
  }
}
