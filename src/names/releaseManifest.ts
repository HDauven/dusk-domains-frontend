import { contractId, parseJson, validateReleaseManifest, type LensContract, type ReleaseManifest } from '@duskdomains/sdk'
import { manifestFromConfig, roles, type DuskDomainsRuntimeConfig } from './config'

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid deployment manifest object')
  return value as Record<string, unknown>
}

function checksummed(driver: unknown, role: string): Record<string, unknown> {
  const artifact = driver && typeof driver === 'object' ? driver as Record<string, unknown> : {}
  if (typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(artifact.sha256))
    throw new Error(`Missing deployment driver checksum for ${role}`)
  return artifact
}

/**
 * The handoff's read lens as the SDK's top-level `lens`, or undefined when the handoff has none. The
 * deploy tool keeps it out of the six frozen roles: a top-level `lens` deployment (`id`, `codeHash`,
 * `initHash` of its `init: { directory }`) with its driver in `artifacts.lens.driver`.
 */
export function adaptHandoffLens(manifest: Record<string, unknown>): Record<string, unknown> | undefined {
  if (manifest.lens == null) return undefined
  const lens = object(manifest.lens),
    artifacts = manifest.artifacts && typeof manifest.artifacts === 'object' ? manifest.artifacts as Record<string, unknown> : {},
    artifact = artifacts.lens && typeof artifacts.lens === 'object' ? artifacts.lens as Record<string, unknown> : {}
  return {
    role: 'lens',
    contractId: lens.id,
    codeHash: lens.codeHash,
    ...(lens.initHash == null ? {} : { initHash: lens.initHash }),
    dataDriver: checksummed(artifact.driver, 'lens'),
  }
}

/**
 * Convert the deploy tool's handoff to the SDK schema, preserving reviewed IDs, code and init
 * commitments and driver hashes.
 */
export function adaptDeploymentManifest(value: unknown): unknown {
  const manifest = object(value)
  if (manifest.schema !== 'dusk-domains/frozen-release/v1') return value
  if (!Array.isArray(manifest.contracts)) throw new Error('Missing deployment contracts')
  const artifacts = object(manifest.artifacts)
  const lens = adaptHandoffLens(manifest)
  return {
    ...withoutLens(manifest),
    contracts: manifest.contracts.map((value) => {
      const entry = object(value)
      const role = String(entry.key)
      if (!(roles as readonly string[]).includes(role))
        throw new Error(`Unknown deployment role ${role}`)
      return {
        role,
        contractId: entry.id,
        codeHash: entry.codeHash,
        ...(entry.initHash == null ? {} : { initHash: entry.initHash }),
        dataDriver: checksummed(object(artifacts[role]).driver, role),
      }
    }),
    ...(lens ? { lens } : {}),
  }
}

/** The manifest without its lens: a release read so loads no lens driver, and every read is direct. */
function withoutLens<T extends object>(manifest: T): T {
  const release: T & { lens?: unknown } = { ...manifest }
  delete release.lens
  return release
}

const pinnedHash = (driverUrl: string) => /\.([a-f\d]{64})\.data-driver\.wasm$/i.exec(driverUrl)?.[1]?.toLowerCase()

/**
 * The manifest's lens if it is the one this build pins: that contract, with its pinned driver. Any other
 * lens is not used, and every read is direct, as without one. Deploy validation refuses such a deploy.
 */
function pinnedLens(config: DuskDomainsRuntimeConfig, lens: LensContract | undefined): LensContract | undefined {
  const pin = config.lens,
    hash = pin && pinnedHash(pin.driverUrl)
  if (!lens || !pin || !hash) return undefined
  return lens.contractId === contractId(pin.contractId) && lens.dataDriver.sha256?.toLowerCase() === hash ? lens : undefined
}

/** URLs in deployment manifests are relative to the manifest's directory. */
export async function configuredReleaseManifest(
  config: DuskDomainsRuntimeConfig,
  origin: string,
): Promise<ReleaseManifest> {
  if (!config.manifestUrl) return manifestFromConfig(config, origin)
  const url = new URL(config.manifestUrl, origin)
  // Revalidate: an operator republishes it to list contracts admitted later, such as a replacement policy.
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Manifest fetch failed: HTTP ${response.status}`)
  const published = object(parseJson(await response.text()))
  const manifest = validateReleaseManifest(adaptDeploymentManifest(config.lens ? published : withoutLens(published)), {
    nodeUrl: config.nodeUrl,
    indexerUrl: new URL(config.indexerUrl || '/api', origin).href,
  })
  // A manifest can carry its own consistent checksums, so bind each configured role to the
  // driver hash pinned in its configured immutable URL, not only to its contract ID.
  const pinned = (role: (typeof roles)[number]) => pinnedHash(config.contracts[role]!.driverUrl)
  // The SDK loads every entry, and later admissions resolve through this manifest too:
  // each loadable entry must use its role's pinned driver. A new driver needs new pins.
  const unpinned = manifest.contracts.some((c) => {
    const hash = (roles as readonly string[]).includes(c.role)
      ? pinned(c.role as (typeof roles)[number])
      : undefined
    return !hash || c.dataDriver.sha256?.toLowerCase() !== hash
  })
  if (
    unpinned ||
    manifest.chainId !== config.chainId ||
    roles.some((role) => {
      const hash = pinned(role)
      return (
        !hash ||
        !manifest.contracts.some(
          (c) =>
            c.role === role &&
            c.contractId === contractId(config.contracts[role]!.contractId) &&
            c.dataDriver.sha256?.toLowerCase() === hash,
        )
      )
    })
  )
    throw new Error('Deployment manifest does not match the configured network and contracts.')
  const lens = pinnedLens(config, manifest.lens)
  if (manifest.lens && !lens)
    console.warn('The deployment manifest lists a read lens this site does not pin, so it reads directly.')
  const relative = <T extends { dataDriver: { path: string } }>(c: T): T => ({
    ...c,
    dataDriver: { ...c.dataDriver, path: new URL(c.dataDriver.path, url).href },
  })
  return {
    ...withoutLens(manifest),
    contracts: manifest.contracts.map(relative),
    ...(lens ? { lens: relative(lens) } : {}),
  }
}
