import { blake2b } from '@noble/hashes/blake2.js'

// The .dusk namehash: blake2b(parent ‖ blake2b(label)) from 32 zero bytes, root label first. It matches the
// SDK's namehash; computed here without the registration name policy, so every name still gets its card.
function namehashHex(name: string) {
  const enc = new TextEncoder()
  const node = name.toLowerCase().split('.').reverse().reduce((parent, label) => {
    const joined = new Uint8Array(64)
    joined.set(parent)
    joined.set(blake2b(enc.encode(label), { dkLen: 32 }), 32)
    return blake2b(joined, { dkLen: 32 })
  }, new Uint8Array(32))
  return Array.from(node, b => b.toString(16).padStart(2, '0')).join('')
}
import { animalFor, nameStar, TAGS } from './card-core.js'

async function key8(tag: string, node: Uint8Array) {
  const prefix = new TextEncoder().encode(tag)
  const bytes = new Uint8Array(prefix.length + node.length)
  bytes.set(prefix)
  bytes.set(node, prefix.length)
  return new DataView(await crypto.subtle.digest('SHA-256', bytes)).getBigUint64(0, false)
}

export async function nightCardIdentity(name: string) {
  const nodeHex = namehashHex(name).replace(/^0x/, '')
  const node = Uint8Array.from(nodeHex.match(/../g)!, byte => parseInt(byte, 16))
  const [animalKey, skyKey] = await Promise.all([key8(TAGS.animal, node), key8(TAGS.sky, node)])
  return { nodeHex, animal: animalFor(animalKey), skyKey, star: nameStar(nodeHex) }
}
