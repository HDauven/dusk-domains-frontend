import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { deriveAppDerivedState } from '../../app/derived/deriveAppDerivedState'
import { createManagedNameState, type ManagedNameState } from '../../app/managedNameState'
import { namehashHex } from '../../names/internal'
import { SearchResultPanel, type SearchResultPanelProps } from './SearchResultPanel'
import { useIndexedNameHydration } from './useIndexedNameHydration'
import type { ResolverRecordSets } from './indexedNameHydrationTypes'

const aliceAddress = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
const bobAddress = '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r'

it.each([
  { visitor: 'disconnected', selectedAddress: '', indexedPrimary: null },
  { visitor: 'Alice with an indexed primary', selectedAddress: aliceAddress, indexedPrimary: 'alice.dusk' },
  { visitor: 'Alice with a post-grace primary', selectedAddress: aliceAddress, indexedPrimary: null },
  { visitor: 'Bob', selectedAddress: bobAddress, indexedPrimary: 'bob.dusk' },
])('keeps Bob’s hydrated profile verified for $visitor', async ({ selectedAddress, indexedPrimary }) => {
  const name = 'bob.dusk', node = namehashHex(name)
  const selectedAuthority = selectedAddress === bobAddress ? 'bob' : selectedAddress ? 'alice' : ''
  const records = [{ key: 'moonlight_address', value: bobAddress }]
  let managedName = createManagedNameState('resolver')
  let primaryName: string | null = null, connectedPrimaryName: string | null = null, primaryEndpointValue = ''
  let recordSets: ResolverRecordSets = {}
  const indexerClient = {
    getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: 100 })),
    getNameState: vi.fn(async () => ({ owner: 'bob', manager: 'bob', expiresAtBlockHeight: 200, graceEndsAtBlockHeight: 300 })),
    resolveForward: vi.fn(async () => ({ records })),
    getPrimaryName: vi.fn(async ({ value }: { value: string }) => value === bobAddress ? name : indexedPrimary),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []),
  }
  const onChainClient = { readPrimaryName: vi.fn(async () => ({ ok: true, value: { name: 'alice.dusk' } })) }
  const setters = Object.fromEntries(['setActivityEntries', 'setActivityCursor', 'setIndexerError', 'setSubnames', 'setCurrentBlockHeight']
    .map(key => [key, vi.fn()]))
  const props = new Proxy({
    ...setters,
    displayName: name, selectedAddress, indexerClient, onChainClient, recordSourceContractId: 'resolver',
    beginActivityRead: () => () => true, beginOwnershipRead: () => () => true,
    setManagedName: (value: ManagedNameState) => { managedName = value },
    setPrimaryName: (value: string | null) => { primaryName = value },
    setConnectedPrimaryName: (value: string | null) => { connectedPrimaryName = value },
    setPrimaryEndpointValue: (value: string) => { primaryEndpointValue = value },
    setResolverRecordSets: (update: (current: ResolverRecordSets) => ResolverRecordSets) => { recordSets = update(recordSets) },
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() })
  let hydration!: ReturnType<typeof useIndexedNameHydration>
  function Probe() { hydration = useIndexedNameHydration(props as never); return null }
  renderToStaticMarkup(<Probe />)
  await hydration.hydrateNameFromIndexer(indexerClient as never, { canonical: name } as never)
  const state = deriveAppDerivedState({
    walletSigningReady: Boolean(selectedAddress), selectedAddress, selectedAuthority,
    nodeHex: node, displayName: name, managedName, currentBlockHeight: 100, nowSeconds: 0,
    moonlightRecord: recordSets[node]?.[0], primaryName, connectedPrimaryName, primaryEndpointValue,
    pendingReservations: [], subnames: [], subnameLabel: '', subnameManager: '', confirmationInput: '', recordDraftMutations: [], recordDraftErrors: [],
  } as never)
  const html = renderToStaticMarkup(<SearchResultPanel {...{
    nodeHex: node, resultView: 'details', settingsProps: { managedName }, subdomainsProps: { subnames: [] },
    headerProps: { status: 'registered', displayName: name, records, viewerAuthority: selectedAuthority, primaryVerified: state.primaryVerification.verified },
    detailsProps: { displayName: name, parentResolverRecords: recordSets[node], activityEntries: [], subnames: [], primaryVerification: state.primaryVerification },
    primaryProps: { ...state, displayName: name, error: '', txState: null, onClearPrimary: vi.fn(), onSetPrimary: vi.fn() },
  } as unknown as SearchResultPanelProps} />)
  expect(html).toContain('Apps show bob.dusk for this Dusk address.')
  expect(html).not.toContain('This name is not the primary name for its Dusk address.')
  expect(state.primaryVerification).toMatchObject({ verified: true, tone: 'success', displayValue: name })
  expect(state.canClearPrimary).toBe(selectedAddress === bobAddress)
  expect(primaryName).toBe(name)
  expect(connectedPrimaryName).toBe(selectedAddress ? indexedPrimary ?? 'alice.dusk' : null)
  expect(indexerClient.getPrimaryName).toHaveBeenCalledWith({ type: 'moonlight_address', value: bobAddress })
  expect(indexerClient.getPrimaryName).toHaveBeenCalledTimes(selectedAddress === aliceAddress ? 2 : 1)
  expect(onChainClient.readPrimaryName).toHaveBeenCalledTimes(selectedAddress === aliceAddress && !indexedPrimary ? 1 : 0)
})
