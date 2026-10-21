import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { DuskDomainsRuntimeConfig } from '../names/internal'
import { SiteFooter } from './SiteFooter'

const support = 'https://github.com/HDauven/dusk-domains-frontend/issues/new/choose'
const render = (links: DuskDomainsRuntimeConfig['launchLinks'] = { support, abuse: null, security: null, status: null }) => renderToStaticMarkup(<SiteFooter links={links} onMainViewChange={() => {}} />)

it('links the site pages and Support, and nothing else', () => {
  const html = render()
  expect([...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => [match[2], match[1]])).toEqual([
    ['Mochavi', 'https://www.mochavi.com/'],
    ['Referrals', '/referrals'],
    ['Treasury', '/treasury'],
    ['Developers', '/developers'],
    ['Terms', '/terms'],
    ['Privacy', '/privacy'],
    ['Support', support],
  ])
})

it('omits Support when its link is unset', () => {
  expect(render({ support: null, abuse: null, security: null, status: null })).not.toContain('Support')
})

it('credits Mochavi as the builder', () => {
  expect(render()).toContain('Built by <a href="https://www.mochavi.com/">Mochavi</a>')
})
