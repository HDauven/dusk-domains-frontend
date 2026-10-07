import { contractId, parseJson, validateReleaseManifest, type ReleaseManifest } from '@duskdomains/sdk'
import { manifestFromConfig, roles, type DuskDomainsRuntimeConfig } from './config'

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid deployment manifest object')
  return value as Record<string, unknown>
}

/** Convert the deploy tool's handoff to the SDK schema, preserving reviewed IDs and driver hashes. */
export function adaptDeploymentManifest(value: unknown): unknown {
  const manifest = object(value)
  if (manifest.schema !== 'dusk-domains/frozen-release/v1') return value
  if (!Array.isArray(manifest.contracts)) throw new Error('Missing deployment contracts')
  const artifacts = object(manifest.artifacts)
  return {
    ...manifest,
    contracts: manifest.contracts.map((value) => {
      const entry = object(value)
      const role = String(entry.key)
      if (!(roles as readonly string[]).includes(role))
        throw new Error(`Unknown deployment role ${role}`)
      const driver = object(object(artifacts[role]).driver)
      if (typeof driver.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(driver.sha256))
        throw new Error(`Missing deployment driver checksum for ${role}`)
      return { role, contractId: entry.id, codeHash: entry.codeHash, dataDriver: driver }
    }),
  }
}

/** URLs in deployment manifests are relative to the manifest's directory. */
export async function configuredReleaseManifest(
  config: DuskDomainsRuntimeConfig,
  origin: string,
): Promise<ReleaseManifest> {
  if (!config.manifestUrl) return manifestFromConfig(config, origin)
  const url = new URL(config.manifestUrl, origin)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Manifest fetch failed: HTTP ${response.status}`)
  const manifest = validateReleaseManifest(adaptDeploymentManifest(parseJson(await response.text())), {
    nodeUrl: config.nodeUrl,
    indexerUrl: new URL(config.indexerUrl || '/api', origin).href,
  })
  // A manifest can carry its own consistent checksums, so bind each configured role to the
  // driver hash pinned in its configured immutable URL, not only to its contract ID.
  const pinned = (role: (typeof roles)[number]) =>
    /\.([a-f\d]{64})\.data-driver\.wasm$/i.exec(config.contracts[role]!.driverUrl)?.[1]?.toLowerCase()
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
  return {
    ...manifest,
    contracts: manifest.contracts.map((c) => ({
      ...c,
      dataDriver: { ...c.dataDriver, path: new URL(c.dataDriver.path, url).href },
    })),
  }
}
