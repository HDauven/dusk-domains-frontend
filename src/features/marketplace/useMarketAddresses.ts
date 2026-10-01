import { useEffect, useState } from 'react'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import { ownerAddressCandidates } from '../identity/ownerLabel'

// These are only candidates. OwnerLabel verifies each address against the chain authority.
export function useMarketAddresses(client: DuskDomainsIndexerClient | null, names: string[], enabled: boolean) {
  const key = [...new Set(names)].sort().join(',')
  const [addresses, setAddresses] = useState<string[]>([])
  useEffect(() => {
    if (!client || !enabled || !key) return
    let disposed = false
    void Promise.all(key.split(',').map(async name => {
      try { return await client.getRecords(name) } catch { return [] }
    })).then(records => {
      if (!disposed) setAddresses(ownerAddressCandidates(records.flat()))
    })
    return () => { disposed = true }
  }, [client, enabled, key])
  return addresses
}
