// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { analyzeName, namehashHex, type DuskDomainsIndexerClient, type PendingNameReservation } from '../names/internal'
import { useActivityFeed } from '../features/activity/useActivityFeed'
import { safeNamehashHex } from '../features/domains/domainFormat'
import { useDomainRecordState } from '../features/domains/useDomainRecordState'
import { saveReservationPrimaryChoice, readReservationPrimaryChoice } from '../features/registration/reservationPrimaryChoice'
import { createRegistrationCompletionState } from '../features/registration/registrationCompletionState'
import { editableRecordKeys, maxDurationYears } from './appConstants'
import { createManagedNameState } from './managedNameState'
import { useDomainManagementAppState } from './useDomainManagementAppState'
import { useRegistrationAppState } from './useRegistrationAppState'
import { useSearchAppState } from './useSearchAppState'
import { useSearchRuntime } from './useSearchRuntime'

let root: Root
let model: ReturnType<typeof useWorkspace>
let client: DuskDomainsIndexerClient | null

function useWorkspace() {
  const search = useSearchAppState('account')
  const registration = useRegistrationAppState()
  const domain = useDomainManagementAppState('resolver', client, null)
  const displayName = search.apiSearchResult?.canonical ?? search.query
  const records = useDomainRecordState({ displayName, nodeHex: safeNamehashHex(displayName), editableRecordKeys })
  const activity = useActivityFeed({ defaultName: displayName, defaultNode: safeNamehashHex(displayName), indexerClient: client, setError: search.setIndexerError })
  const runtime = useSearchRuntime({
    chainId: 'dusk:0', displayName, indexerClient: client, onChainClient: null, liveDuskDomainsApp: null,
    getCurrentBlockHeight: async () => 100, currentBlockHeight: search.currentBlockHeight,
    nowSeconds: search.nowSeconds, query: search.query, recordSourceContractId: 'resolver', selectedAddress: '',
    loadPendingReservations: () => [], openSearchView: () => search.setMainView('search'),
    search: search.searchActions, registration: registration.searchActions, domain: domain.searchActions,
    records: records.searchActions, activity: activity.searchActions,
  })
  return { search, registration, domain, records, activity, runtime }
}

