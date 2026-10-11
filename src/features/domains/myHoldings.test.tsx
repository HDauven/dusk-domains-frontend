// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDuskDomainsIndexerClient, namehashHex, type IndexedMarketplaceAuction, type IndexedMarketplaceFixedSale, type IndexedNameSummary, type IndexedSubname } from '../../names/internal'
import { parseRoute, routePath } from '../../app/routes'
import { MyDomainsView, type MyDomainsViewProps } from './MyDomainsView'
import { fetchMyHoldings, servesHolderIndex, type HeldListing, type HeldSubname } from './myDomainsData'
import { rememberHeldSubname, rememberedHeldSubnames } from './heldSubnames'

const me = `0x${'11'.repeat(32)}`
const sam = `0x${'22'.repeat(32)}`
const market = `0x${'05'.repeat(32)}`
const name = (canonicalName: string, owner = me): IndexedNameSummary => ({ node: namehashHex(canonicalName), canonicalName, owner, manager: owner,
  records: [], status: 'active', subnameCount: 0, activityCount: 1, expiresAt: null, graceEndsAt: null, expiresAtBlockHeight: 5_000, graceEndsAtBlockHeight: 6_000 } as unknown as IndexedNameSummary)
const sale = (canonical: string, seller = me, extra: Partial<IndexedMarketplaceFixedSale> = {}) => ({ node: namehashHex(canonical), name: canonical,
  sellerAuthority: seller, priceLux: 30_000_000_000, expiresAtBlockHeight: 2_000, saleId: 1, marketplaceContractId: market, escrowed: true, ...extra }) as IndexedMarketplaceFixedSale
const auction = (canonical: string, extra: Partial<IndexedMarketplaceAuction> = {}) => ({ node: namehashHex(canonical), name: canonical, sellerAuthority: me,
  reservePriceLux: 60_000_000_000, highestBid: null, bidCount: 0, startBlockHeight: null, endBlockHeight: null, startDeadlineBlockHeight: 9_000,
  auctionId: 2, marketplaceContractId: market, escrowed: true, ...extra }) as IndexedMarketplaceAuction
const subname = (canonical: string, owner: string, manager: string): IndexedSubname => ({ node: namehashHex(canonical), name: canonical,
  label: canonical.split('.')[0], parentName: canonical.slice(canonical.indexOf('.') + 1), parentNode: namehashHex(canonical.slice(canonical.indexOf('.') + 1)),
  owner, manager, status: 'active', expiryPolicy: 'inherits_parent', expiresAtBlockHeight: 5_000 } as unknown as IndexedSubname)

// A row of the indexer's holder index (/holdings).
const holding = (canonical: string, owner: string | null, manager: string | null, role: 'owner' | 'manager') => ({ node: namehashHex(canonical), name: canonical,
  kind: canonical.split('.').length > 2 ? 'subname' : 'root', role, owner, manager, root: namehashHex(canonical.split('.').slice(-2).join('.')),
  parentNode: null, parentName: canonical.split('.').length > 2 ? canonical.slice(canonical.indexOf('.') + 1) : null, status: 'active',
  expiresAtBlockHeight: 5_000, graceEndsAtBlockHeight: null, homeShard: null, generation: '1', serial: '2' })

