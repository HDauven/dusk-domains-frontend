import { roles, type DuskDomainsIndexerHealth, type DuskDomainsRuntimeConfig } from '../names/internal'

export const DEPLOYMENT_MISMATCH = 'deployment_mismatch'
export const UNVERIFIED_INDEXER = 'Name data for this network can’t be verified right now.'

const normalized = (id: unknown) => typeof id === 'string' ? id.trim().toLowerCase().replace(/^0x/, '') : ''

/**
 * Why the indexer's reported deployment isn't this site's, or null when it is. A healthy indexer of
 * another network or deployment must not be trusted: its names, prices and pause aren't this site's.
 * The indexer must call its deployment record complete, with no missing or conflicted contract, and
 * report this site's contract first for each role; contracts admitted later, such as a replacement
 * policy, are listed beside it. A field it leaves out counts against it.
 */
export function indexerDeploymentMismatch(
  health: Pick<DuskDomainsIndexerHealth, 'deployment'>,
  expected: Pick<DuskDomainsRuntimeConfig, 'chainId' | 'contracts'>,
): string | null {
  const deployment = health.deployment
  if (!deployment || typeof deployment !== 'object') return 'The indexer reports no deployment.'
  const chains = [deployment.chainId, ...(Array.isArray(deployment.chainIds) ? deployment.chainIds : [])].filter(Boolean)
  if (!chains.length || chains.some(chain => chain !== expected.chainId)) return `The indexer serves ${chains.join(', ') || 'no network'}, not ${expected.chainId}.`
  if (deployment.complete !== true) return 'The indexer’s deployment record is incomplete.'
  if (!Array.isArray(deployment.missingContracts) || deployment.missingContracts.length) return 'The indexer’s deployment record misses a contract.'
  if (!Array.isArray(deployment.conflictedContracts) || deployment.conflictedContracts.length) return 'The indexer’s deployment record has conflicting contracts.'
  for (const role of roles) {
    const configured = normalized(expected.contracts[role]?.contractId)
    if (!configured) continue
    const reported = deployment.contracts?.[role]
    if (!reported || reported.contractIdConflict !== false) return `The indexer’s ${role} record conflicts.`
    if (normalized(reported.contractId) !== configured) return `The indexer’s ${role} is not this site’s.`
  }
  return null
}

/** Health with the deployment checked: a mismatch is reported as unhealthy, with why. */
export function verifiedHealth<T extends DuskDomainsIndexerHealth>(health: T, expected?: Pick<DuskDomainsRuntimeConfig, 'chainId' | 'contracts'>): T {
  const mismatch = expected ? indexerDeploymentMismatch(health, expected) : null
  if (!mismatch) return health
  return { ...health, ok: false, warnings: [...(Array.isArray(health.warnings) ? health.warnings : []), { code: DEPLOYMENT_MISMATCH, message: mismatch }] }
}

export function isDeploymentMismatch(health: Pick<DuskDomainsIndexerHealth, 'warnings'> | null | undefined) {
  return Boolean(health && Array.isArray(health.warnings) && health.warnings.some(warning => warning?.code === DEPLOYMENT_MISMATCH))
}

/** Degradations under which the indexer keeps serving its last complete publication. */
const SERVES_LAST_PUBLICATION = new Set(['collector_blocked', 'archive_not_caught_up'])
export type StaleIndexerData = { code: 'collector_blocked' | 'archive_not_caught_up'; blockHeight: number }

/**
 * The publication an unhealthy indexer still serves, or null when it serves none to trust. A blocked
 * or catching-up collector leaves the last complete publication in place, at projectionBlockHeight,
 * and it can be shown as stale. Every other unhealthy state stays unread: another deployment,
 * unverified history, a rejected publication, a replay warning, or no complete publication.
 */
export function staleIndexerData(health: Pick<DuskDomainsIndexerHealth, 'ok' | 'warnings' | 'degradedReason' | 'projectionBlockHeight'> | null | undefined): StaleIndexerData | null {
  if (!health || health.ok || isDeploymentMismatch(health)) return null
  const code = health.degradedReason?.code
  if (code !== 'collector_blocked' && code !== 'archive_not_caught_up') return null
  const warnings = Array.isArray(health.warnings) ? health.warnings : []
  if (warnings.some(warning => !SERVES_LAST_PUBLICATION.has(String(warning?.code)))) return null
  const blockHeight = health.projectionBlockHeight
  if (typeof blockHeight !== 'number' || !Number.isSafeInteger(blockHeight) || blockHeight < 0) return null
  return { code, blockHeight }
}

/** Whether the indexer's data may be shown: it is healthy, or it serves its last complete publication. */
export function indexerReadable(health: Parameters<typeof staleIndexerData>[0]) {
  return Boolean(health?.ok) || staleIndexerData(health) !== null
}