function Probe() {
  const workspace = useWorkspace()
  useLayoutEffect(() => { model = workspace })
  return null
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  client = null
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('clears the old workspace but preserves the chosen term, clock, and stranded reservation when searching', async () => {
  vi.useFakeTimers()
  await act(async () => root.render(<Probe />))
  const stranded = { controller: 'owner', commitment: 'commit' }
  await act(async () => {
    model.search.setMainView('treasury')
    model.search.setChecked(true)
    model.search.setApiSearchResult(analyzeName('alpha.dusk'))
    model.search.setResultView('records')
    model.search.setCurrentBlockHeight(123)
    model.search.setNowSeconds(456)
    model.registration.setDuration(4)
    model.registration.setStrandedCommitment(stranded)
    model.registration.setCommitted(true)
    model.registration.setRegisterSetsPrimary(false)
    model.registration.setRegistrationStep('purchase')
    model.registration.setPreparedCommit({ controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0', commitment: 'commit', secret: 'secret', committedBlockHeight: 100, committedTxId: 'tx' })
    model.registration.setRegistrationCompletion(createRegistrationCompletionState())
    model.domain.setManagedName({ ...createManagedNameState('resolver'), owner: 'owner', node: namehashHex('alpha.dusk') })
    model.domain.setPrimaryName('alpha.dusk')
    model.domain.setConnectedPrimaryName('alpha.dusk')
    model.domain.setPrimaryEndpointValue('old-address')
    model.domain.setRenewalYears(7)
    model.domain.setSubnameLabel('old-child')
    model.domain.setSubnameManager('old-manager')
    model.domain.setSubnameExpiryPolicy('fixed_before_parent')
    model.domain.setSubnameExpiryDate('2030-01-01')
    model.domain.setSubnames([{ name: 'pay.alpha.dusk' } as never])
    model.records.setRecordDrafts({ website: 'https://example.com' })
    model.records.setResolverRecordSets({ old: [] })
    model.activity.setActivityEntries([{ eventType: 'domain_registered' } as never])
    model.activity.setActivityLoading(true)
    model.activity.setActivityCursor({ node: 'old', cursor: 'next' })
  })
  await act(async () => {
    model.search.setIndexerError('Old read failed')
    model.search.setIndexerConfirmation('Old confirmation')
    model.domain.setManagementError('Old transfer failed')
    model.domain.setRecordError('Old save failed')
  })
  await act(async () => model.runtime.resetSearch('beta.dusk'))
  expect(model.search).toMatchObject({ query: 'beta.dusk', mainView: 'treasury', checked: false, resultView: 'overview', apiSearchResult: null,
    currentBlockHeight: 123, nowSeconds: 456, indexerError: '', indexerConfirmation: '' })
  expect(model.registration).toMatchObject({ duration: 4, strandedCommitment: stranded, committed: false, preparedCommit: null,
    registerSetsPrimary: true, registrationStep: 'review', registrationCompletion: null })
  expect(model.domain).toMatchObject({ managedName: createManagedNameState('resolver'), managementError: '', recordError: '',
    primaryName: null, connectedPrimaryName: null, primaryEndpointValue: '', renewalYears: 1, subnames: [],
    subnameLabel: 'settlement', subnameManager: '', subnameExpiryPolicy: 'inherits_parent', subnameExpiryDate: '' })
  expect(model.records).toMatchObject({ recordDrafts: {}, resolverRecordSets: {} })
  expect(model.activity).toMatchObject({ activityEntries: [], activityLoading: false, hasMoreActivity: false })
  await act(async () => model.runtime.handleSearchHome())
  expect(model.search).toMatchObject({ mainView: 'search', query: '', checked: false })
})

it.each([true, false])('restores saved reservation primary choice %s and its bounded term through search', async primary => {
  const reservation: PendingNameReservation = { directory:'01'.repeat(32), commitmentStore:'03'.repeat(32),
    name: 'alpha.dusk', node: namehashHex('alpha.dusk'), commitment: 'commit', secret: 'secret', controller: 'owner',
    ownerAddress: 'wallet', chainId: 'dusk:0', durationYears: 20, committedBlockHeight: null, committedTxId: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  saveReservationPrimaryChoice(reservation, primary)
  await act(async () => root.render(<Probe />))
  await act(async () => model.runtime.openPendingReservation(reservation))
  expect(model.search).toMatchObject({ query: 'alpha.dusk', checked: true, resultView: 'register' })
  expect(model.registration).toMatchObject({ registrationStep: 'purchase', committed: true, duration: maxDurationYears, registerSetsPrimary: primary,
    preparedCommit: { controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0', commitment: 'commit', secret: 'secret', committedBlockHeight: null, committedTxId: null } })
  await act(async () => model.runtime.handleSearchHome())
  expect(model.registration).toMatchObject({ committed: false, preparedCommit: null, registerSetsPrimary: true })
  expect(readReservationPrimaryChoice(reservation)).toBe(primary)
})

function indexedClient() {
  return {
    searchName: vi.fn(async (name: string) => ({ ...analyzeName(name), status: 'registered' as const })),
    getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: 100 })),
    getNameState: vi.fn(async (node: string) => ({ node, owner: 'owner', manager: 'manager', expiresAtBlockHeight: 200 })),
    resolveForward: vi.fn(async () => ({ records: [{ key: 'website', value: 'https://example.com' }] })),
    getActivityPage: vi.fn(async () => ({ activity: [], nextCursor: null })),
    getAllSubnames: vi.fn(async () => []),
  }
}

it('clears records and authority from the previous name when the next hydration fails', async () => {
  const indexed = indexedClient()
  client = indexed as unknown as DuskDomainsIndexerClient
  await act(async () => root.render(<Probe />))
  await act(async () => model.runtime.openIndexedName('alpha.dusk'))
  expect(model.domain.managedName).toMatchObject({ node: namehashHex('alpha.dusk'), owner: 'owner', expiresAt: 200 })
  expect(model.records.resolverRecords).toEqual([{ key: 'website', value: 'https://example.com' }])
  indexed.getHealth.mockRejectedValueOnce(new Error('Offline'))
  await act(async () => model.runtime.openIndexedName('beta.dusk'))
  expect(model.domain.managedName.node).toBe('')
  expect(model.domain.managedName.owner).not.toBe('owner')
  expect(model.records.resolverRecordSets).toEqual({})
  expect(model.activity.activityLoading).toBe(false)
})

it('keeps the newer name when an older search resolves last', async () => {
  const indexed = indexedClient()
  let finishOldRead!: (result: Awaited<ReturnType<typeof indexed.searchName>>) => void
  const oldRead = new Promise<Awaited<ReturnType<typeof indexed.searchName>>>(resolve => { finishOldRead = resolve })
  indexed.searchName.mockImplementationOnce(() => oldRead)
  client = indexed as unknown as DuskDomainsIndexerClient
  await act(async () => root.render(<Probe />))
  let oldSearch!: Promise<void>
  await act(async () => { oldSearch = model.runtime.openIndexedName('alpha.dusk') })
  await act(async () => model.runtime.openIndexedName('beta.dusk'))
  await act(async () => { finishOldRead({ ...analyzeName('alpha.dusk'), status: 'registered' }); await oldSearch })
  expect(model.search.apiSearchResult?.canonical).toBe('beta.dusk')
  expect(model.domain.managedName.node).toBe(namehashHex('beta.dusk'))
  expect(model.records.resolverRecords).toEqual([{ key: 'website', value: 'https://example.com' }])
  expect(model.activity.activityLoading).toBe(false)
})
