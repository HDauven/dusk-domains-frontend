import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { contractId, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv, handoffNodeReply, handoffWithLens, lensDriver, lensEnv, lensArtifact, nodeCalls } from '../test/handoffFixtures'
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
  // A deploy serves the handoff's manifest, as deploy.sh --manifest copies it.
  writeFileSync(`${root}/public/manifest.json`, JSON.stringify(handoff))
  writeFileSync(`${root}/frontend.env`, `${readFileSync('src/test/handoff/frontend.env', 'utf8')}\nVITE_DUSK_DOMAINS_MANIFEST_URL=/manifest.json\n`)
  const run = () =>
    spawnSync(
      process.execPath,
      [resolve('scripts/validate-deploy.mjs'), `${root}/frontend.env`],
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

it('validates a handoff’s lens only against the lens this build pins', async () => {
  mkdirSync('node_modules/.cache', { recursive: true })
  const root = mkdtempSync(resolve('node_modules/.cache/handoff-'))
  roots.push(root)
  mkdirSync(`${root}/public/contracts`, { recursive: true })
  for (const role of roles)
    writeFileSync(`${root}/public/${handoff.artifacts[role].driver.path}`, handoffDriver(role))
  writeFileSync(`${root}/public/${lensArtifact.path}`, lensDriver())
  const manifest = await handoffWithLens()
  const env = (lines: Record<string, string>) => `${readFileSync('src/test/handoff/frontend.env', 'utf8')}\nVITE_DUSK_DOMAINS_MANIFEST_URL=/manifest.json\n${Object.entries(lines).map(([key, value]) => `${key}=${value}`).join('\n')}\n`
  const run = (lines: Record<string, string>, published: unknown = manifest) => {
    writeFileSync(`${root}/public/manifest.json`, JSON.stringify(published))
    writeFileSync(`${root}/frontend.env`, env(lines))
    return spawnSync(process.execPath, [resolve('scripts/validate-deploy.mjs'), `${root}/frontend.env`], { cwd: root, encoding: 'utf8' })
  }
  const pinned = run(lensEnv)
  expect(pinned.status, pinned.stderr).toBe(0)
  // Turned off, the site reads directly and loads no lens, so nothing about it is checked.
  expect(run({ VITE_DUSK_DOMAINS_USE_LENS: 'false' }).status).toBe(0)
  expect(run({}).stderr).toContain('The manifest lists a read lens this build doesn')
  expect(run(lensEnv, handoff).stderr).toContain('This build pins a read lens the manifest doesn')
  expect(run({ ...lensEnv, VITE_DUSK_DOMAINS_LENS_CONTRACT_ID: `0x${'9b'.repeat(32)}` }).stderr).toContain("isn't the lens this build pins")
  expect(run({ VITE_DUSK_DOMAINS_LENS_CONTRACT_ID: lensEnv.VITE_DUSK_DOMAINS_LENS_CONTRACT_ID }).stderr).toContain('VITE_DUSK_DOMAINS_LENS_DRIVER_URL must be the immutable lens driver URL')
  writeFileSync(`${root}/public/${lensArtifact.path}`, new Uint8Array([0]))
  expect(run(lensEnv).stderr).toContain('Driver checksum mismatch')
})

it.each([
  [false, undefined], [true, undefined], [true, 'true'], [true, 'false'],
] as const)(
  'initializes the live app with real handoff drivers (manifest=%s, VITE_DUSK_DOMAINS_USE_MULTICALL=%s)',
  async (useManifest, multicall) => {
    // This integration covers configuration, manifest loading and real drivers. The node answers the
    // directory's verification, the only contract a new client verifies.
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      const node = handoffNodeReply(url, {}, init?.body)
      if (node) return node
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
      ...(multicall ? { VITE_DUSK_DOMAINS_USE_MULTICALL: multicall } : {}),
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
      // Each contract's init commitment comes only from the handoff manifest.
      const entry = handoff.contracts.find((c: { key: string }) => c.key === role)
      expect((client.release.contracts.get(id) as { initHash?: string }).initHash).toBe(useManifest ? entry.initHash : undefined)
    }
    // The manifest, six drivers, and the directory's interface and binding: read one query each on this
    // local chain, as the SDK batches by default only on mainnet and testnet, or in one query when forced on.
    const node = fetcher.mock.calls.map(([input]) => new URL(String(input))).filter((url) => url.pathname.startsWith('/on/'))
    expect(node.map((url) => url.pathname.split('/').pop())).toEqual(multicall === 'true' ? ['aggregate'] : ['interface_version', 'binding'])
    expect(fetcher).toHaveBeenCalledTimes((useManifest ? 7 : 6) + node.length)
    expect(fetcher.mock.calls.flatMap(([input, init]) => nodeCalls(new URL(String(input)), init?.body))).toEqual(['interface_version', 'binding'])
  },
)

