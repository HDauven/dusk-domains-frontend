/** UI numbers must be exact. Wire and SDK values remain bigint / decimal Lux. */
export function safeNumber(value: bigint | number | string): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || BigInt(n) !== BigInt(value))
    throw new RangeError('Value is outside the supported display range')
  return n
}
