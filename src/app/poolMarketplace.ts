import { contractIdFromOutput, directoryConfigRequest, type DuskDomainsOnChainReadTransport } from '../names/internal'

export async function readPoolMarketplace(read: DuskDomainsOnChainReadTransport): Promise<string | null> {
  try {
    const response = await read.read(directoryConfigRequest())
    const config = response && typeof response === 'object' && 'output' in response ? response.output : response
    if (!config || typeof config !== 'object' || !('marketplace' in config)) return null
    return contractIdFromOutput(config.marketplace)
  } catch { /* An unavailable pool config must not enable contract-owned renewal. */ }
  return null
}
