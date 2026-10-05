import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parseRoute } from './routes'
import { injectStaticShell } from './staticShellHtml'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
type StructuredNode = {
  '@type': string
  description?: string
  logo?: { url: string }
  potentialAction?: { target: { urlTemplate: string } }
}
const structuredData = () => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]) as { '@graph': StructuredNode[] }
const byType = (type: string) => structuredData()['@graph'].find((node) => node['@type'] === type)

it('describes the site, its search and its organisation without an FAQ', () => {
  expect(structuredData()['@graph'].map((node) => node['@type']).sort()).toEqual(['Organization', 'WebApplication', 'WebSite'])
  expect(html).not.toContain('FAQPage')
  const description = /<meta\s+name="description"\s+content="([^"]+)"/.exec(html)![1]
  expect(byType('WebApplication')!.description).toBe(description)
  expect(byType('Organization')!.logo!.url).toBe('https://dusk.domains/icon-512.png')
})

it('searches through a route the app opens as a name page', () => {
  const template = byType('WebSite')!.potentialAction!.target.urlTemplate
  expect(template).toBe('https://dusk.domains/name/{search_term_string}')
  expect(parseRoute(new URL(template.replace('{search_term_string}', 'alice')).pathname)).toEqual({ view: 'search', name: 'alice.dusk' })
})

it('leaves #root empty for the build to fill with the static shell', () => {
  expect(html).toContain('<div id="root"></div>')
  expect(injectStaticShell(html, '\n<div class="page">shell</div>\n')).toContain('<div id="root" data-static-shell><div class="page">shell</div></div>')
  expect(() => injectStaticShell('<body></body>', 'shell')).toThrow('empty <div id="root"></div>')
})
