export const UTF8_BOM = new Uint8Array([0xEF, 0xBB, 0xBF])

export function hasUtf8Bom(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false
  return bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF
}

export function prependUtf8Bom(text: string): Uint8Array {
  const encoder = new TextEncoder()
  const textBytes = encoder.encode(text)
  const result = new Uint8Array(3 + textBytes.length)
  result.set(UTF8_BOM, 0)
  result.set(textBytes, 3)
  return result
}

export function stripUtf8Bom(bytes: Uint8Array): { hasBom: boolean; text: string } {
  const hasBom = hasUtf8Bom(bytes)
  const decoder = new TextDecoder('utf-8')
  if (hasBom) {
    return {
      hasBom: true,
      text: decoder.decode(bytes.subarray(3)),
    }
  }
  return {
    hasBom: false,
    text: decoder.decode(bytes),
  }
}

export function validateLocalizationEncoding(bytes: Uint8Array): { valid: boolean; error?: string } {
  if (bytes.length < 3) {
    return {
      valid: false,
      error: `File is too small (${bytes.length} bytes) to contain mandatory UTF-8 BOM [0xEF, 0xBB, 0xBF].`,
    }
  }

  if (!hasUtf8Bom(bytes)) {
    const hexHead = Array.from(bytes.subarray(0, Math.min(3, bytes.length)))
      .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(', ')
    return {
      valid: false,
      error: `Missing mandatory UTF-8 BOM prefix [0xEF, 0xBB, 0xBF]. Found header bytes: [${hexHead}]. Paradox engine will fail to load or corrupt localisation characters.`,
    }
  }

  return { valid: true }
}
