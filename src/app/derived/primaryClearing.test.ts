import { expect, it, vi } from 'vitest'
import { deriveAppDerivedState } from './deriveAppDerivedState'
import { clearPrimaryDomainName } from '../../features/domains/clearPrimaryDomainName'
import { setPrimaryDomainName } from '../../features/domains/setPrimaryDomainName'

const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
const ready = {
  walletSigningReady: true, selectedAddress: address, selectedAuthority: 'alice', nodeHex: 'name', displayName: 'alice.dusk',
  managedName: { node: 'name', owner: 'bob', manager: 'bob', expiresAt: 200, graceEndsAt: 300 },
  moonlightRecord: { key: 'moonlight_address', value: address }, primaryName: 'alice.dusk', connectedPrimaryName: 'alice.dusk', primaryEndpointValue: address,
  currentBlockHeight: 100, nowSeconds: 0, pendingReservations: [], subnames: [], subnameLabel: '', subnameManager: '',
  confirmationInput: '', recordDraftMutations: [], recordDraftErrors: [],
}

it.each(['transfer', 'take-back', 'missing name'])('clears the connected address’s primary after %s without name authority', async reason => {
  const input = { ...ready,
    ...(reason !== 'transfer' ? { moonlightRecord: undefined } : {}),
    ...(reason === 'missing name' ? { managedName: { node: '', owner: '', manager: '', expiresAt: 0, graceEndsAt: 0 } } : {}),
  }
  const state = deriveAppDerivedState(input as never)
  expect(state.canClearPrimary).toBe(true)
  expect(state.canSetPrimary).toBe(false)
  expect(state.primaryVerification.verified).toBe(reason === 'transfer')
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'clear' })), { captureWorkspace: () => () => true })
  const setPrimaryName = vi.fn(), setConnectedPrimaryName = vi.fn()
  await clearPrimaryDomainName({ ...state, displayName: ready.displayName, selectedAuthority: ready.selectedAuthority,
    runtimeConfig: { contracts: {} }, walletSetupState: 'connected', submitNameWrite, setPrimaryName, setConnectedPrimaryName, moonlightRecord: input.moonlightRecord,
    setPrimaryError: vi.fn(), setPrimaryTxState: vi.fn(), appendActivity: vi.fn(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => true,
  } as never)
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk', expect.objectContaining({
    functionName: 'clear_primary_name', args: { endpointType: 'moonlight_address', endpointValue: address },
  }), expect.anything())
  expect(setConnectedPrimaryName).toHaveBeenCalledWith(null)
  if (reason === 'transfer') expect(setPrimaryName).toHaveBeenCalledWith(null)
  else expect(setPrimaryName).not.toHaveBeenCalled()
})

it.each([
  { walletSigningReady: false }, { selectedAddress: '' }, { selectedAddress: 'another-address' },
  { connectedPrimaryName: null }, { connectedPrimaryName: 'another.dusk' }, { primaryTxState: { status: 'submitted' } },
])('blocks primary clearing when the endpoint or transaction is unavailable: %j', override => {
  expect(deriveAppDerivedState({ ...ready, ...override } as never).canClearPrimary).toBe(false)
})

it('asks for the endpoint wallet when primary clearing is blocked', async () => {
  const setPrimaryError = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true })
  await clearPrimaryDomainName({ canClearPrimary: false, displayName: 'alice.dusk', walletSetupState: 'connected',
    setPrimaryError, submitNameWrite } as never)
  expect(setPrimaryError).toHaveBeenLastCalledWith('Connect the wallet for this Dusk address before clearing its primary name.')
  expect(submitNameWrite).not.toHaveBeenCalled()
})

it.each([
  { action: 'set', matchesForward: true }, { action: 'set', matchesForward: false },
  { action: 'clear', matchesForward: true }, { action: 'clear', matchesForward: false },
])('updates only the matching primary states after $action with matchesForward=$matchesForward', async ({ action, matchesForward }) => {
  const setPrimaryName = vi.fn(), setConnectedPrimaryName = vi.fn(), appendActivity = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: action })), { captureWorkspace: () => () => true })
  await (action === 'set' ? setPrimaryDomainName : clearPrimaryDomainName)({
    ...ready, primaryEndpoint: address, canSetPrimary: true, canClearPrimary: true,
    moonlightRecord: { key: 'moonlight_address', value: matchesForward ? address : 'another-address' },
    runtimeConfig: { contracts: {} }, walletSetupState: 'connected', submitNameWrite, setPrimaryName, setConnectedPrimaryName,
    setPrimaryEndpointValue: vi.fn(), setPrimaryError: vi.fn(), setPrimaryTxState: vi.fn(), appendActivity,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => true,
  } as never)
  expect(appendActivity).toHaveBeenCalledWith({
    eventType: action === 'set' ? 'primary_name_set' : 'primary_name_cleared',
    actor: 'alice', target: `moonlight_address:${address}`, txId: action,
  })
  const primary = action === 'set' ? 'alice.dusk' : null
  if (matchesForward) expect(setPrimaryName).toHaveBeenCalledWith(primary)
  else expect(setPrimaryName).not.toHaveBeenCalled()
  expect(setConnectedPrimaryName).toHaveBeenCalledWith(primary)
})
