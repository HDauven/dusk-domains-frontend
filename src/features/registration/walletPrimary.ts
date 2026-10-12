import { useCallback, useEffect, useRef, useState } from 'react'
import type { DuskDomainsIndexerClient, DuskDomainsOnChainClient } from '../../names/internal'

/**
 * The connected wallet's primary name, `ready` once read. `stored` is the name the registry links
 * the address to, which may not work as a primary name: the name expired or changed hands, or its
 * address record changed. `name` is that name while it works, so apps show it.
 */
export type WalletPrimary = { status: 'loading' | 'ready' | 'unknown'; name: string | null; stored: string | null }

const unknown: WalletPrimary = { status: 'unknown', name: null, stored: null }
const loading: WalletPrimary = { status: 'loading', name: null, stored: null }
const lower = (value: string) => value.toLowerCase()
const linkOf = (primary: WalletPrimary) => primary.status === 'ready' ? primary.stored ?? primary.name : null

/** Registering a dropped name again clears every primary link to it and to its old subnames. */
export function clearedByClaim(name: string | null, claim: string) {
  if (!name || !claim) return false
  return lower(name) === lower(claim) || lower(name).endsWith(`.${lower(claim)}`)
}

/**
 * Whether a claim also makes the new name primary. A choice someone made stands. Otherwise it is on
 * only for a wallet known to have no primary link, or one the claim clears anyway, so registering a
 * second name never silently replaces the first one's.
 */
export function claimSetsPrimary(choice: boolean | null, primary: WalletPrimary, claim: string) {
  if (choice !== null) return choice
  if (primary.status !== 'ready') return false
  const linked = linkOf(primary)
  return linked === null || clearedByClaim(linked, claim)
}

/** What the claim does to the wallet's primary name. Only a working one is called a primary name. */
export function primaryNameNote(primary: WalletPrimary, setsPrimary: boolean, claim: string) {
  const linked = linkOf(primary)
  if (!linked) return ''
  if (clearedByClaim(linked, claim)) {
    if (!setsPrimary) return `Registering clears your Dusk address's link to ${linked}.`
    return lower(linked) === lower(claim) ? `This makes ${claim} your primary name again.` : `This replaces your Dusk address's link to ${linked}.`
  }
  if (primary.name) return setsPrimary ? `This replaces ${primary.name} as your primary name.` : `Your primary name is ${primary.name}.`
  return setsPrimary ? `This replaces your Dusk address's link to ${linked}.` : `Your Dusk address is still linked to ${linked}, which isn't working as a primary name.`
}

/** What the person saw as they pressed Register: the switch, and the read of the primary name its note is about. */
export type PrimaryShown = { setsPrimary: boolean; primary: WalletPrimary }

const confirmAsk = 'Press Register again to confirm, or turn off Primary name.'
const unreadAsk = 'Can\'t check your wallet\'s primary name. Try again, or turn off Primary name to register without it.'

/** Whether a message is a question revealSetsPrimary asks about the switch, which the switch answers. */
export const isPrimaryAsk = (message: string) => message === unreadAsk || message.endsWith(` ${confirmAsk}`)

/**
 * Whether the reveal sets the new name as primary, from `fresh`, a read made for the reveal. A default
 * follows that read, so it never replaces a primary name. Turning the switch on replaces one only when
 * Register was pressed while its note named that name (`shown`); otherwise the person is asked. Register
 * on a saved reservation shows nothing first, so it asks. Off never touches the primary name.
 */
export function revealSetsPrimary(choice: boolean | null, fresh: WalletPrimary, claim: string, shown?: PrimaryShown): { setsPrimary: boolean } | { ask: string } {
  const wanted = shown ? shown.setsPrimary : choice ?? claimSetsPrimary(null, fresh, claim)
  if (!wanted) return { setsPrimary: false }
  if (fresh.status !== 'ready') return choice ? { ask: unreadAsk } : { setsPrimary: false }
  const linked = linkOf(fresh)
  if (linked === null || clearedByClaim(linked, claim)) return { setsPrimary: true }
  if (!choice) return { setsPrimary: false }
  const seen = shown?.setsPrimary ? linkOf(shown.primary) : null
  if (seen !== null && lower(seen) === lower(linked)) return { setsPrimary: true }
  return { ask: `${primaryNameNote(fresh, true, claim)} ${confirmAsk}` }
}

type ChainPrimaryReads = Pick<DuskDomainsOnChainClient, 'getPrimaryName' | 'readPrimaryName'>

const canRead = (client: DuskDomainsIndexerClient | null, chain: ChainPrimaryReads | null) =>
  Boolean(chain || typeof client?.getPrimaryName === 'function')

/**
 * Reads the wallet's primary name. With a chain client, both the verified name and the stored link
 * come from the chain, which the indexer can lag behind. Without one, the indexer's verified name is
 * all there is. A failed read is `unknown`, never "no primary name".
 */
export async function readWalletPrimary(client: DuskDomainsIndexerClient | null, chain: ChainPrimaryReads | null, address: string): Promise<WalletPrimary> {
  if (!address || !canRead(client, chain)) return unknown
  const endpoint = { type: 'moonlight_address', value: address } as const
  try {
    if (chain) {
      const [verified, stored] = await Promise.all([chain.getPrimaryName(endpoint), chain.readPrimaryName(endpoint)])
      if (!verified.ok || !stored.ok) return unknown
      // Read a moment apart, the two agree unless the link changed in between. A verified name the
      // stored-link read missed is linked all the same, so such a change never reads as none.
      const link = stored.value?.name ?? verified.value
      return { status: 'ready', name: verified.value !== null && verified.value === link ? verified.value : null, stored: link }
    }
    return { status: 'ready', name: (await client!.getPrimaryName(endpoint)) ?? null, stored: null }
  } catch {
    return unknown
  }
}

/**
 * The connected wallet's primary name, read again for each claim (`claim` is the name being claimed,
 * or empty for none). `readFresh` reads it again now, for the reveal, and shows what it read.
 */
export function useWalletPrimary(client: DuskDomainsIndexerClient | null, chain: ChainPrimaryReads | null, address: string, claim: string) {
  const [read, setRead] = useState<{ key: string; order: number; primary: WalletPrimary } | null>(null)
  const started = useRef(0)
  const key = address && claim && canRead(client, chain) ? `${address}\n${claim}\n${chain ? 'chain' : 'indexer'}` : ''
  const shownKey = useRef(key)
  useEffect(() => { shownKey.current = key }, [key])
  // Only a read for the claim still shown is kept, and one that started later wins over an earlier one
  // that answers after it.
  const keep = useCallback((key: string, order: number, primary: WalletPrimary) => {
    if (key === shownKey.current) setRead(current => current?.key === key && current.order > order ? current : { key, order, primary })
  }, [])
  useEffect(() => {
    if (!key) return
    let current = true
    const order = ++started.current
    void readWalletPrimary(client, chain, address).then(primary => { if (current) keep(key, order, primary) })
    return () => { current = false }
  }, [address, chain, client, keep, key])
  const readFresh = async () => {
    if (!key) return unknown
    const order = ++started.current
    const primary = await readWalletPrimary(client, chain, address)
    keep(key, order, primary)
    return primary
  }
  return { primary: !key ? unknown : read?.key === key ? read.primary : loading, readFresh }
}

export function useWalletPrimaryName(client: DuskDomainsIndexerClient | null, chain: ChainPrimaryReads | null, address: string, claim: string): WalletPrimary {
  return useWalletPrimary(client, chain, address, claim).primary
}
