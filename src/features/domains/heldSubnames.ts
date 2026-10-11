import { useEffect } from 'react'
import { sameAuthority } from '../identity/ownerLabel'
import { isSubname } from './domainFormat'

// Subnames this wallet was seen holding when their page was open in this browser. An indexer
// without the holder index lists names by holder for root names only, so there a subname given
// by another name's owner is otherwise invisible in My names. Each entry is checked again before
// it is shown.

type Remembered = { node: string; name: string }
const LIMIT = 64

function key(chainId: string, authority: string) {
  return `dusk-domains:held-subnames:${chainId}:${authority.trim().toLowerCase()}`
}

export function rememberedHeldSubnames(chainId: string, authority: string): Remembered[] {
  if (!authority.trim()) return []
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(key(chainId, authority)) ?? '[]') as unknown
    return Array.isArray(value) ? value.filter((item): item is Remembered => Boolean(item) && typeof item.node === 'string'
      && /^0x[0-9a-f]{64}$/.test(item.node) && typeof item.name === 'string' && item.name.endsWith('.dusk')) : []
  } catch {
    return []
  }
}

function write(chainId: string, authority: string, items: Remembered[]) {
  try {
    if (items.length) globalThis.localStorage?.setItem(key(chainId, authority), JSON.stringify(items.slice(-LIMIT)))
    else globalThis.localStorage?.removeItem(key(chainId, authority))
  } catch {
    // Storage can be full or disabled; the list is a convenience.
  }
}

export function rememberHeldSubname(chainId: string, authority: string, subname: Remembered) {
  if (!authority.trim()) return
  const current = rememberedHeldSubnames(chainId, authority)
  if (current.some(item => item.node === subname.node)) return
  write(chainId, authority, [...current, { node: subname.node, name: subname.name }])
}

export function forgetHeldSubnames(chainId: string, authority: string, nodes: readonly string[]) {
  const current = rememberedHeldSubnames(chainId, authority)
  const next = current.filter(item => !nodes.includes(item.node))
  if (next.length !== current.length) write(chainId, authority, next)
}

/** Remember a subname whose page shows this wallet as its owner or manager. */
export function useRememberHeldSubname({ chainId, name, node, owner, manager, authority }: {
  chainId: string
  name: string
  node: string
  owner: string
  manager: string
  authority: string
}) {
  const held = Boolean(node && authority && isSubname(name) && [owner, manager].some(holder => sameAuthority(holder, authority)))
  useEffect(() => {
    if (held) rememberHeldSubname(chainId, authority, { node, name })
  }, [authority, chainId, held, name, node])
}
