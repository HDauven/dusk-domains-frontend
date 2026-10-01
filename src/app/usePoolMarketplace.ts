import { useEffect, useState } from 'react'
import type { DuskDomainsOnChainReadTransport } from '../names/internal'
import { readPoolMarketplace } from './poolMarketplace'

export function usePoolMarketplace(read: DuskDomainsOnChainReadTransport | null) {
  const [result, setResult] = useState<{ read: DuskDomainsOnChainReadTransport; id: string | null } | null>(null)
  useEffect(() => {
    if (!read) return
    let current = true
    void readPoolMarketplace(read).then(id => { if (current) setResult({ read, id }) })
    return () => { current = false }
  }, [read])
  return result?.read === read ? result?.id ?? null : null
}
