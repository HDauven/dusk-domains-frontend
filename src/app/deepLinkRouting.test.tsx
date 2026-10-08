// @vitest-environment happy-dom
import { act, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { marketOpening } from '../features/marketplace/useMarketplaceFeature'
import type { NameResult } from '../names/internal'
import type { AppMainView } from './AppTypes'
import { navigateTo, openingRoute } from './routes'
import { useSearchAppState } from './useSearchAppState'
import { useUrlRoute } from './useUrlRoute'

const auction = `0x${'ab'.repeat(32)}`
const later = `0x${'cd'.repeat(32)}`

// The app's routing, started from the address the way the app starts: the real search state and
// useUrlRoute, the market's opening state, and handlers that change state as the app's do.
let controls: {
  openAuction: (node: string) => void
  openView: (view: AppMainView) => void
  resolveName: (canonical: string) => void
  state: () => { view: AppMainView, auction: string, sell: string, offer: string }
}
let root: Root

function RoutedApp() {
  const search = useSearchAppState('test', () => ({ route: openingRoute(), indexed: true }))
  const [market] = useState(() => marketOpening(search.openingRoute))
  const [tab, setTab] = useState(market.tab)
  const [sellName, setSellName] = useState(market.sellName)
  const [offerName, setOfferName] = useState(market.offerName)
  const [selectedAuction, setSelectedAuction] = useState(market.auctionNode)
  // As openIndexedName: the name opens at once, and the indexer answers with its canonical form.
  const openName = (name: string) => {
    search.setMainView('search')
    search.searchActions.reset(name)
    search.searchActions.open('details')
  }
  const openView = (view: AppMainView) => {
    search.setMainView(view)
    if (view === 'search') search.searchActions.reset('')
  }
  const openAuction = (node: string) => { setTab('browse'); setSelectedAuction(node) }
  useEffect(() => {
    controls = {
      openAuction,
      openView,
      resolveName: (canonical) => search.setApiSearchResult({ canonical } as NameResult),
      state: () => ({ view: search.mainView, auction: selectedAuction, sell: tab === 'sell' ? sellName : '', offer: tab === 'offers' ? offerName : '' }),
    }
  })
  useUrlRoute({
    checked: search.checked,
    mainView: search.mainView,
    searchedName: search.apiSearchResult?.canonical ?? null,
    selectedAuctionNode: selectedAuction,
    sellName: tab === 'sell' ? sellName : '',
    onOpenName: openName,
    onOpenView: openView,
    onOpenAuction: openAuction,
    onOpenSell: (name) => { setSellName(name); setSelectedAuction(''); setTab('sell') },
    offerName: tab === 'offers' ? offerName : '',
    onOpenOffer: (name) => { setOfferName(name); setSelectedAuction(''); setTab('offers') },
  })
  return null
}

const address = () => `${window.location.pathname}${window.location.search}`
async function land(path: string) {
  window.history.replaceState(null, '', path)
  await act(async () => root.render(<RoutedApp />))
}
const run = (change: () => void) => act(async () => { change() })
async function travel(steps: number) {
  await act(async () => {
    window.history.go(steps)
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('tidies /market/?campaign=review and records an auction opened from it', async () => {
  await land('/market/?campaign=review')
  expect(address()).toBe('/market?campaign=review')
  const entries = window.history.length
  await run(() => controls.openAuction(auction))
  expect(address()).toBe(`/market/auction/${auction}?campaign=review`)
  expect(window.history.length).toBe(entries + 1)
  await travel(-1)
  expect(address()).toBe('/market?campaign=review')
  expect(controls.state()).toMatchObject({ view: 'marketplace', auction: '' })
})

it('tidies a trailing-slash auction link and records closing the auction', async () => {
  await land(`/market/auction/${auction.toUpperCase().replace('0X', '0x')}/`)
  expect(address()).toBe(`/market/auction/${auction}`)
  expect(controls.state()).toMatchObject({ view: 'marketplace', auction })
  const entries = window.history.length
  await run(() => controls.openAuction(''))
  expect(address()).toBe('/market')
  expect(window.history.length).toBe(entries + 1)
})

it('tidies a mixed-case sell link', async () => {
  await land('/market/sell/Pie.dusk')
  expect(address()).toBe('/market/sell/pie.dusk')
  expect(controls.state()).toMatchObject({ view: 'marketplace', sell: 'pie.dusk' })
})

it('tidies /name/Pie.dusk once the name is found', async () => {
  await land('/name/Pie.dusk')
  const entries = window.history.length
  await run(() => controls.resolveName('pie.dusk'))
  expect(address()).toBe('/name/pie.dusk')
  expect(window.history.length).toBe(entries)
})

it('keeps back and forward through in-app navigation from an untidy opening address', async () => {
  await land('/market/')
  await run(() => controls.openAuction(auction))
  await run(() => controls.openAuction(later))
  await run(() => controls.openView('my-names'))
  expect(address()).toBe('/my')
  await travel(-1)
  expect(address()).toBe(`/market/auction/${later}`)
  expect(controls.state()).toMatchObject({ view: 'marketplace', auction: later })
  await travel(-1)
  expect(address()).toBe(`/market/auction/${auction}`)
  expect(controls.state()).toMatchObject({ view: 'marketplace', auction })
  await travel(-1)
  expect(address()).toBe('/market')
  expect(controls.state()).toMatchObject({ view: 'marketplace', auction: '' })
  await travel(2)
  expect(address()).toBe(`/market/auction/${later}`)
  expect(controls.state()).toMatchObject({ view: 'marketplace', auction: later })
})

it('opens an offer link on the Offers tab with its name', async () => {
  await land('/market/offer/Pie')
  expect(address()).toBe('/market/offer/pie.dusk')
  expect(controls.state()).toMatchObject({ view: 'marketplace', offer: 'pie.dusk' })
})

it('opens the Offers tab from a name page in place, and back returns to the name', async () => {
  await land('/name/pie.dusk')
  await run(() => controls.resolveName('pie.dusk'))
  const entries = window.history.length
  await run(() => navigateTo({ view: 'marketplace', offerName: 'pie.dusk' }))
  expect(address()).toBe('/market/offer/pie.dusk')
  expect(controls.state()).toMatchObject({ view: 'marketplace', offer: 'pie.dusk' })
  expect(window.history.length).toBe(entries + 1)
  await travel(-1)
  expect(address()).toBe('/name/pie.dusk')
  expect(controls.state()).toMatchObject({ view: 'search' })
})
