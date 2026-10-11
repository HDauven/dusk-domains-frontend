import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { config } from '../../test/frozenFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../../names/config'
import { parseRoute, routePath } from '../../app/routes'
import { SiteFooter } from '../../app/SiteFooter'
import { DevelopersPage } from './DevelopersPage'
import { developerLinks } from './developerLinks'
import { NAME_CONTROL_SUMMARY } from '../trust/trustCopy'

const page = (runtimeConfig = config) => renderToStaticMarkup(<DevelopersPage runtimeConfig={runtimeConfig} origin="https://dusk.domains" />)
  .replaceAll('&#x27;', '\'').replaceAll('&quot;', '"').replaceAll('&amp;', '&')

describe('developers page', () => {
  it('has its own route, and /docs leads to it', () => {
    expect(parseRoute('/developers')).toEqual({ view: 'developers' })
    expect(parseRoute('/developers/')).toEqual({ view: 'developers' })
    expect(parseRoute('/docs')).toEqual({ view: 'developers' })
    expect(routePath({ view: 'developers' })).toBe('/developers')
  })

  it('links the SDK, its source, the API reference and llms.txt', () => {
    expect(developerLinks).toEqual([
      { label: 'SDK on JSR', href: 'https://jsr.io/@duskdomains/sdk', note: 'jsr:@duskdomains/sdk' },
      { label: 'SDK source', href: 'https://github.com/HDauven/dusk-domains-sdk' },
      { label: 'API reference', href: 'https://github.com/HDauven/dusk-domains-indexer/blob/main/docs/indexer-api.md' },
      { label: 'llms.txt', href: '/llms.txt' },
    ])
    const html = page()
    for (const link of developerLinks) expect(html).toContain(`href="${link.href}"`)
  })

  it('shows a curl and an SDK example that resolve a name against this site', () => {
    const html = page()
    expect(html).toContain('curl \'https://dusk.domains/api/resolve?name=pie.dusk\'')
    expect(html).toContain('curl \'https://dusk.domains/api/reverse?type=moonlight_address&value=')
    expect(html).toContain('verificationStatus')
    expect(html).toContain('forward_resolved')
    expect(html).toContain('npx jsr add @duskdomains/sdk')
    expect(html).toContain('createClientFromManifest(manifest, { artifactBaseUrl: \'https://dusk.domains/\' })')
    expect(html).toContain('client.getName(\'pie.dusk\')')
    // The manifest shown is this site's own deployment.
    expect(html).toContain(`"contractId": "${config.contracts.store.contractId}"`)
  })

  it('lists this deployment\'s contract IDs by role, and says when none are configured', () => {
    const html = page()
    for (const role of roles) expect(html).toContain(config.contracts[role]!.contractId)
    expect(page(createDuskDomainsRuntimeConfig({}))).toContain('This site has no contracts configured.')
  })

  it('says who controls a name as the Terms do, with its manager and the exceptions', () => {
    const html = page()
    expect(html).toContain(NAME_CONTROL_SUMMARY)
    expect(html).toContain('only its owner and its manager control it')
    expect(html).not.toMatch(/only its holder|Only your wallet/)
  })

  it('is linked from the footer and listed for crawlers', () => {
    const footer = renderToStaticMarkup(<SiteFooter links={{ support: null, abuse: null, security: null, status: null }} onMainViewChange={() => {}} />)
    expect(footer).toContain('<a href="/developers">Developers</a>')
    expect(footer).toContain('href="https://jsr.io/@duskdomains/sdk"')
    expect(footer).toContain('href="https://github.com/HDauven/dusk-domains-indexer/blob/main/docs/indexer-api.md"')
    expect(footer).toContain('href="/llms.txt"')
    expect(readFileSync('scripts/site/sitemap-pages.xml', 'utf8')).toContain('<loc>%DUSK_DOMAINS_SITE_URL%/developers</loc>')
    expect(readFileSync('scripts/site/llms.txt', 'utf8')).toContain('(%DUSK_DOMAINS_SITE_URL%/developers)')
  })
})
