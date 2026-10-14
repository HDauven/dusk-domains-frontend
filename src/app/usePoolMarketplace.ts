import { useCallback, useEffect, useRef, useState } from 'react'
import type { FrozenClient } from '@duskdomains/sdk'
import { contractIdFromOutput, type DuskDomainsOnChainReadTransport } from '../names/internal'
import { CLIENT_RESET_EVENT } from './duskDomainsLiveApp'
import { readPoolMarketplace } from './poolMarketplace'
import { useAutoRefresh } from './useAutoRefresh'

const none: string[] = []
type PoolMarketplace = { read: DuskDomainsOnChainReadTransport; client: FrozenClient | null; preferred: string | null; known: string[] }

/**
 * The market contracts in this site's release that verify. A read verifies a contract once per client;
 * one that fails verification is never listed, though SDK 0.3.2 leaves it in the release.
 */
async function releaseMarketplaces(client: FrozenClient | null) {
  const ids = [...client?.release?.contracts.entries() ?? []].filter(([, contract]) => contract.role === 'marketplace').map(([id]) => id)
  const verified = await Promise.all(ids.map(async id => {
    try {
      await client!.marketplace(id).order_api_version()
      return contractIdFromOutput(id)
    } catch { return null }
  }))
  return verified.filter((id): id is string => Boolean(id))
}

/**
 * The market the directory prefers now, and every market of this site's release that verifies, the
 * preferred one included only if it does. A SetPreferredMarketplace can execute at any time once it
 * is ready, so the preference is read again at the app's refresh cadence, after a confirmed write
 * and when the page regains focus, not once per page load. What a client gave is dropped once the
 * live app discards that client.
 */
export function usePoolMarketplace(read: DuskDomainsOnChainReadTransport | null) {
  const [result, setResult] = useState<PoolMarketplace | null>(null)
  // Only the latest read lands, so an older, slower one can't bring back a previous market.
  const latest = useRef(0)
  const load = useCallback(async () => {
    if (!read) return
    const request = ++latest.current
    const client = await Promise.resolve(read.client).catch(() => null) ?? null
    const [preferred, listed] = await Promise.all([readPoolMarketplace(read), releaseMarketplaces(client)])
    // A client discarded meanwhile, such as after a failed verification, publishes nothing.
    if (request !== latest.current || (client && read.isCurrentClient?.(client) === false)) return
    const known = preferred && listed.includes(preferred) ? [preferred, ...listed.filter(id => id !== preferred)] : listed
    setResult({ read, client, preferred, known })
  }, [read])
  useEffect(() => { void load() }, [load])
  useAutoRefresh(load, Boolean(read))
  // A discarded client's markets go at once. The next refresh reads them from the client that replaces it.
  useEffect(() => {
    if (!read) return
    const reset = () => {
      latest.current += 1
      setResult(current => current?.client && read.isCurrentClient?.(current.client) === false ? null : current)
    }
    globalThis.addEventListener?.(CLIENT_RESET_EVENT, reset)
    return () => globalThis.removeEventListener?.(CLIENT_RESET_EVENT, reset)
  }, [read])
  const fresh = result?.read === read && !(result.client && read?.isCurrentClient?.(result.client) === false) ? result : null
  return { preferred: fresh?.preferred ?? null, known: fresh?.known ?? none }
}