it('reads VITE_DUSK_DOMAINS_USE_MULTICALL three ways: unset for the SDK default, true to force batching on, false off', () => {
  const multicall = (value?: string) =>
    createDuskDomainsRuntimeConfig({ ...handoffEnv, ...(value === undefined ? {} : { VITE_DUSK_DOMAINS_USE_MULTICALL: value }) }).multicall
  expect(multicall()).toBeUndefined()
  for (const value of ['', ' ', 'maybe']) expect(multicall(value), value).toBeUndefined()
  for (const value of ['true', 'TRUE', '1', 'yes', 'on']) expect(multicall(value), value).toBe(true)
  for (const value of ['false', 'FALSE', '0', 'no', 'off']) expect(multicall(value), value).toBe(false)
})

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
    const nodeReads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input))
        const node = handoffNodeReply(url, {}, init?.body)
        if (node) {
          nodeReads.push(url.pathname)
          return node
        }
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
    // Refused before the client reads the chain at all.
    expect(nodeReads).toEqual([])
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

// After a governance SetPolicy, quotes read the newly selected policy. The site follows it only once the
// operator republishes the manifest with that policy listed beside the old one (docs/deploy.md).
const replacementPolicy = '0b'.repeat(32)
it.each([
  ['a manifest republished after the page loaded', true, true],
  ['a manifest without the new policy', true, false],
  ['configuration without a manifest', false, false],
] as const)('follows a replacement policy from %s, and says plainly when it is missing', async (_, useManifest, republished) => {
  let manifest = structuredClone(handoff)
  const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(async (input, init) => {
    const url = new URL(String(input))
    const node = handoffNodeReply(url, {}, init?.body)
    if (node) return node
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    const role = roles.find((role) => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}`
      || url.pathname === `/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetcher)
  const runtimeConfig = createDuskDomainsRuntimeConfig({
    ...handoffEnv,
    VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
    ...(useManifest ? { VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' } : {}),
  })
  const { names } = createDuskDomainsLiveApp({
    runtimeConfig,
    wallet: { state: { chainId: 'dusk:0' } } as never,
    session: { state: {} } as never,
  })
  const client = await names.client!
  expect(client.release.contracts.has(replacementPolicy)).toBe(false)
  if (republished) {
    manifest = structuredClone(handoff)
    manifest.contracts.push({ ...manifest.contracts.find((c: { key: string }) => c.key === 'policy'), id: replacementPolicy })
  }
  const verified = client.verifyContract('policy', replacementPolicy)
  if (republished) {
    // The reviewed policy driver loads for it; its interface read then goes to the node. It enters the
    // client's release only once it verifies.
    await expect(verified).rejects.toThrow('Unexpected network request: http://127.0.0.1:18184/')
    expect(client.release.contracts.has(replacementPolicy)).toBe(false)
  } else {
    await expect(verified).rejects.toThrow('This site has not been updated for the new registration prices yet. Try again later.')
  }
  // The republished manifest is read again rather than from a cached copy.
  const manifestReads = fetcher.mock.calls.filter(([input]) => new URL(String(input)).pathname.endsWith('/manifest.json'))
  expect(manifestReads).toHaveLength(useManifest ? 2 : 0)
  for (const [, init] of manifestReads) expect(init).toMatchObject({ cache: 'no-cache' })
})
