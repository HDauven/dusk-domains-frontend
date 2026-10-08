import { fromHex, decodeBase58 } from '@duskdomains/sdk'
import { expect, it, vi } from 'vitest'
import {
  createDuskDomainsOnChainClient,
  namehashHex, type DuskDomainsIndexerClient, type NameResult,
} from '../../names/internal'
import { deriveAppDerivedState } from '../../app/derived/deriveAppDerivedState'
import { readIndexedName } from './indexedNameReads'

const address = '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r'
const node = namehashHex('alice.dusk')
const registry = `0x${'ab'.repeat(32)}`

const endpoint = { kind: 'MoonlightAddress', value: Array.from(decodeBase58(address)!) }
const record = { name: 'alice.dusk', node: Array.from({ length: 32 }, (_, i) => parseInt(node.slice(2 + i * 2, 4 + i * 2), 16)), updated_at: 90 }
const searchResult = { canonical: 'alice.dusk' } as NameResult

function setup(primary: string | null = null, payload: unknown = { endpoint, record }) {
  const client = {
    resolveForward: vi.fn(async () => null),
    getNameState: vi.fn(async () => ({ owner: 'alice', manager: 'alice', expiresAtBlockHeight: 100, graceEndsAtBlockHeight: 200 })),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []),
    getPrimaryName: vi.fn(async () => primary),
  }
  const readContract = vi.fn(async () => payload && (payload as {record:unknown}).record ? {spelling:'alice.dusk',primary:{name:{key:{node:fromHex(node,32)}},updated_at:90n}} : null)
  const onChainClient = createDuskDomainsOnChainClient({read:{read:async()=>null,client:Promise.resolve({discover:async()=>({stores:[{id:fromHex(registry,32)}]}),store:()=>({read_primary:readContract})} as never)}})
  return { client: client as unknown as DuskDomainsIndexerClient, readContract, onChainClient }
}

it('recovers a primary hidden after grace through frozen store discovery and read_primary so its endpoint can clear it', async () => {
  const { client, onChainClient, readContract } = setup()
  const reads = await readIndexedName(client, searchResult, address, onChainClient)
  expect(reads?.primaryName).toBeNull()
  expect(reads?.connectedPrimaryName).toBe('alice.dusk')
  expect(reads?.primaryEndpoint).toBe(address)
  expect(reads?.readErrors).toEqual([])
  expect(readContract).toHaveBeenCalledWith({endpoint:Array.from(decodeBase58(address)!)})
  const state = deriveAppDerivedState({
    walletSigningReady: true, selectedAddress: address, selectedAuthority: 'alice', nodeHex: node, displayName: 'alice.dusk',
    managedName: { node, owner: 'alice', manager: 'alice', expiresAt: 100, graceEndsAt: 200 }, currentBlockHeight: 300, nowSeconds: 0,
    primaryName: reads?.primaryName, connectedPrimaryName: reads?.connectedPrimaryName, primaryEndpointValue: reads?.primaryEndpoint, pendingReservations: [], subnames: [],
    subnameLabel: '', subnameManager: '', confirmationInput: '', recordDraftMutations: [], recordDraftErrors: [],
  } as never)
  expect(state.canClearPrimary).toBe(true)
  expect(state.canSetPrimary).toBe(false)
  expect(state.primaryVerification.verified).toBe(false)
})

it('uses an indexed primary without adding chain reads', async () => {
  const { client, onChainClient, readContract } = setup('alice.dusk')
  expect((await readIndexedName(client, searchResult, address, onChainClient))?.connectedPrimaryName).toBe('alice.dusk')
  expect(readContract).not.toHaveBeenCalled()
})

it('does not read another endpoint on chain when no wallet is connected', async () => {
  const { client, onChainClient, readContract } = setup()
  vi.mocked(client.resolveForward).mockResolvedValue({ records: [{ key: 'moonlight_address', value: address }] } as never)
  expect((await readIndexedName(client, searchResult, '', onChainClient))?.primaryName).toBeNull()
  expect(readContract).not.toHaveBeenCalled()
})

it('keeps primary empty when the endpoint has no stored mapping', async () => {
  const { client, onChainClient } = setup(null, { endpoint, record: null })
  const reads = await readIndexedName(client, searchResult, address, onChainClient)
  expect(reads?.primaryName).toBeNull()
  expect(reads?.connectedPrimaryName).toBeNull()
  expect(reads?.readErrors).toEqual([])
})

it('reports a failed fallback without dropping the other name reads', async () => {
  const { client, onChainClient, readContract } = setup()
  readContract.mockRejectedValue(new Error('Node unavailable'))
  const reads = await readIndexedName(client, searchResult, address, onChainClient)
  expect(reads?.primaryName).toBeNull()
  expect(reads?.connectedPrimaryName).toBeNull()
  expect(reads?.readErrors).toContain('Node unavailable')
  expect(reads?.stateRead.value?.owner).toBe('alice')
})

