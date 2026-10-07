import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { contractId, FrozenClient, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv } from '../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'
import { adaptDeploymentManifest, configuredReleaseManifest } from '../names/releaseManifest'

const roots: string[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }))
})

it('validates every real handoff filename and rejects changed driver bytes', () => {
  mkdirSync('node_modules/.cache', { recursive: true })
  const root = mkdtempSync(resolve('node_modules/.cache/handoff-'))
  roots.push(root)
  mkdirSync(`${root}/public/contracts`, { recursive: true })
  for (const role of roles)
    writeFileSync(`${root}/public/${handoff.artifacts[role].driver.path}`, handoffDriver(role))
  const run = () =>
    spawnSync(
      process.execPath,
      [resolve('scripts/validate-deploy.mjs'), resolve('src/test/handoff/frontend.env')],
      { cwd: root, encoding: 'utf8' },
    )
  const valid = run()
  expect(valid.status, valid.stderr).toBe(0)
  for (const role of roles) {
    const path = `${root}/public/${handoff.artifacts[role].driver.path}`
    writeFileSync(path, new Uint8Array([0]))
    const invalid = run()
    expect(invalid.status).not.toBe(0)
    expect(invalid.stderr).toContain('Driver checksum mismatch')
    writeFileSync(path, handoffDriver(role))
  }
})

it.each([false, true])(
  'initializes the live app with real handoff drivers (manifest=%s)',
  async (useManifest) => {
    // This integration covers configuration, manifest loading and real drivers, without a node.
    vi.spyOn(FrozenClient.prototype, 'discover').mockResolvedValue({} as never)
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(handoff))
      const role = roles.find(
        (role) =>
          url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}` ||
          url.pathname === `/${handoff.artifacts[role].driver.path}`,
      )
      if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
      throw new Error(`Unexpected network request: ${url}`)
    })
    vi.stubGlobal('fetch', fetcher)
    const runtimeConfig = createDuskDomainsRuntimeConfig({
      ...handoffEnv,
      VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
      ...(useManifest ? { VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' } : {}),
    })
    expect(runtimeConfig.mode).toBe('live_ready')
    const { names } = createDuskDomainsLiveApp({
      runtimeConfig,
      wallet: { state: { chainId: 'dusk:0' } } as never,
      session: { state: {} } as never,
    })
    const client = await names.client!
    expect(client.release.manifest.chainId).toBe('dusk:0')
    expect(client.release.drivers.size).toBe(6)
    for (const role of roles) {
      const id = contractId(runtimeConfig.contracts[role]!.contractId)
      expect(client.release.contracts.get(id)?.role).toBe(role)
      expect(client.release.drivers.get(id)?.version()).toBe('1.0.0')
    }
    expect(fetcher).toHaveBeenCalledTimes(useManifest ? 7 : 6)
  },
)

it('requires a configured indexer and preserves IDs from the emitted indexer handoff', async () => {
  const { readFileSync } = await import('node:fs')
  const { parseEnv } = await import('node:util')
  expect(createDuskDomainsRuntimeConfig(handoffEnv)).toMatchObject({
    mode: 'preview',
    missingLiveInputs: ['VITE_DUSK_DOMAINS_INDEXER_URL'],
  })
  const indexer = parseEnv(readFileSync('src/test/handoff/indexer.env', 'utf8'))
  for (const role of roles)
    expect(indexer[`DUSK_DOMAINS_${role.toUpperCase()}_CONTRACT_ID`]).toBe(
      handoffEnv[`VITE_DUSK_DOMAINS_${role.toUpperCase()}_CONTRACT_ID`],
    )
})

it.each(['chain', 'role', 'missing_hash', 'changed_driver', 'repinned_driver'] as const)(
  'rejects a handoff with %s before client readiness',
  async (fault) => {
    const manifest = structuredClone(handoff)
    if (fault === 'chain') manifest.chainId = 'dusk:1'
    if (fault === 'role') {
      const store = manifest.contracts.find((c: { key: string }) => c.key === 'store')
      const resolver = manifest.contracts.find((c: { key: string }) => c.key === 'resolver')
      ;[store.id, resolver.id] = [resolver.id, store.id]
    }
    if (fault === 'missing_hash') delete manifest.artifacts.store.driver.sha256
    // Internally consistent: another real driver with its own matching checksum.
    if (fault === 'repinned_driver') manifest.artifacts.store.driver = structuredClone(manifest.artifacts.resolver.driver)
    const discover = vi.spyOn(FrozenClient.prototype, 'discover').mockResolvedValue({} as never)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = new URL(String(input))
        if (url.pathname === '/manifest.json') return new Response(JSON.stringify(manifest))
        const role = roles.find((role) => url.pathname === `/${handoff.artifacts[role].driver.path}`)
        if (!role) throw new Error(`Unexpected network request: ${url}`)
        const bytes = handoffDriver(role)
        if (fault === 'changed_driver' && role === 'store') bytes[0] ^= 1
        return new Response(bytes as BodyInit)
      }),
    )
    const runtimeConfig = createDuskDomainsRuntimeConfig({
      ...handoffEnv,
      VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
      VITE_DUSK_DOMAINS_MANIFEST_URL: '/manifest.json',
    })
    const { names } = createDuskDomainsLiveApp({
      runtimeConfig,
      wallet: { state: { chainId: 'dusk:0' } } as never,
      session: { state: {} } as never,
    })
    await expect(names.client).rejects.toThrow(
      fault === 'changed_driver'
        ? 'sha256 mismatch'
        : fault === 'missing_hash'
          ? 'checksum'
          : 'configured network and contracts',
    )
    expect(discover).not.toHaveBeenCalled()
  },
)

it.each([
  ['refuses', 'resolver'],
  ['accepts', 'store'],
] as const)('%s an extra store entry using the %s driver', async (outcome, driverRole) => {
  const manifest = adaptDeploymentManifest(structuredClone(handoff)) as {
    contracts: Array<{ role: string; contractId: string; codeHash: string; dataDriver: unknown }>
  }
  // Serve it in SDK format: without the deploy tool's schema marker it is not re-adapted.
  delete (manifest as { schema?: unknown }).schema
  const donor = manifest.contracts.find((c) => c.role === driverRole)!
  // A later admission: another store ID. Only the store role's pinned driver may load for it.
  manifest.contracts.push({
    role: 'store',
    contractId: 'ab'.repeat(32),
    codeHash: donor.codeHash,
    dataDriver: structuredClone(donor.dataDriver),
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (url.pathname === '/manifest.json') return new Response(JSON.stringify(manifest))
      throw new Error(`Unexpected network request: ${url}`)
    }),
  )
  const config = createDuskDomainsRuntimeConfig({
    ...handoffEnv,
    VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
    VITE_DUSK_DOMAINS_MANIFEST_URL: '/manifest.json',
  })
  const loaded = configuredReleaseManifest(config, 'http://localhost')
  if (outcome === 'refuses') await expect(loaded).rejects.toThrow('configured network and contracts')
  else expect((await loaded).contracts.filter((c) => c.role === 'store')).toHaveLength(2)
})
