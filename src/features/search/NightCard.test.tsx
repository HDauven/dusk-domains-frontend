// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SearchWorkspace } from './SearchWorkspace'
import type { SearchResultPanelProps } from './SearchResultPanel'
import { fitCardName } from './night-card/renderNightCard'
import { NightCard } from './NightCard'

let root: Root
let intersect: (entries: { isIntersecting: boolean }[]) => void
const fontsLoaded = vi.fn().mockResolvedValue([])
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('crypto', globalThis.crypto)
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersect) { intersect = callback }
    observe() {}
    disconnect() {}
  })
  Object.defineProperty(document, 'fonts', { configurable: true, value: Object.assign(new EventTarget(), { load: fontsLoaded, ready: Promise.resolve() }) })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ font: '', measureText: (text: string) => ({ width: text.length * 85, actualBoundingBoxDescent: 22 }) } as unknown as CanvasRenderingContext2D)
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function page(name: string, status: 'registered' | 'available') {
  const result = {
    headerProps: { displayName: name, status, records: [], lifecycleLabel: null },
    detailsProps: { displayName: name, parentResolverRecords: [], subnames: [], primaryVerification: { tone: 'muted' }, activity: { activityEntries: [] } },
    overviewProps: { canRegister: false },
    nodeHex: '', resultView: 'details', management: {},
  } as unknown as SearchResultPanelProps
  return <SearchWorkspace result={result} search={{ checked: true, resultReady: true, loading: false, query: name, onCheckAvailability: () => {}, onQueryChange: () => {} }} />
}

it.each([
  ['tminus.dusk', 'registered', 1],
  ['m'.repeat(63) + '.dusk', 'available', 2],
  ['sub.tminus.dusk', 'registered', 1],
  [Array(4).fill('m'.repeat(63)).join('.') + '.dusk', 'available', 3],
] as const)('renders the complete %s name card on its %s name page', async (name, status, lineCount) => {
  await act(async () => root.render(page(name, status)))
  const box = document.querySelector('.night-card') as HTMLElement
  expect(box.style.aspectRatio).toBe('1200 / 630')
  expect(box.querySelector('svg')).toBeNull()
  expect(fontsLoaded).not.toHaveBeenCalled()
  await act(async () => {
    intersect([{ isIntersecting: true }])
    await vi.waitFor(() => expect(fontsLoaded).toHaveBeenCalled())
  })
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)) })
    expect(box.querySelector('svg')).not.toBeNull()
  })
  expect(box.style.aspectRatio).toBe('1200 / 630')
  expect(box.getAttribute('role')).toBe('img')
  expect(box.getAttribute('aria-busy')).toBe('false')
  expect(box.getAttribute('aria-label')).toContain(`Share card for ${name}:`)
  if (name === 'tminus.dusk') expect(box.getAttribute('aria-label')).toBe('Share card for tminus.dusk: a night heron and its constellation')
  expect(box.querySelector('image')?.getAttribute('href')).toMatch(/^\/night-cards\/[a-z]+\.webp$/)
  expect(box.querySelector('svg > g > text')?.textContent).toBe(name)
  expect(box.querySelectorAll('text > tspan[x]')).toHaveLength(lineCount === 1 ? 0 : lineCount)
  expect(box.querySelector('tspan[font-style="italic"]')?.textContent).toBe('.dusk')
  // This live backport keeps the deployed app head metadata; crawler pages carry each name's share image.
})

it('keeps single-line sizing down to 48px before wrapping at 32px', () => {
  const measure = (label: string, suffix: boolean) => (label.length + (suffix ? 5 : 0)) * 85
  expect(fitCardName('short', measure)).toEqual({ size: 96, lines: ['short'] })
  const shrunk = fitCardName('m'.repeat(20), measure)
  expect(shrunk.size).toBeGreaterThan(48)
  expect(shrunk.size).toBeLessThan(96)
  expect(shrunk.lines).toHaveLength(1)
  const wrapped = fitCardName('m'.repeat(63), measure)
  expect(wrapped.size).toBe(32)
  expect(wrapped.lines.join('')).toBe('m'.repeat(63))
  expect(wrapped.lines).toHaveLength(2)
})

it('ignores an old name while font loading is pending', async () => {
  let finishFonts: () => void = () => {}
  fontsLoaded.mockImplementationOnce(() => new Promise<void>(resolve => { finishFonts = resolve }))
  await act(async () => root.render(<NightCard name="tminus.dusk" />))
  await act(async () => { intersect([{ isIntersecting: true }]); await vi.waitFor(() => expect(fontsLoaded).toHaveBeenCalled()) })
  await act(async () => root.render(<NightCard name="hein.dusk" />))
  await act(async () => { intersect([{ isIntersecting: true }]) })
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)) })
    expect(document.querySelector('.night-card')?.getAttribute('aria-label')).toContain('hein.dusk: a fox')
  })
  await act(async () => { finishFonts(); await new Promise(resolve => setTimeout(resolve, 20)) })
  expect(document.querySelector('svg > g > text')?.textContent).toBe('hein.dusk')
})
