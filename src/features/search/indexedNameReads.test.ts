import { expect, it, vi } from 'vitest'
import {
  createDuskDomainsOnChainClient, createDuskDomainsOnChainReadTransport, DUSK_DOMAINS_CONTRACTS,
  decodeBase58, namehashHex, type DuskConnectAppLike, type DuskDomainsIndexerClient, type NameResult,
} from '../../names/internal'
import { deriveAppDerivedState } from '../../app/derived/deriveAppDerivedState'
import { readIndexedName } from './indexedNameReads'

const address = '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r'
const node = namehashHex('alice.dusk')
const registry = `0x${'ab'.repeat(32)}`
const contracts = { ...DUSK_DOMAINS_CONTRACTS, router: { ...DUSK_DOMAINS_CONTRACTS.router, contractId: `0x${'cd'.repeat(32)}` } }
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
  const readContract = vi.fn(async ({ contract, functionName }: Parameters<DuskConnectAppLike['readContract']>[0]) => {
    if (functionName === 'locate_primary') {
      expect(contract.contractId).toBe(contracts.router.contractId)
      return { fnName: functionName, output: registry }
    }
    expect(functionName).toBe('read_primary_name')
    expect(contract.contractId).toBe(registry)
    return { fnName: functionName, output: payload }
  })
  const onChainClient = createDuskDomainsOnChainClient({
    read: createDuskDomainsOnChainReadTransport({ readContract } as DuskConnectAppLike, contracts), currentBlockHeight: 300,
  })
  return { client: client as unknown as DuskDomainsIndexerClient, readContract, onChainClient }
}

it('recovers a primary hidden after grace through locate_primary and read_primary_name so its endpoint can clear it', async () => {
  const { client, onChainClient, readContract } = setup()
  const reads = await readIndexedName(client, searchResult, address, onChainClient)
  expect(reads?.primaryName).toBeNull()
  expect(reads?.connectedPrimaryName).toBe('alice.dusk')
  expect(reads?.primaryEndpoint).toBe(address)
  expect(reads?.readErrors).toEqual([])
  expect(readContract.mock.calls.map(([call]) => [call.contract.contractId, call.functionName, call.args])).toEqual([
    [contracts.router.contractId, 'locate_primary', { endpoint }],
    [registry, 'read_primary_name', { endpoint }],
  ])
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
