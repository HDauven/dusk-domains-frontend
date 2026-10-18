import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import * as sdk from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv } from '../../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../../names/config'
import { DevelopersPage } from './DevelopersPage'

// Runs the SDK example exactly as the developers page shows it, against the frozen handoff:
// its manifest and its six real data drivers, fetched and checked by the SDK. Only node reads
// are answered here, at the decoded-value level, since no test connects to a node.
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

const origin = 'https://dusk.domains'
const samples = sdk.parseJson(readFileSync('src/test/frozen-wire.json', 'utf8')) as Record<string, unknown>
const sample = <T extends keyof sdk.WireTypes>(type: T): sdk.WireTypes[T] => sdk.wireValue(type, structuredClone(samples[type]))
const ids = Object.fromEntries(handoff.contracts.map((contract: { key: string, id: string }) => [contract.key, contract.id])) as Record<string, string>
const codeHashes = Object.fromEntries(handoff.contracts.map((contract: { key: string, codeHash: string }) => [contract.key, contract.codeHash])) as Record<string, string>
const bytesOf = (hex: string) => sdk.fromHex(hex, 32)
const website = [...new TextEncoder().encode('https://pie.example')]

function decode(html: string) {
  return html.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#x27;', '\'').replaceAll('&amp;', '&')
}

// The page's code blocks, as a reader would copy them.
function codeBlocks(runtimeConfig: ReturnType<typeof createDuskDomainsRuntimeConfig>) {
  const html = renderToStaticMarkup(<DevelopersPage runtimeConfig={runtimeConfig} origin={origin} />)
  return [...html.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map(match => decode(match[1]))
}

// Answers the reads the example makes, as a node at height 100 would after decoding.
function fakeNode() {
  const role = (id: string) => (Object.entries(ids).find(([, value]) => value === sdk.contractId(id))?.[0] ?? '') as (typeof roles)[number]
  const admission = (key: string) => ({ ...sample('Admission'), id: bytesOf(ids[key]), ordinal: 0, interface_version: 1, retiring: false,
    code_hash: bytesOf(codeHashes[key]) })
  const directory = sample('DirectoryConfig')
  directory.binding = { directory: bytesOf(ids.directory), vault: bytesOf(ids.vault), network: 0 }
  directory.store_count = 1
  directory.resolver_count = 1
  directory.registration.policy = bytesOf(ids.policy)
  directory.preferred_marketplace = bytesOf(ids.marketplace)
  const name = sample('NameView')
  vi.spyOn(sdk.FrozenClient.prototype as never as { raw: (...args: unknown[]) => Promise<unknown> }, 'raw').mockImplementation(async (kind, id, method, args) => {
    const key = role(id as string)
    expect(key, `read of an unknown contract ${String(id)}`).not.toBe('')
    if (method === 'interface_version') return { kind: key[0].toUpperCase() + key.slice(1), version: 1,
      move_version: key === 'store' ? 1 : 0, custody_version: key === 'store' || key === 'marketplace' ? 1 : 0 }
    if (method === 'binding') return directory.binding
    if (method === 'order_api_version') return 1
    if (method === 'config' && kind === 'directory') return directory
    if (method === 'members') return { rows: [admission((args as { kind: string }).kind === 'Store' ? 'store' : 'resolver')], next: null }
    if (method === 'home') return 'Local'
    if (method === 'get_name') return { Local: { ...name, name: { ...name.name, key: (args as sdk.NameKey) } } }
    if (method === 'read_records') return { Local: { pointer: null, records: [{ key: 'website', value: website, ttl_seconds: 300n, updated_at: 10n }] } }
    throw new Error(`Unexpected read ${key}.${String(method)}`)
  })
}

function serve(manifestPath: string | null) {
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    // The tip's height and block hash, read together as the SDK's transport reads them.
    if (url.pathname.endsWith('/on/graphql/query')) return Response.json({ data: { block: { header: { height: 100, hash: 'ab'.repeat(32) } } } })
    if (manifestPath && url.href === `${origin}${manifestPath}`) return new Response(JSON.stringify(handoff))
    const role = roles.find(role => url.pathname.endsWith(`/${handoff.artifacts[role].driver.path.split('/').pop()}`))
    if (role) return new Response(handoffDriver(role) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

// Module imports become plain bindings; everything else is the page's code as written.
async function run(code: string, files: Record<string, string> = {}) {
  const logged: unknown[] = []
  const body = code
    .replace("import { createClientFromManifest } from '@duskdomains/sdk'", 'const { createClientFromManifest } = sdk')
    .replace(/import (\w+) from '\.\/([\w.]+)' with \{ type: 'json' \}/g, (_, binding, file) => `const ${binding} = JSON.parse(files[${JSON.stringify(file)}])`)
  expect(body).not.toMatch(/^\s*import /m)
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
  await new AsyncFunction('sdk', 'files', 'console', body)(sdk, files, { log: (value: unknown) => logged.push(value) })
  return logged
}

const config = (extra: Record<string, string> = {}) => createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', ...extra })

it('runs the SDK example against the frozen handoff manifest this site publishes', async () => {
  const fetcher = serve('/releases/local/manifest.json')
  fakeNode()
  const [example] = codeBlocks(config({ VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' })).filter(code => code.includes('createClientFromManifest'))
  expect(example).toContain(`'${origin}/releases/local/manifest.json'`)
  const [records] = await run(example)
  expect(records).toEqual({ Local: { pointer: null, records: [expect.objectContaining({ key: 'website', value: website })] } })
  // Every driver came from the handoff, next to its manifest, and passed the SDK's checks.
  const drivers = fetcher.mock.calls.map(([input]) => String(input)).filter(url => url.endsWith('.data-driver.wasm'))
  expect(drivers).toHaveLength(6)
  expect(drivers.every(url => url.startsWith(`${origin}/releases/local/contracts/`))).toBe(true)
})

it('runs the SDK example with the manifest the page lists when the site publishes none', async () => {
  serve(null)
  fakeNode()
  const blocks = codeBlocks(config())
  const example = blocks.find(code => code.includes('createClientFromManifest'))!
  const manifest = blocks.find(code => code.trim().startsWith('{'))!
  const [records] = await run(example, { 'manifest.json': manifest })
  expect(records).toEqual({ Local: { pointer: null, records: [expect.objectContaining({ key: 'website' })] } })
})
