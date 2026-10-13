// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DuskDomainsOnChainReadTransport } from '../names/internal'
import { isMarketplaceEscrow } from './managedNameState'
import { usePoolMarketplace } from './usePoolMarketplace'

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

const first = `0x${'05'.repeat(32)}`, next = `0x${'0c'.repeat(32)}`
// The manifest lists both markets, the old one draining, so its orders can still be settled.
const release = { contracts: new Map([[first.slice(2), { role: 'marketplace' }], [next.slice(2), { role: 'marketplace' }], ['11'.repeat(32), { role: 'store' }]]) }
// A read through the client verifies the market first.
const verifying = (rejected: string[] = []) => (id: string) => ({ order_api_version: async () => {
  if (rejected.includes(id)) throw new Error('Contract deployment binding mismatch')
  return 1
} })

it('follows a change of preferred market without a reload, and still knows the market it moved from', async () => {
  let preferred = first
  const read = { client: Promise.resolve({ release, marketplace: verifying() }), read: vi.fn(async () => ({ marketplace: preferred })) } as unknown as DuskDomainsOnChainReadTransport
  let market!: ReturnType<typeof usePoolMarketplace>
  function Probe() {
    market = usePoolMarketplace(read)
    return null
  }
  await act(async () => root.render(<Probe />))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  expect(market.preferred).toBe(first)
  // SetPreferredMarketplace executes; the page reads the directory again after a confirmed write.
  preferred = next
  await act(async () => { window.dispatchEvent(new Event('dusk-domains:write-confirmed')); await new Promise(resolve => setTimeout(resolve, 0)) })
  expect(market.preferred).toBe(next)
  expect(market.known).toEqual(expect.arrayContaining([first, next]))
  // A name the previous market still holds is recognised as listed there.
  expect(isMarketplaceEscrow({ owner: first, manager: first }, market.known)).toBe(true)
  expect(isMarketplaceEscrow({ owner: `0x${'77'.repeat(32)}`, manager: `0x${'77'.repeat(32)}` }, market.known)).toBe(false)
})

const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

// SDK 0.3.2 adds a contract it resolves to the client's release before verifying it. The live app
// then discards that client, but a read already holding it must not publish what its release lists.
it('drops the markets of a client discarded while its read was in flight', async () => {
  const unverified = `0x${'0f'.repeat(32)}`
  const stale = { release: { contracts: new Map([[next.slice(2), { role: 'marketplace' }], [unverified.slice(2), { role: 'marketplace' }]]) }, marketplace: verifying() }
  const clean = { release: { contracts: new Map([[next.slice(2), { role: 'marketplace' }]]) }, marketplace: verifying() }
  let resolveStale!: (client: unknown) => void
  let current: unknown = stale
  let pending: Promise<unknown> = new Promise(resolve => { resolveStale = resolve })
  const read = { get client() { return pending }, read: vi.fn(async () => ({ marketplace: next })), isCurrentClient: (client: unknown) => client === current } as unknown as DuskDomainsOnChainReadTransport
  let market!: ReturnType<typeof usePoolMarketplace>
  function Probe() {
    market = usePoolMarketplace(read)
    return null
  }
  await act(async () => root.render(<Probe />))
  // The app swaps in a clean client, then the stale promise resolves.
  current = clean
  pending = Promise.resolve(clean)
  await act(async () => { window.dispatchEvent(new Event('dusk-domains:client-reset')) })
  resolveStale(stale)
  await settle()
  expect(market.known).not.toContain(unverified)
  await act(async () => { window.dispatchEvent(new Event('dusk-domains:write-confirmed')); await new Promise(resolve => setTimeout(resolve, 0)) })
  expect(market.known).toEqual([next])
  expect(market.preferred).toBe(next)
})

it('drops what it already showed from a client that is discarded later', async () => {
  const listed = { release, marketplace: verifying() }
  let current: unknown = listed
  const read = { client: Promise.resolve(listed), read: vi.fn(async () => ({ marketplace: next })), isCurrentClient: (client: unknown) => client === current } as unknown as DuskDomainsOnChainReadTransport
  let market!: ReturnType<typeof usePoolMarketplace>
  function Probe() {
    market = usePoolMarketplace(read)
    return null
  }
  await act(async () => root.render(<Probe />))
  await settle()
  expect(market.known).toEqual(expect.arrayContaining([first, next]))
  current = null
  await act(async () => { window.dispatchEvent(new Event('dusk-domains:client-reset')) })
  expect(market.known).toEqual([])
  expect(market.preferred).toBeNull()
})

it('never lists a market whose verification fails', async () => {
  const read = { client: Promise.resolve({ release, marketplace: verifying([first.slice(2)]) }), read: vi.fn(async () => ({ marketplace: next })) } as unknown as DuskDomainsOnChainReadTransport
  let market!: ReturnType<typeof usePoolMarketplace>
  function Probe() {
    market = usePoolMarketplace(read)
    return null
  }
  await act(async () => root.render(<Probe />))
  await settle()
  expect(market.known).toEqual([next])
})

it('never counts a preferred market whose verification fails as known', async () => {
  const read = { client: Promise.resolve({ release, marketplace: verifying([next.slice(2)]) }), read: vi.fn(async () => ({ marketplace: next })) } as unknown as DuskDomainsOnChainReadTransport
  let market!: ReturnType<typeof usePoolMarketplace>
  function Probe() {
    market = usePoolMarketplace(read)
    return null
  }
  await act(async () => root.render(<Probe />))
  await settle()
  expect(market.known).toEqual([first])
  // A name that market holds isn't presented as listed.
  expect(isMarketplaceEscrow({ owner: next, manager: next }, market.known)).toBe(false)
})
