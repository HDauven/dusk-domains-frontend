import { afterEach, expect, it, vi } from 'vitest'
import { validateReleaseManifest, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv, handoffNodeReply, handoffWithLens, lensArtifact, lensDriver, lensEnv, lensId } from '../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import { adaptDeploymentManifest, configuredReleaseManifest } from '../names/releaseManifest'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const endpoints = { nodeUrl: 'http://127.0.0.1:18184/', indexerUrl: 'http://localhost/api' }
const site = 'https://testnet.dusk.domains'
const config = (env: Record<string, string> = {}) => createDuskDomainsRuntimeConfig({
  ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/testnet/manifest.json', ...env,
})
// The site serves the manifest under /releases/testnet/, its drivers beside it.
function serve(manifest: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    if (url.pathname === '/releases/testnet/manifest.json') return new Response(JSON.stringify(manifest))
    throw new Error(`Unexpected network request: ${url}`)
  }))
}

it('adapts a handoff without a lens to a release without one', () => {
  const adapted = adaptDeploymentManifest(structuredClone(handoff)) as Record<string, unknown>
  expect(adapted).not.toHaveProperty('lens')
  expect(validateReleaseManifest(adapted, endpoints).lens).toBeUndefined()
})

it('adapts the handoff’s top-level lens to the SDK’s, beside the six roles', async () => {
  const published = await handoffWithLens()
  const adapted = adaptDeploymentManifest(published) as { lens: unknown; contracts: { role: string }[] }
  // Only what the SDK checks a lens against: its ID, code and init commitments, and pinned driver.
  expect(adapted.lens).toEqual({
    role: 'lens', contractId: lensId, codeHash: published.lens.codeHash, initHash: published.lens.initHash, dataDriver: lensArtifact,
  })
  expect(adapted.contracts.map((c) => c.role)).toEqual(handoff.contracts.map((c: { key: string }) => c.key))
  const release = validateReleaseManifest(adapted, endpoints)
  expect(release.lens).toMatchObject({ contractId: lensId, initHash: published.lens.initHash, dataDriver: { sha256: lensArtifact.sha256 } })
  expect(release.contracts.some((c) => c.contractId === lensId)).toBe(false)
})

it('refuses a handoff lens without its driver’s checksum', async () => {
  const published = await handoffWithLens()
  delete published.artifacts.lens.driver.sha256
  expect(() => adaptDeploymentManifest(published)).toThrow('Missing deployment driver checksum for lens')
  delete published.artifacts.lens
  expect(() => adaptDeploymentManifest(published)).toThrow('Missing deployment driver checksum for lens')
})

it('pins the manifest’s lens to the build’s, and reads its driver beside the manifest', async () => {
  serve(await handoffWithLens())
  const release = await configuredReleaseManifest(config(lensEnv), site)
  expect(release.lens).toMatchObject({ contractId: lensId, dataDriver: { sha256: lensArtifact.sha256 } })
  expect(release.lens!.dataDriver.path).toBe(`${site}/releases/testnet/${lensArtifact.path}`)
  for (const contract of release.contracts) expect(contract.dataDriver.path).toMatch(new RegExp(`^${site}/releases/testnet/contracts/`))
})

// A build without a lens pin uses no lens, as with the lens turned off; deploy validation refuses to pair
// it with a manifest that lists one. A pin the manifest's lens doesn't match is said once.
it.each([
  ['no lens pin', {}, false],
  ['another lens contract', { ...lensEnv, VITE_DUSK_DOMAINS_LENS_CONTRACT_ID: `0x${'9b'.repeat(32)}` }, true],
  ['another lens driver', { ...lensEnv, VITE_DUSK_DOMAINS_LENS_DRIVER_URL: `/contracts/dusk-domains-lens.${'cd'.repeat(32)}.data-driver.wasm` }, true],
])('reads directly when the manifest’s lens isn’t the one this build pins: %s', async (_, env, said) => {
  serve(await handoffWithLens())
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const release = await configuredReleaseManifest(config(env), site)
  expect(release.lens).toBeUndefined()
  expect(release.contracts.map((c) => c.role).sort()).toEqual([...roles].sort())
  if (said) expect(warn).toHaveBeenCalledExactlyOnceWith('The deployment manifest lists a read lens this site does not pin, so it reads directly.')
  else expect(warn).not.toHaveBeenCalled()
})

it('reads directly from a manifest without a lens, whether or not the build pins one', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  for (const env of [{}, lensEnv]) {
    serve(structuredClone(handoff))
    expect((await configuredReleaseManifest(config(env), site)).lens).toBeUndefined()
  }
  expect(warn).not.toHaveBeenCalled()
})

it('turns the lens off with VITE_DUSK_DOMAINS_USE_LENS=false, also for a lens it pins or a malformed one', async () => {
  const off = config({ ...lensEnv, VITE_DUSK_DOMAINS_USE_LENS: 'false' })
  expect(off.lens).toBeNull()
  const published = await handoffWithLens()
  serve(published)
  expect((await configuredReleaseManifest(off, site)).lens).toBeUndefined()
  // A lens entry the site can't read stops the site while the lens is on; turned off, the site loads.
  delete published.artifacts.lens
  serve(published)
  await expect(configuredReleaseManifest(config(lensEnv), site)).rejects.toThrow('Missing deployment driver checksum for lens')
  expect((await configuredReleaseManifest(off, site)).contracts).toHaveLength(6)
})

// The live app with the real handoff and lens drivers. The node answers the directory's verification.
it.each([true, false])('loads the pinned lens and its driver with the release only while the lens is on (%s)', async (on) => {
  const manifest = await handoffWithLens()
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const node = handoffNodeReply(url, {}, init?.body)
    if (node) return node
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    if (url.pathname === `/releases/local/${lensArtifact.path}`) return new Response(lensDriver() as BodyInit)
    const role = roles.find((role) => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetcher)
  const runtimeConfig = createDuskDomainsRuntimeConfig({
    ...handoffEnv, ...lensEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json',
    ...(on ? {} : { VITE_DUSK_DOMAINS_USE_LENS: 'false' }),
  })
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: { state: { chainId: 'dusk:0' } } as never, session: { state: {} } as never })
  const client = await names.client!
  expect(client.release.lens?.contract.contractId).toBe(on ? lensId : undefined)
  if (on) expect(client.release.lens!.driver.version()).toBe('1.0.0')
  expect(fetcher.mock.calls.filter(([input]) => String(input).endsWith(lensArtifact.path))).toHaveLength(on ? 1 : 0)
})
