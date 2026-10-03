import { contractIdFromOutput } from '../names/internal'

// Name authorities are untyped: a wallet hash and a contract ID are both 32 bytes.
export async function isDeployedContract(
  nodeUrl: string,
  authority: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const id = contractIdFromOutput(authority.trim())
    if (!nodeUrl || !id) return false
    const response = await fetchImpl(new URL(`/on/contract:${id.slice(2)}/metadata`, nodeUrl), {
      method: 'POST',
      signal,
      headers: { Accept: 'application/json', 'rusk-version': '1.0.0-rc.0' },
    })
    if (!response.ok) return false
    const metadata = await response.json() as { contract_owner?: unknown }
    // Rusk can return 200 with an empty owner when the contract does not exist.
    return typeof metadata?.contract_owner === 'string' && /^(?:[a-f0-9]{2})+$/i.test(metadata.contract_owner)
  } catch {
    return false
  }
}
