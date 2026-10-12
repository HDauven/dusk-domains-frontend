import { useCallback, useEffect, useState } from 'react'
import { useAutoRefresh } from '../../app/useAutoRefresh'
import { PREVIEW_QUOTE_ACTOR } from '../../names/reads'
import type { DuskDomainsOnChainClient, NameResult } from '../../names/internal'
import type { RegistrationQuote, RenewalQuote, NameRef } from '@duskdomains/sdk'

/**
 * Fresh SDK quotes for the name shown. They are read again when the block height or `refreshKey`
 * changes (the indexer's policy version, for one) and at the app's normal refresh cadence, so a
 * governance SetPolicy shows its prices without a reload. The last quote stays shown meanwhile.
 */
export function useLiveQuotes(
  client: DuskDomainsOnChainClient | null | undefined,
  result: NameResult | null,
  years: number,
  renewalYears: number,
  actor: string,
  height: number | null,
  refreshKey?: unknown,
) {
  const name = result?.canonical ?? '',
    status = result?.status
  const scope = `${name}:${years}:${renewalYears}:${actor}:${status}`
  const [state, setState] = useState<{
    scope: string
    client?: DuskDomainsOnChainClient
    registration?: RegistrationQuote
    renewal?: RenewalQuote
    ref?: NameRef
    error?: string
  }>({ scope: '' })
  const quotable = Boolean(client && name && name.split('.').length === 2 && ['available', 'registered'].includes(status ?? ''))
  const [refreshes, setRefreshes] = useState(0)
  const refresh = useCallback(() => setRefreshes(count => count + 1), [])
  useAutoRefresh(refresh, quotable)
  useEffect(() => {
    if (!client || !quotable) return
    let active = true
    const run = async () => {
      try {
        if (status === 'available') {
          const q = await client.getRegistrationQuote(name, years, actor || PREVIEW_QUOTE_ACTOR)
          if (!q.ok) throw new Error(q.error.message)
          if (active) setState({ scope, client, registration: q.value.quote })
        } else {
          const q = await client.getRenewalQuote(name, renewalYears)
          if (!q.ok) throw new Error(q.error.message)
          if (active) setState({ scope, client, renewal: q.value.quote, ref: q.value.ref })
        }
      } catch (e) {
        if (active) setState({ scope, client, error: e instanceof Error ? e.message : String(e) })
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [client, quotable, name, status, years, renewalYears, actor, height, refreshKey, refreshes, scope])
  return state.scope === scope && state.client === client ? state : null
}
