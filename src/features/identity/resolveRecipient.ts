import { analyzeName, contractPrincipalFromWalletAccount, isClaimableReferrer as isValidPublicKey, typedPrincipalFromWalletAccount, type DuskDomainsIndexerClient } from '../../names/internal'

export type ResolvedRecipient = { input: string; address: string; authority: string }

/** Resolve the payment address of a name, then derive its authority. Raw owner IDs
 * and contract IDs are deliberately not accepted by the address entry forms. */
export async function resolveRecipient(input: string, client: Pick<DuskDomainsIndexerClient, 'resolveForward' | 'getHealth'> | null): Promise<ResolvedRecipient> {
  const value = input.trim()
  let address = value
  if (/\.dusk$/i.test(value)) {
    const name = analyzeName(value)
    if (!name.canonical || name.status === 'invalid') throw new Error('Enter a valid .dusk name.')
    if (!client) throw new Error('Name lookup is unavailable. Enter a Dusk address instead.')
    const unavailable = 'This name cannot be verified as active. Enter a Dusk address instead.'
    let result
    try {
      const health = await client.getHealth()
      if (!health.ok) throw new Error(unavailable)
      result = await client.resolveForward(name.canonical)
      if (!(Date.parse(result.cache.staleAt) > Date.now())) {
        result = await client.resolveForward(name.canonical)
      }
    } catch {
      throw new Error(unavailable)
    }
    if (result.canonicalName !== name.canonical || result.verificationStatus !== 'forward_resolved'
      || !(Date.parse(result.cache.staleAt) > Date.now())
      || result.errors.length > 0 || result.expiry.status !== 'active' || result.resolver.health !== 'ok'
      || (result.expiry.expiresAt !== null && !(Date.parse(result.expiry.expiresAt) > Date.now()))) {
      throw new Error(unavailable)
    }
    address = result.records.find(record => record.key === 'moonlight_address')?.value ?? ''
    if (!address) throw new Error('This name has no Dusk address. Enter an address instead.')
  }
  const key = typedPrincipalFromWalletAccount(address)
  if (!key.ok || key.source !== 'moonlight_account' || !await isValidPublicKey(key.principal)) {
    throw new Error('Enter a Dusk address with a valid public key.')
  }
  const parsed = contractPrincipalFromWalletAccount(address)
  if (!parsed.ok || parsed.source !== 'moonlight_account') throw new Error('Enter a Dusk address or a .dusk name with a Dusk address.')
  return { input: value, address, authority: parsed.principal }
}
