import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { build, createServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const roots: string[] = []
afterEach(() => {
  vi.unstubAllEnvs()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function buildSite(env: Record<string, string>) {
  for (const [key, value] of Object.entries({
    VITE_DUSK_DOMAINS_SITE_URL: '', VITE_DUSK_DOMAINS_NOINDEX: '',
    VITE_DUSK_DOMAINS_OTHER_NETWORK_URL: '', DUSK_DOMAINS_FRONTEND_COMMIT: '', ...env,
  })) vi.stubEnv(key, value)
  mkdirSync('node_modules/.cache', { recursive: true })
  const root = mkdtempSync(resolve('node_modules/.cache/site-build-'))
  roots.push(root)
  mkdirSync(`${root}/src/app`, { recursive: true })
  cpSync('index.html', `${root}/index.html`)
  cpSync('public', `${root}/public`, { recursive: true })
  cpSync('src/app/static-shell.html', `${root}/src/app/static-shell.html`)
  if (existsSync('scripts/site')) cpSync('scripts/site', `${root}/scripts/site`, { recursive: true })
  writeFileSync(`${root}/src/main.tsx`, 'window.buildEnv = import.meta.env')
  await build({ root, configFile: resolve('vite.config.ts'), logLevel: 'silent', build: { minify: false } })
  return {
    read: (name: string) => readFileSync(`${root}/dist/${name}`, 'utf8'),
    files: readdirSync(`${root}/dist`),
  }
}

it.each([
  ['mainnet', 'dusk:1', 'https://mainnet.example', 'https://testnet.example', false, 'Testnet'],
  ['testnet', 'dusk:2', 'https://testnet.example', 'https://mainnet.example', true, 'Mainnet'],
] as const)('builds %s metadata, crawl policy, shell and provenance together', async (_network, chainId, origin, other, noindex, label) => {
  const contracts = { router: `0x${'11'.repeat(32)}`, core: `0x${'22'.repeat(32)}`, treasury: `0x${'33'.repeat(32)}`, marketplace: `0x${'44'.repeat(32)}` }
  const env = {
    VITE_DUSK_DOMAINS_SITE_URL: `${origin}/`,
    VITE_DUSK_DOMAINS_CHAIN_ID: chainId,
    VITE_DUSK_DOMAINS_NOINDEX: String(noindex),
    VITE_DUSK_DOMAINS_OTHER_NETWORK_URL: other,
    ...Object.fromEntries(Object.entries(contracts).map(([role, id]) => [`VITE_DUSK_DOMAINS_${role.toUpperCase()}_CONTRACT_ID`, id])),
  }
  const before = Date.now()
  const output = await buildSite(env)
  const html = output.read('index.html')
  expect(html).not.toContain('https://dusk.domains')
  expect(html).not.toContain('%DUSK_DOMAINS_')
  expect(html).toContain(`<link rel="canonical" href="${origin}/"`)
  expect(html).toContain(`<meta property="og:url" content="${origin}/"`)
  expect(html).toContain(`<meta property="og:image" content="${origin}/og-image.png"`)
  expect(html).toContain(`<meta property="og:image:secure_url" content="${origin}/og-image.png"`)
  expect(html).toContain(`<meta name="twitter:image" content="${origin}/og-image.png"`)
  expect(html).toContain(`"urlTemplate": "${origin}/name/{search_term_string}"`)
  expect(html).toContain(`<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index,follow'}"`)
  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1])['@graph']
  expect(graph.every((item: { url: string }) => item.url === `${origin}/`)).toBe(true)
  expect(html).toContain(`<a href="${other}">${label}</a>`)
  expect(html).toContain(`network-badge ${_network}">${noindex ? 'Testnet' : 'Mainnet'}</span>`)
  const llms = output.read('llms.txt')
  expect(llms).toContain(`[Search and register](${origin}/)`)
  expect(llms).toContain(`${origin}/api`)
  const optional = llms.split('## Optional')[1]
  expect(optional).toContain(`[Terms of Use](${origin}/terms)`)
  expect(optional).toContain(`[Privacy Notice](${origin}/privacy)`)
  expect(llms).not.toContain('https://dusk.domains')
  if (noindex) {
    expect(output.read('robots.txt')).toBe('User-agent: *\nDisallow: /\n')
    expect(output.files.filter((name) => name.startsWith('sitemap'))).toEqual([])
    expect(llms).toMatch(/^This is the testnet copy.*Testnet names have no value/)
    expect(llms).toContain(`[Mainnet](${other})`)
  } else {
    expect(output.read('robots.txt')).toContain(`Allow: /\n\nSitemap: ${origin}/sitemap.xml`)
    expect(output.read('sitemap.xml')).toContain(`<loc>${origin}/sitemap-pages.xml</loc>`)
    expect(output.read('sitemap.xml')).toContain(`<loc>${origin}/sitemap-names.xml</loc>`)
    expect(output.read('sitemap-pages.xml')).toContain(`<loc>${origin}/market</loc>`)
    expect(output.read('sitemap-pages.xml')).toContain(`<loc>${origin}/terms</loc>`)
    expect(output.read('sitemap-pages.xml')).toContain(`<loc>${origin}/privacy</loc>`)
    expect(llms).not.toContain('names have no value')
  }
  const version = JSON.parse(output.read('version.json'))
  expect(version).toEqual({
    frontendCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    builtAt: expect.any(String), chainId, siteUrl: origin, contracts,
  })
  expect(Date.parse(version.builtAt)).toBeGreaterThanOrEqual(before)
  expect(Date.parse(version.builtAt)).toBeLessThanOrEqual(Date.now())
}, 30_000)

it('defaults to the main site and records a supplied commit for builds outside git', async () => {
  const output = await buildSite({ DUSK_DOMAINS_FRONTEND_COMMIT: 'a'.repeat(40) })
  expect(output.read('index.html')).toContain('href="https://dusk.domains/"')
  expect(JSON.parse(output.read('version.json'))).toMatchObject({ frontendCommit: 'a'.repeat(40), siteUrl: 'https://dusk.domains' })
  expect(output.read('robots.txt')).toContain('Sitemap: https://dusk.domains/sitemap.xml')
}, 30_000)

it('keeps origins and fixed network labels out of the reusable home shell', () => {
  const shell = readFileSync('src/app/static-shell.html', 'utf8')
  expect(shell).not.toMatch(/https:\/\/(?:testnet\.)?dusk\.domains/)
  expect(shell).not.toMatch(/>Testnet<|>Mainnet</)
})

it.each([false, true])('serves generated crawl files and metadata in dev (noindex=%s)', async noindex => {
  vi.stubEnv('VITE_DUSK_DOMAINS_SITE_URL', 'https://dev.example')
  vi.stubEnv('VITE_DUSK_DOMAINS_NOINDEX', String(noindex))
  const server = await createServer({ configFile: resolve('vite.config.ts'), logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null, cors: false } })
  try {
    const html = await server.transformIndexHtml('/', readFileSync('index.html', 'utf8'))
    expect(html).toContain('href="https://dev.example/"')
    expect(html).not.toContain('%DUSK_DOMAINS_')
    const get = (url: string) => new Promise<{ status: number, body: string }>((resolve, reject) => {
      const response = {
        statusCode: 200,
        setHeader: () => {},
        end: (body = '') => resolve({ status: response.statusCode, body }),
      }
      server.middlewares({ url, method: 'GET', headers: { host: 'localhost' } } as IncomingMessage, response as unknown as ServerResponse, error => error ? reject(error) : resolve({ status: 404, body: '' }))
    })
    const robots = await get('/robots.txt')
    expect(robots.status).toBe(200)
    expect(robots.body).toContain(noindex ? 'Disallow: /' : 'Sitemap: https://dev.example/sitemap.xml')
    expect((await get('/sitemap.xml')).status).toBe(noindex ? 404 : 200)
    expect((await get('/llms.txt')).body).toContain('https://dev.example/')
  } finally {
    await server.close()
  }
})
