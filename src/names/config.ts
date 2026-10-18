import type { ContractRole, ReleaseManifest } from '@duskdomains/sdk'
import { runtimeChainId, runtimeEnvValue, runtimeUsesLens } from './runtimeEnv'
import type { DuskDomainContractMap } from './commandTypes'
export type DuskDomainsRuntimeEnv = Record<string, string | boolean | undefined>
/** An app that supports .dusk names, with an optional https link. */
export type NameIntegration = { name: string; url: string | null }
/** Wallets that can send to a .dusk name and explorers that show .dusk names. Empty until support ships. */
export type NameSupport = { wallets: NameIntegration[]; explorers: NameIntegration[] }
/** The read lens a build pins: its contract and the immutable URL of its reviewed driver. */
export type PinnedLens = { contractId: string; driverUrl: string }
export type DuskDomainsRuntimeConfig = {
  mode: 'preview' | 'live_ready'
  contracts: DuskDomainContractMap
  /**
   * The read lens this build pins. The site reads through a manifest's lens only when it is this
   * contract with this driver. Null without one, or when `VITE_DUSK_DOMAINS_USE_LENS=false` turns the
   * lens off: every read is then direct.
   */
  lens: PinnedLens | null
  capabilities: { marketplace: boolean; referralAttribution: boolean; referralRewardClaims: boolean }
  launchLinks: {
    support: string | null
    abuse: string | null
    security: string | null
    status: string | null
  }
  indexerUrl: string | null
  /** A block explorer origin, such as https://explorer.dusk.network, for transaction links. */
  explorerUrl: string | null
  nameSupport: NameSupport
  nodeUrl: string
  chainId: string
  liveWritesEnabled: boolean
  missingLiveInputs: string[]
  warnings: string[]
  manifestUrl: string | null
}
export const roles = ['directory', 'policy', 'store', 'vault', 'resolver', 'marketplace'] as const
export const isPlaceholderContractId = (id: string) =>
  !/^(?:0x)?[a-f\d]{64}$/i.test(id) || /^0x?0+$/.test(id) || /^0+$/.test(id)
const validUrl = (value: string) => /^\/(?!\/)/.test(value) || /^https?:\/\//.test(value)
// Comma-separated entries, each "Name" or "Name|https://link". A link that isn't plain https is dropped,
// and a name listed again, in any case, keeps its first entry.
function nameIntegrations(value: string): NameIntegration[] {
  const seen = new Set<string>()
  return value.split(',').map(entry => entry.trim()).filter(Boolean).map(entry => {
    const [name, link = ''] = entry.split(/\|(.*)/s).map(part => part.trim())
    return { name, url: /^https:\/\/[^\s"'<>]+$/.test(link) ? link : null }
  }).filter(entry => {
    const key = entry.name.toLowerCase()
    if (!entry.name || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export function createDuskDomainsRuntimeConfig(env: DuskDomainsRuntimeEnv = {}): DuskDomainsRuntimeConfig {
  const get = (key: string) => runtimeEnvValue(env, key)
  const flag = (key: string) => /^(true|1|yes|on)$/i.test(get(key))
  const missingLiveInputs: string[] = [],
    warnings: string[] = []
  const contracts = Object.fromEntries(
    roles.map((role) => {
      const id = get(`${role.toUpperCase()}_CONTRACT_ID`),
        driverUrl = get(`${role.toUpperCase()}_DRIVER_URL`)
      if (isPlaceholderContractId(id))
        missingLiveInputs.push(`VITE_DUSK_DOMAINS_${role.toUpperCase()}_CONTRACT_ID`)
      if (!validUrl(driverUrl) || !/\.[a-f\d]{64}\.data-driver\.wasm$/i.test(driverUrl))
        missingLiveInputs.push(`VITE_DUSK_DOMAINS_${role.toUpperCase()}_DRIVER_URL`)
      return [role, { contractId: id || '0x' + '0'.repeat(64), driverUrl, name: role, methodSigs: {} }]
    }),
  ) as DuskDomainContractMap
  // The lens is optional: without both pins every read is direct, as with the lens turned off.
  const lensId = get('LENS_CONTRACT_ID'),
    lensDriverUrl = get('LENS_DRIVER_URL')
  const lensPinned = !isPlaceholderContractId(lensId) && validUrl(lensDriverUrl) && /\.[a-f\d]{64}\.data-driver\.wasm$/i.test(lensDriverUrl)
  if ((lensId || lensDriverUrl) && !lensPinned)
    warnings.push('The read lens needs both VITE_DUSK_DOMAINS_LENS_CONTRACT_ID and an immutable VITE_DUSK_DOMAINS_LENS_DRIVER_URL; reading directly.')
  const lens = lensPinned && runtimeUsesLens(env) ? { contractId: lensId, driverUrl: lensDriverUrl } : null
  const indexerUrl = validUrl(get('INDEXER_URL')) ? get('INDEXER_URL') : null
  if (!indexerUrl) missingLiveInputs.push('VITE_DUSK_DOMAINS_INDEXER_URL')
  const chainId = runtimeChainId(env)
  const nodeUrl = get('NODE_URL') || 'https://testnet.nodes.dusk.network'
  const launchLinks = Object.fromEntries(
    ['support', 'abuse', 'security', 'status'].map((key) => [
      key,
      validUrl(get(`${key.toUpperCase()}_URL`)) || get(`${key.toUpperCase()}_URL`).startsWith('mailto:')
        ? get(`${key.toUpperCase()}_URL`)
        : null,
    ]),
  ) as DuskDomainsRuntimeConfig['launchLinks']
  const explorer = get('EXPLORER_URL').replace(/\/+$/, '')
  return {
    contracts,
    lens,
    mode: missingLiveInputs.length ? 'preview' : 'live_ready',
    indexerUrl,
    explorerUrl: /^https?:\/\/[^/\s?#]+(?:\/[^\s?#]*)?$/.test(explorer) ? explorer : null,
    nameSupport: { wallets: nameIntegrations(get('NAME_WALLETS')), explorers: nameIntegrations(get('NAME_EXPLORERS')) },
    nodeUrl,
    chainId,
    liveWritesEnabled: flag('ENABLE_LIVE_WRITES'),
    capabilities: {
      marketplace: flag('ENABLE_MARKETPLACE') && !isPlaceholderContractId(contracts.marketplace!.contractId),
      referralAttribution: flag('ENABLE_REFERRAL_ATTRIBUTION'),
      referralRewardClaims: flag('ENABLE_REFERRAL_CLAIMS'),
    },
    launchLinks,
    missingLiveInputs,
    warnings,
    manifestUrl: get('MANIFEST_URL') || null,
  }
}
/** Immutable deploy paths carry the SHA-256 of the driver, checked by the SDK loader. */
export function manifestFromConfig(config: DuskDomainsRuntimeConfig, origin: string): ReleaseManifest {
  return {
    chainId: config.chainId,
    network: Number(config.chainId.split(':')[1]),
    nodeUrl: config.nodeUrl,
    indexerUrl: new URL(config.indexerUrl || '/api', origin).href,
    contracts: roles.map((role) => {
      const c = config.contracts[role]!
      const hash = /\.([a-f\d]{64})\.data-driver\.wasm$/i.exec(c.driverUrl)?.[1]
      if (!hash) throw new Error(`Missing immutable driver hash for ${role}`)
      return {
        role: role as ContractRole,
        contractId: c.contractId,
        dataDriver: { path: new URL(c.driverUrl, origin).href, sha256: hash.toLowerCase() },
      }
    }),
  }
}
