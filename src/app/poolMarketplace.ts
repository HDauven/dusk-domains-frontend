import { routerConfigCall, type DuskDomainsOnChainReadTransport } from '../names/internal'

export async function readPoolMarketplace(read: DuskDomainsOnChainReadTransport): Promise<string | null> {
  try {
    const response = await read.read(routerConfigCall())
    const config = response && typeof response === 'object' && 'output' in response ? response.output : response
    if (!config || typeof config !== 'object' || !('marketplace' in config)) return null
    const id = config.marketplace
    if (typeof id === 'string' && /^(?:0x)?[a-f0-9]{64}$/i.test(id)) return `0x${id.toLowerCase().replace(/^0x/, '')}`
    if (Array.isArray(id) && id.length === 32 && id.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
      return `0x${id.map(byte => byte.toString(16).padStart(2, '0')).join('')}`
    }
  } catch { /* An unavailable pool config must not enable contract-owned renewal. */ }
  return null
}
