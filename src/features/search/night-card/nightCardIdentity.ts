import { namehashHex } from '../../../names/hash'
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
