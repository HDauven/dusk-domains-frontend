import type { ContractRole, ReleaseManifest } from '@duskdomains/sdk'
import type { DuskDomainContractMap } from './commandTypes'
export type DuskDomainsRuntimeEnv = Record<string, string | boolean | undefined>
export type DuskDomainsRuntimeConfig = {
  mode: 'preview' | 'live_ready'
  contracts: DuskDomainContractMap
  capabilities: { marketplace: boolean; referralAttribution: boolean; referralRewardClaims: boolean }
  launchLinks: {
    support: string | null
    abuse: string | null
    security: string | null
    status: string | null
  }
  indexerUrl: string | null
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
export function createDuskDomainsRuntimeConfig(env: DuskDomainsRuntimeEnv = {}): DuskDomainsRuntimeConfig {
  const get = (key: string) => String(env[`VITE_DUSK_DOMAINS_${key}`] ?? '').trim()
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
  const indexerUrl = validUrl(get('INDEXER_URL')) ? get('INDEXER_URL') : null
  if (!indexerUrl) missingLiveInputs.push('VITE_DUSK_DOMAINS_INDEXER_URL')
  const chainId = /^dusk:[0-3]$/.test(get('CHAIN_ID')) ? get('CHAIN_ID') : 'dusk:2'
  const nodeUrl = get('NODE_URL') || 'https://testnet.nodes.dusk.network'
  const launchLinks = Object.fromEntries(
    ['support', 'abuse', 'security', 'status'].map((key) => [
      key,
      validUrl(get(`${key.toUpperCase()}_URL`)) || get(`${key.toUpperCase()}_URL`).startsWith('mailto:')
        ? get(`${key.toUpperCase()}_URL`)
        : null,
    ]),
  ) as DuskDomainsRuntimeConfig['launchLinks']
  return {
    contracts,
    mode: missingLiveInputs.length ? 'preview' : 'live_ready',
    indexerUrl,
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
