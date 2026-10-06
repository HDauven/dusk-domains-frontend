import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { otherNetwork } from '../src/app/otherNetwork'
import { injectStaticShell, staticShellFile } from '../src/app/staticShellHtml'

type Env = Record<string, string | undefined>

export function siteUrl(env: Env) {
  const url = new URL(env.VITE_DUSK_DOMAINS_SITE_URL || 'https://dusk.domains')
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_DUSK_DOMAINS_SITE_URL must be an http(s) origin.')
  }
  return url.origin
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function renderStaticShell(shell: string, env: Env) {
  const chain = env.VITE_DUSK_DOMAINS_CHAIN_ID || 'dusk:2'
  const label = chain === 'dusk:1' ? 'Mainnet' : chain === 'dusk:0' ? 'Local' : chain === 'dusk:3' ? 'Devnet' : 'Testnet'
  const network = otherNetwork(env)
  return shell
    .replaceAll('%DUSK_DOMAINS_NETWORK_TONE%', label === 'Devnet' ? 'testnet' : label.toLowerCase())
    .replaceAll('%DUSK_DOMAINS_NETWORK_LABEL%', label)
    .replaceAll('%DUSK_DOMAINS_OTHER_NETWORK_LINK%', network ? `<a href="${escapeHtml(network.href)}">${network.label}</a>` : '')
}

export function siteBuild(env: Env): Plugin {
  const origin = siteUrl(env)
  const noindex = env.VITE_DUSK_DOMAINS_NOINDEX === 'true'
  let root = process.cwd()
  const substitute = (text: string) => text.replaceAll('%DUSK_DOMAINS_SITE_URL%', origin)
  function files() {
    const result: Record<string, string> = {}
    for (const name of ['robots.txt', 'sitemap.xml', 'sitemap-pages.xml', 'llms.txt']) {
      if (noindex && name.startsWith('sitemap')) continue
      result[name] = substitute(readFileSync(resolve(root, 'scripts/site', name), 'utf8'))
    }
    if (noindex) {
      result['robots.txt'] = 'User-agent: *\nDisallow: /\n'
      const mainnet = env.VITE_DUSK_DOMAINS_OTHER_NETWORK_URL || 'https://dusk.domains'
      result['llms.txt'] = `This is the testnet copy of Dusk Domains. Testnet names have no value. Use [Mainnet](${mainnet}) for real names.\n\n${result['llms.txt']}`
    }
    return result
  }
  return {
    name: 'dusk-domains-site',
    configResolved(config) { root = config.root },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return injectStaticShell(
          substitute(html).replaceAll('%DUSK_DOMAINS_ROBOTS%', noindex ? 'noindex, nofollow' : 'index,follow'),
          renderStaticShell(readFileSync(resolve(root, staticShellFile), 'utf8'), env),
        )
      },
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url || '/', 'http://localhost').pathname.slice(1)
        if (noindex && path.startsWith('sitemap') && path.endsWith('.xml')) {
          response.statusCode = 404
          response.end()
          return
        }
        if (!['robots.txt', 'sitemap.xml', 'sitemap-pages.xml', 'llms.txt'].includes(path)) return next()
        const content = files()[path]
        if (content === undefined) return next()
        response.setHeader('Content-Type', path.endsWith('.xml') ? 'application/xml' : 'text/plain; charset=utf-8')
        response.end(content)
      })
    },
    generateBundle() {
      const frontendCommit = env.DUSK_DOMAINS_FRONTEND_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
      const contracts = Object.fromEntries(Object.entries(env).flatMap(([key, value]) => {
        const match = /^VITE_DUSK_DOMAINS_(.+)_CONTRACT_ID$/.exec(key)
        return match && value ? [[match[1].toLowerCase(), value]] : []
      }))
      const version = {
        frontendCommit,
        builtAt: new Date().toISOString(),
        chainId: env.VITE_DUSK_DOMAINS_CHAIN_ID || 'dusk:2',
        siteUrl: origin,
        contracts,
      }
      for (const [fileName, source] of Object.entries({ ...files(), 'version.json': JSON.stringify(version, null, 2) + '\n' })) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}
