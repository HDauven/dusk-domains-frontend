/** UI numbers must be exact. Wire and SDK values remain bigint / decimal Lux. */
export function safeNumber(value: bigint | number | string): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || BigInt(n) !== BigInt(value))
    throw new RangeError('Value is outside the supported display range')
  return n
}

/** A Lux amount as an exact number, or null when it is past 2^53 - 1. */
export function exactNumber(value: bigint | number | string): number | null {
  try { return safeNumber(value) } catch { return null }
}
