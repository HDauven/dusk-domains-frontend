// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNamePageMetadata } from '../features/search/namePageMetadata'
import { LegalPage } from './LegalPage'

let root: Root
const meta = (key: string) => document.head.querySelector<HTMLMetaElement>(`meta[${key.startsWith('og:') ? 'property' : 'name'}="${key}"]`)?.content
const canonical = () => document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  document.head.innerHTML = '<meta property="og:image" content="old"><meta property="og:image" content="duplicate">'
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

function NamePage() {
  useNamePageMetadata('aurora.dusk', [])
  return null
}

it('updates legal titles, descriptions and canonicals through name and legal navigation, then resets them', async () => {
  await act(async () => root.render(<NamePage />))
  const descriptions = new Set<string>()
  for (const [page, title] of [['terms', 'Terms of Use'], ['privacy', 'Privacy Notice']] as const) {
    await act(async () => root.render(<LegalPage page={page} />))
    expect(document.querySelector('article h1')?.textContent).toBe(title)
    expect(document.title).toBe(`${title} · Dusk Domains`)
    expect(meta('description')).toMatch(/Dusk Domains/)
    descriptions.add(meta('description')!)
    expect(meta('og:title')).toBe(document.title)
    expect(meta('twitter:title')).toBe(document.title)
    expect(meta('og:description')).toBe(meta('description'))
    expect(meta('twitter:description')).toBe(meta('description'))
    expect(canonical()).toBe(`https://dusk.domains/${page}`)
    expect(meta('og:url')).toBe(canonical())
    expect(meta('og:image')).toBe('https://dusk.domains/og-image.png')
    expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(1)
  }
  expect(descriptions.size).toBe(2)
  await act(async () => root.render(<NamePage />))
  expect(document.title).toBe('aurora.dusk · Dusk Domains')
  expect(canonical()).toBe('https://dusk.domains/name/aurora.dusk')
  await act(async () => root.render(<main />))
  expect(document.title).toBe('Dusk Domains | .dusk domains for Dusk')
  expect(canonical()).toBe('https://dusk.domains/')
})
