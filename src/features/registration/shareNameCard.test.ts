// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { downloadNameCard, selfContainedCard } from './shareNameCard'

vi.mock('../search/night-card/renderNightCard', () => ({
  renderNightCard: vi.fn().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="download-sky"/></defs><image href="/night-cards/fox.webp"/><rect fill="url(#download-sky)"/></svg>', alt: '' }),
}))

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

const served = (body: string, type: string) => new Response(new Blob([body], { type }))

it('inlines the artwork and both font styles, so the drawn card needs no network', async () => {
  const fetch = vi.fn((url: string) => Promise.resolve(served(url, url.endsWith('.webp') ? 'image/webp' : 'font/woff2')))
  vi.stubGlobal('fetch', fetch)
  const svg = await selfContainedCard('<svg xmlns="http://www.w3.org/2000/svg"><image href="/night-cards/fox.webp"/><use href="#local"/></svg>')
  expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual(['/fonts/instrument-serif-italic.woff2', '/fonts/instrument-serif.woff2', '/night-cards/fox.webp'])
  expect(svg).toContain('href="data:image/webp;base64,')
  expect(svg).toContain('href="#local"')
  expect(svg.match(/@font-face\{font-family:"Instrument Serif";font-style:(normal|italic);src:url\(data:font\/woff2;base64,/g)).toHaveLength(2)
  expect(svg).not.toContain('href="/')
})

it('reports a failed download without saving anything', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
  await expect(downloadNameCard('chit.dusk')).rejects.toThrow('Could not create the image. Try again.')
  expect(click).not.toHaveBeenCalled()
})
