import type { FrozenClient } from '@duskdomains/sdk'
import { contractIdFromOutput } from '../names/internal'

/**
 * The market the directory prefers now, from the directory's state at one height, and whether that state
 * came with the directory's record of the market, checked against this site's release. Unknown when the
 * state can't be read: an unavailable pool config must not enable contract-owned renewal.
 */
export async function readPoolMarketplace(client: Pick<FrozenClient, 'bootstrap'> | null): Promise<{ preferred: string | null; recorded: boolean }> {
  try {
    const state = await client?.bootstrap()
    const preferred = state?.config.preferred_marketplace ? contractIdFromOutput(state.config.preferred_marketplace) : null
    return { preferred, recorded: Boolean(preferred && state?.market && contractIdFromOutput(state.market.id) === preferred) }
  } catch {
    return { preferred: null, recorded: false }
  }
}
