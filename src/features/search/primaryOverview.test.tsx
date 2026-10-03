import { searchActions } from './test-fixtures/searchActions'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { deriveAppDerivedState } from '../../app/derived/deriveAppDerivedState'
import { createManagedNameState } from '../../app/managedNameState'
import { namehashHex } from '../../names/internal'
import { openIndexedName } from './actions/openIndexedName'
import { SearchResultPanel, type SearchResultPanelProps, type SearchResultView } from './SearchResultPanel'
import { useIndexedNameHydration } from './useIndexedNameHydration'

const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'

it.each([
  { storedPrimary: 'alice.dusk', selectedAddress: address, clearable: true },
  { storedPrimary: 'other.dusk', selectedAddress: address, clearable: false },
  { storedPrimary: null, selectedAddress: address, clearable: false },
  { storedPrimary: 'alice.dusk', selectedAddress: '', clearable: false },
])('offers primary clearing on the post-grace landing page only for its connected endpoint: %j', async ({ storedPrimary, selectedAddress, clearable }) => {
  const name = 'alice.dusk', node = namehashHex(name)
  const result = { canonical: name, status: 'available', issues: [] }
  let managedName = createManagedNameState('resolver')
  let primaryName: string | null = null, connectedPrimaryName: string | null = null, primaryEndpointValue = ''
  let resultView: SearchResultView = 'details'
  const indexerClient = {
    searchName: vi.fn(async () => result), getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: 300 })),
    getNameState: vi.fn(async () => ({ owner: 'alice', manager: 'alice', expiresAtBlockHeight: 100, graceEndsAtBlockHeight: 200 })),
    resolveForward: vi.fn(async () => null), getPrimaryName: vi.fn(async () => null),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []),
  }
  const onChainClient = { readPrimaryName: vi.fn(async () => ({ ok: true, value: storedPrimary ? { name: storedPrimary } : null })) }
  const setIndexerError = vi.fn()
  const props = {
    ...searchActions({
    search: { fail: setIndexerError, open: value => { resultView = value }, showView: value => { resultView = value } },
    domain: { hydrate: snapshot => {
      managedName = snapshot.managedName
      primaryName = snapshot.primaryName
      connectedPrimaryName = snapshot.connectedPrimaryName
      primaryEndpointValue = snapshot.primaryEndpoint
    } },
    }),
    openSearchView: vi.fn(), loadPendingReservations: () => [], displayName: name, selectedAddress, indexerClient, onChainClient, recordSourceContractId: 'resolver',
  }
  let hydration!: ReturnType<typeof useIndexedNameHydration>
  function Probe() { hydration = useIndexedNameHydration(props as never); return null }
  renderToStaticMarkup(<Probe />)
  const actions = new Proxy(hydration, { get: (target, key) => key in target ? target[key as keyof typeof target] : Reflect.get(props, key) })
  await openIndexedName(actions as never, name)
  expect(setIndexerError).not.toHaveBeenCalledWith(expect.stringMatching(/.+/))
  expect(resultView).toBe('overview')
  expect(managedName).toMatchObject({ node, expiresAt: 100, graceEndsAt: 200 })
  expect(primaryName).toBeNull()
  expect(connectedPrimaryName).toBe(selectedAddress ? storedPrimary : null)
  expect(onChainClient.readPrimaryName).toHaveBeenCalledTimes(selectedAddress ? 1 : 0)
  const state = deriveAppDerivedState({
    walletSigningReady: true, selectedAddress, selectedAuthority: selectedAddress ? 'alice' : '', nodeHex: node, displayName: name,
    managedName, currentBlockHeight: 300, nowSeconds: 0, primaryName, connectedPrimaryName, primaryEndpointValue,
    pendingReservations: [], subnames: [], subnameLabel: '', subnameManager: '', confirmationInput: '', recordDraftMutations: [], recordDraftErrors: [],
  } as never)
  expect(state.canClearPrimary).toBe(clearable)
  expect(state.canSetPrimary).toBe(false)
  expect(state.primaryVerification.verified).toBe(false)
  const html = renderToStaticMarkup(<SearchResultPanel {...{
    nodeHex: node,
    resultView,
    headerProps: { status: result.status, displayName: name, records: [], viewerAuthority: selectedAddress ? 'alice' : '' },
    overviewProps: {
      canRegister: true,
      displayName: name,
      resultIssues: [],
      resultStatus: result.status,
      quote: { duration: 1, expiryDate: '2027-01-01', registrationFee: 1 },
      reservation: {  },
    },
    management: { settingsProps: {
        managedName,
        ownership: {  },
        renewal: {  },
        clock: {  },
      }, subdomainsProps: {
        subnames: [],
        creation: {  },
        authority: {  },
        clock: {  },
      }, primaryProps: { ...state, displayName: name, error: '', txState: null, onClearPrimary: vi.fn(), onSetPrimary: vi.fn() } },
  } as unknown as SearchResultPanelProps} />)
  expect(html).toContain('Claim alice.dusk')
  expect(html).not.toContain('View profile')
  expect(html.includes('>Clear primary name</button>')).toBe(clearable)
})
