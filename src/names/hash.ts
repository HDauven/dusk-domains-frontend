import { namehashHex as hash, normalizeNameInput } from '@duskdomains/sdk'
export const namehashHex = (name: string) => '0x' + hash(name)
export const namehash = (name: string) => ({
  canonicalName: normalizeNameInput(name),
  hex: namehashHex(normalizeNameInput(name)),
})