function client(overrides: Record<string, unknown> = {}) {
  return {
    getAllHoldings: vi.fn(async () => [holding('mine.dusk', me, me, 'owner')]),
    getAllNames: vi.fn(async () => [name('mine.dusk')]),
    getAllMarketplaceFixedSales: vi.fn(async () => [sale('listed.dusk'), sale('theirs.dusk', sam), sale('cancelled.dusk', me, { returnPending: true })]),
    getAllMarketplaceAuctions: vi.fn(async () => [auction('bidding.dusk', { highestBid: { bidderAuthority: sam, amountLux: 66_000_000_000, placedAtBlockHeight: 1 }, bidCount: 1, startBlockHeight: 10, endBlockHeight: 9_000 })]),
    getPrimaryName: vi.fn(async () => null),
    getSubname: vi.fn(async () => null),
    ...overrides,
  }
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('My names holdings', () => {
  it('keeps names in marketplace escrow, listed or in auction', async () => {
    const holdings = await fetchMyHoldings({ indexerClient: client() as never, selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0' })
    expect(holdings.names.map(item => item.canonicalName)).toEqual(['mine.dusk'])
    expect(holdings.listings.map(item => [item.name, item.kind])).toEqual([['listed.dusk', 'fixed'], ['cancelled.dusk', 'fixed'], ['bidding.dusk', 'auction']])
  })

  it('still shows root names when market listings cannot be read, and says so', async () => {
    const holdings = await fetchMyHoldings({ indexerClient: client({ getAllMarketplaceAuctions: vi.fn(async () => { throw new Error('HTTP 503') }) }) as never,
      selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0' })
    expect(holdings.names.map(item => item.canonicalName)).toEqual(['mine.dusk'])
    expect(holdings.listingsUnavailable).toBe(true)
    expect(view({ listingsUnavailable: true })).toContain('Names you listed in the market could not be loaded. Trying again.')
  })

  it('finds subnames held under someone else\'s name, with the role', async () => {
    const given = subname('maya.nightowls.dusk', sam, me)
    const owned = subname('pay.other.dusk', me, sam)
    const underMine = subname('sub.mine.dusk', me, me)
    const getSubname = vi.fn(async (node: string) => [given, owned, underMine].find(item => item.node === node) ?? null)
    rememberHeldSubname('dusk:0', me, { node: given.node, name: given.name })
    rememberHeldSubname('dusk:0', me, { node: underMine.node, name: underMine.name })
    rememberHeldSubname('dusk:0', me, { node: namehashHex('gone.nightowls.dusk'), name: 'gone.nightowls.dusk' })
    const holdings = await fetchMyHoldings({
      indexerClient: client({ getSubname, getPrimaryName: vi.fn(async () => 'pay.other.dusk') }) as never,
      selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0',
    })
    expect(holdings.subnames.map(item => [item.name, item.role])).toEqual([['maya.nightowls.dusk', 'manager'], ['pay.other.dusk', 'owner']])
    // A subname that is no longer held is forgotten.
    expect(rememberedHeldSubnames('dusk:0', me).map(item => item.name)).toEqual(['maya.nightowls.dusk', 'sub.mine.dusk'])
  })

  it('finds every subname given to the wallet through the holder index, opened here or not', async () => {
    const getAllHoldings = vi.fn(async () => [holding('maya.nightowls.dusk', sam, me, 'manager'), holding('mine.dusk', me, me, 'owner'),
      holding('pay.other.dusk', me, sam, 'owner'), holding('sub.mine.dusk', me, me, 'owner')])
    const indexerClient = client({ getAllHoldings })
    const holdings = await fetchMyHoldings({ indexerClient: indexerClient as never, selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0', holderIndex: true })
    expect(getAllHoldings).toHaveBeenCalledWith({ authority: me })
    expect(holdings.names.map(item => item.canonicalName)).toEqual(['mine.dusk'])
    // Subnames under the wallet's own root are reached through that root.
    expect(holdings.subnames.map(item => [item.name, item.role, item.parentName])).toEqual([['maya.nightowls.dusk', 'manager', 'nightowls.dusk'], ['pay.other.dusk', 'owner', 'other.dusk']])
    // No per-name reads, primary-name lookup or browser memory are needed.
    expect(indexerClient.getSubname).not.toHaveBeenCalled()
    expect(indexerClient.getPrimaryName).not.toHaveBeenCalled()
  })

  it('reads every page of the holder index and rejects malformed rows', async () => {
    const pages: Record<string, unknown> = {
      first: { holdings: [holding('a.night.dusk', me, me, 'owner')], nextCursor: 'next' },
      next: { holdings: [holding('b.night.dusk', sam, me, 'manager')], nextCursor: null },
    }
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      expect(url.pathname).toBe('/api/holdings')
      expect(url.searchParams.get('authority')).toBe(me)
      return Response.json(pages[url.searchParams.get('cursor') ?? 'first'])
    })
    const indexer = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.test/api', fetch })
    expect((await indexer.getAllHoldings({ authority: me })).map(row => [row.name, row.role])).toEqual([['a.night.dusk', 'owner'], ['b.night.dusk', 'manager']])
    pages.first = { holdings: [{ ...holding('a.night.dusk', me, me, 'owner'), role: 'controller' }], nextCursor: null }
    await expect(indexer.getAllHoldings({ authority: me })).rejects.toThrow('invalid holdings response')
    // A snapshot store may not know one of the two.
    pages.first = { holdings: [holding('a.night.dusk', me, null, 'owner'), holding('b.night.dusk', null, me, 'manager')], nextCursor: null }
    expect((await indexer.getAllHoldings({ authority: me })).map(row => [row.name, row.role])).toEqual([['a.night.dusk', 'owner'], ['b.night.dusk', 'manager']])
  })

  it('falls back to the older lookups when the holder index can\'t be read', async () => {
    const given = subname('maya.nightowls.dusk', sam, me)
    rememberHeldSubname('dusk:0', me, { node: given.node, name: given.name })
    // A store still building its index answers 503; a mixed rollout can answer 404.
    const indexerClient = client({ getAllHoldings: vi.fn(async () => { throw new Error('HTTP 503') }), getPrimaryName: vi.fn(async () => 'pay.other.dusk'),
      getSubname: vi.fn(async (node: string) => node === given.node ? given : subname('pay.other.dusk', me, sam)) })
    const holdings = await fetchMyHoldings({ indexerClient: indexerClient as never, selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0', holderIndex: true })
    expect(holdings.names.map(item => item.canonicalName)).toEqual(['mine.dusk'])
    expect(holdings.subnames.map(item => [item.name, item.role])).toEqual([['maya.nightowls.dusk', 'manager'], ['pay.other.dusk', 'owner']])
    expect(indexerClient.getPrimaryName).toHaveBeenCalledTimes(1)
  })

  it('uses the holder index only where the indexer serves it', async () => {
    expect(servesHolderIndex({ routes: ['/health', '/names', '/holdings'] })).toBe(true)
    expect(servesHolderIndex({ routes: ['/health', '/names'] })).toBe(false)
    expect(servesHolderIndex({})).toBe(false)
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { useMyDomains } = await import('./useMyDomains')
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    // The app passes stable callbacks; new ones on every render would restart the read.
    const onBlockHeightChange = () => {}, onLoadPendingReservations = () => {}
    for (const routes of [['/health', '/names', '/holdings'], ['/health', '/names']]) {
      const given = holding('maya.nightowls.dusk', sam, me, 'manager')
      const indexerClient = { ...client({ getAllHoldings: vi.fn(async () => [given]) }),
        getHealth: vi.fn(async () => ({ ok: true, routes, currentBlockHeight: 100 })), getNameState: vi.fn(async () => null) }
      let held: ReturnType<typeof useMyDomains> | undefined
      function Probe() {
        held = useMyDomains({ chainId: 'dusk:0', indexerClient: indexerClient as never, onBlockHeightChange, onLoadPendingReservations,
          selectedAddress: 'wallet', selectedAuthority: me, shouldLoad: true })
        return null
      }
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(<Probe />))
      await act(async () => { await held!.loadMyNames() })
      if (routes.includes('/holdings')) expect(indexerClient.getAllHoldings).toHaveBeenCalledWith({ authority: me })
      else expect(indexerClient.getAllHoldings).not.toHaveBeenCalled()
      expect(held!.mySubnames.map(item => item.name)).toEqual(routes.includes('/holdings') ? ['maya.nightowls.dusk'] : [])
      await act(async () => root.unmount())
    }
    vi.unstubAllGlobals()
  })

  it('falls back to the owner index, the primary name and pages opened here on an older indexer', async () => {
    const given = subname('maya.nightowls.dusk', sam, me)
    rememberHeldSubname('dusk:0', me, { node: given.node, name: given.name })
    const indexerClient = client({ getSubname: vi.fn(async () => given) })
    const holdings = await fetchMyHoldings({ indexerClient: indexerClient as never, selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0', holderIndex: false })
    expect(indexerClient.getAllHoldings).not.toHaveBeenCalled()
    expect(holdings.subnames.map(item => [item.name, item.role])).toEqual([['maya.nightowls.dusk', 'manager']])
  })

  it('lists subnames the owner index returns, beside the root names', async () => {
    const indexed = { ...name('team.other.dusk', sam), manager: me }
    const holdings = await fetchMyHoldings({ indexerClient: client({ getAllNames: vi.fn(async () => [name('mine.dusk'), indexed]),
      getSubname: vi.fn(async () => subname('team.other.dusk', sam, me)) }) as never, selectedAddress: 'wallet', selectedAuthority: me, chainId: 'dusk:0' })
    expect(holdings.names.map(item => item.canonicalName)).toEqual(['mine.dusk'])
    expect(holdings.subnames.map(item => [item.name, item.role])).toEqual([['team.other.dusk', 'manager']])
  })
})

const view = (props: Partial<MyDomainsViewProps>) => renderToStaticMarkup(<MyDomainsView currentBlockHeight={1_000} loading={false} myNames={[]} myNamesError=""
  onForgetPendingReservation={vi.fn()} onOpenIndexedName={vi.fn()} onOpenPendingReservation={vi.fn()} onSearchHome={vi.fn()} pendingReservations={[]}
  primarySummaries={{}} wallet={{ onConnectWallet: vi.fn(), selectedAddress: 'wallet' }} listings={[]} subnames={[]} {...props} />)

describe('My names view', () => {
  it('never says a wallet has no names while it has names in the market', () => {
    const listings: HeldListing[] = [{ kind: 'fixed', name: 'listed.dusk', node: namehashHex('listed.dusk'), listing: sale('listed.dusk') },
      { kind: 'auction', name: 'bidding.dusk', node: namehashHex('bidding.dusk'), listing: auction('bidding.dusk', { highestBid: { bidderAuthority: sam, amountLux: 66_000_000_000, placedAtBlockHeight: 1 }, bidCount: 1, startBlockHeight: 10, endBlockHeight: 9_000 }) }]
    const html = view({ listings })
    expect(html).not.toContain('No names yet')
    expect(html).toContain('In the market')
    expect(html).toContain('For sale · 30 DUSK')
    expect(html).toContain('In auction · current bid 66 DUSK')
    expect(html).toContain('aria-label="Open the listing for listed.dusk"')
    expect(html).toContain('2 names')
  })

  it('shows the role on subnames held under another name', () => {
    const subnames: HeldSubname[] = [{ name: 'maya.nightowls.dusk', node: namehashHex('maya.nightowls.dusk'), parentName: 'nightowls.dusk', role: 'manager', expiresAtBlockHeight: 5_000 }]
    const html = view({ subnames })
    expect(html).toContain('Subnames')
    expect(html).toContain('Manager')
    expect(html).toContain('Under nightowls.dusk')
    expect(html).not.toContain('No names yet')
  })

  it('opens a fixed-price listing in the market by name', () => {
    const route = { view: 'marketplace' as const, listingName: 'listed.dusk' }
    expect(routePath(route)).toBe('/market/listing/listed.dusk')
    expect(parseRoute('/market/listing/Listed')).toEqual(route)
  })
})

describe('remembering held subnames', () => {
  it('remembers a subname whose page shows this wallet as owner or manager, and nothing else', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { useRememberHeldSubname } = await import('./heldSubnames')
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    function Probe(props: Parameters<typeof useRememberHeldSubname>[0]) { useRememberHeldSubname(props); return null }
    const root = createRoot(document.createElement('div'))
    const page = (name: string, owner: string, manager: string) => act(async () => root.render(<Probe chainId="dusk:0" authority={me} name={name} node={namehashHex(name)} owner={owner} manager={manager} />))
    await page('maya.nightowls.dusk', sam, me)
    await page('other.nightowls.dusk', sam, sam)
    await page('mine.dusk', me, me)
    expect(rememberedHeldSubnames('dusk:0', me).map(item => item.name)).toEqual(['maya.nightowls.dusk'])
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  })
})