it.each(['expired', 'unverified', 'unhealthy', 'missing', 'missing resolver', 'missing expiry'])('does not verify an unsafe forward record as primary: %s', async unsafe => {
  const { client, onChainClient, readContract } = setup('alice.dusk')
  vi.mocked(client.resolveForward).mockResolvedValue({
    canonicalName: 'alice.dusk',
    node,
    records: [{ key: 'moonlight_address', value: address }],
    resolver: unsafe === 'missing resolver' ? undefined : { resolverId: registry, health: unsafe === 'unhealthy' ? 'unavailable' : 'ok' },
    expiry: unsafe === 'missing expiry' ? undefined : { status: unsafe === 'expired' ? 'expired' : 'active', expiresAt: '2026-01-01T00:00:00.000Z' },
    cache: { asOf: '2026-01-02T00:00:00.000Z', ttlSeconds: 60, staleAt: '2026-01-02T00:01:00.000Z' },
    warnings: [],
    errors: [{ code: 'expired_name', message: 'The name is expired.' }],
    verificationStatus: unsafe === 'unverified' ? 'unverified' : unsafe === 'missing' ? undefined : 'forward_resolved',
  } as never)

  const reads = await readIndexedName(client, searchResult, address, onChainClient)
  expect(reads?.primaryName).toBeNull()
  const derived = deriveAppDerivedState({
    walletSigningReady: true, selectedAddress: address, selectedAuthority: 'alice', nodeHex: node, displayName: 'alice.dusk',
    managedName: { node, owner: 'alice', manager: 'alice', expiresAt: 100, graceEndsAt: 200 }, currentBlockHeight: 300, nowSeconds: 0,
    moonlightRecord: { key: 'moonlight_address', value: address }, primaryName: reads?.primaryName,
    connectedPrimaryName: reads?.connectedPrimaryName, primaryEndpointValue: reads?.primaryEndpoint, pendingReservations: [], subnames: [],
    subnameLabel: '', subnameManager: '', confirmationInput: '', recordDraftMutations: [], recordDraftErrors: [],
  } as never)
  expect(derived.primaryVerification.verified).toBe(false)
  expect(derived.canClearPrimary).toBe(true)
  // The wallet's separate, unverified mapping remains available for clearing.
  expect(reads?.connectedPrimaryName).toBe('alice.dusk')
  expect(client.getPrimaryName).toHaveBeenCalledExactlyOnceWith({ type: 'moonlight_address', value: address })
  expect(readContract).not.toHaveBeenCalled()
  vi.mocked(client.getPrimaryName).mockClear()
  const visitor = await readIndexedName(client, searchResult, '', onChainClient)
  expect(visitor?.primaryName).toBeNull()
  expect(visitor?.connectedPrimaryName).toBeNull()
  expect(client.getPrimaryName).not.toHaveBeenCalled()
  expect(readContract).not.toHaveBeenCalled()
})

it('keeps custom canonical resolver records without applying editor validation or inventing dates', async () => {
  const { client, onChainClient } = setup()
  vi.mocked(client.resolveForward).mockResolvedValue({ records: [], verificationStatus: 'unverified' } as never)
  vi.spyOn(onChainClient, 'getName').mockResolvedValue({ ok: true, value: { record: { owner: 'alice', manager: 'alice', lifecycle: { expiresAtBlock: 100, graceEndsAtBlock: 200 } } } } as never)
  vi.spyOn(onChainClient, 'getRecords').mockResolvedValue({ ok: true, value: [{ key: 'custom.binary', value: '0xff00', visibility: 'public', ttlSeconds: 60, updatedAtBlock: 90 }] } as never)
  const result = await readIndexedName(client, { ...searchResult, status: 'registered' }, '', onChainClient)
  expect(result?.forwardRead.value?.records).toEqual([{ key: 'custom.binary', value: '0xff00', visibility: 'public', ttlSeconds: 60, updatedAt: '' }])
})

it.each(['owner', 'website', 'unchanged'])('keeps website verification bound when chain %s is read', async change => {
  const { client, onChainClient } = setup()
  const verification = { domain: 'harbourline.com', status: 'verified', checkedAt: new Date().toISOString(), dnssec: false }
  const website = { key: 'website', value: 'https://harbourline.com' }
  vi.mocked(client.resolveForward).mockResolvedValue({ records: [website], verification } as never)
  vi.mocked(client.getNameState).mockResolvedValue({ owner: 'alice', verification } as never)
  vi.spyOn(onChainClient, 'getName').mockResolvedValue({ ok: true, value: { record: {
    owner: change === 'owner' ? 'bob' : 'alice', manager: 'alice', lifecycle: { expiresAtBlock: 100, graceEndsAtBlock: 200 },
  } } } as never)
  vi.spyOn(onChainClient, 'getRecords').mockResolvedValue({ ok: true, value: [{ ...website, value: change === 'website' ? website.value + '/changed' : website.value }] } as never)
  const reads = await readIndexedName(client, { ...searchResult, status: 'registered' }, '', onChainClient)
  expect(reads?.forwardRead.value?.verification).toEqual(change === 'unchanged' ? verification : undefined)
  expect(reads?.stateRead.value?.verification).toEqual(change === 'unchanged' ? verification : undefined)
})
