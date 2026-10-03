import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { deriveRegistrationCapabilities } from '../../app/derived/registrationCapabilities'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { RegistrationReviewStep } from './RegistrationReviewStep'
import { createRegistrationCompletionState, updateRegistrationCompletionState } from './registrationCompletionState'
import { applyCompleteRegistrationSuccess } from './completeRegistrationSuccess'

it.each([true, false])('keeps the connected primary state current after registration with primary=%s', async registerSetsPrimary => {
  const setPrimaryName = vi.fn(), setConnectedPrimaryName = vi.fn()
  await applyCompleteRegistrationSuccess({
    preparedCommit: { commitment: 'commit' }, displayName: 'alpha.dusk', nodeHex: 'node', selectedAuthority: 'owner',
    selectedAddress: 'address', registrationTargetAddress: 'address', registerSetsPrimary, runtimeConfig: { chainId: 'local' },
    loadPendingReservations: vi.fn(), setRegistrationCompletion: vi.fn(), setManagedName: vi.fn(), setResolverRecordSets: vi.fn(),
    setPrimaryName, setConnectedPrimaryName, setPrimaryEndpointValue: vi.fn(), appendActivity: vi.fn(),
    shouldApplyPreviewWriteFallback: async () => true,
  } as never, { finalState: { status: 'executed' }, request: { lifecycle: { expiresAt: 200, graceEndsAt: 300 } } } as never)
  expect(setPrimaryName).toHaveBeenCalledWith(registerSetsPrimary ? 'alpha.dusk' : null)
  if (registerSetsPrimary) expect(setConnectedPrimaryName).toHaveBeenCalledWith('alpha.dusk')
  else expect(setConnectedPrimaryName).not.toHaveBeenCalled()
})

it('does not declare an executed wallet transaction a confirmed registration', async () => {
  let progress = updateRegistrationCompletionState(createRegistrationCompletionState(), 'complete_registration', {status:'executed',txId:'tx'} as never)
  expect(progress.status).toBe('running')
  const loadPendingReservations=vi.fn()
  const props={preparedCommit:{commitment:'commit'},displayName:'alpha.dusk',nodeHex:'node',selectedAuthority:'owner',runtimeConfig:{chainId:'local'},loadPendingReservations,
    setRegistrationCompletion:(update: (current: typeof progress) => typeof progress)=>{progress=update(progress)},
    shouldApplyPreviewWriteFallback:async (_:string,check: (client:unknown)=>Promise<boolean>)=>{await check({searchName:async()=>({status:'available'}),getNameState:async()=>null});return false},
  } as unknown as Parameters<typeof applyCompleteRegistrationSuccess>[0]
  await applyCompleteRegistrationSuccess(props,{finalState:{status:'executed'},request:{}} as never)
  expect(progress.status).toBe('failed')
  expect(progress.message).toContain('not confirmed yet')
  expect(loadPendingReservations).not.toHaveBeenCalled()
})
it('lets an expired reservation be replaced while preventing early registration', () => {
  const props={canRegister:true,walletAuthorized:true,selectedAddress:'address',nodeHex:'node',commitWindow:{status:'stale'},committed:true,preparedCommit:{commitment:'commit'},registrationTargetReady:true} as unknown as Parameters<typeof deriveRegistrationCapabilities>[0]
  expect(deriveRegistrationCapabilities(props)).toMatchObject({canRestartReservation:true,canRevealRegistration:false})
  expect(deriveRegistrationCapabilities({...props,commitWindow:{status:'waiting',waitBlocks:1,staleInBlocks:100}})).toMatchObject({canRevealRegistration:false})
  expect(deriveRegistrationCapabilities({...props,walletAuthorized:false}).canRestartReservation).toBe(false)
})
it('offers inline wallet recovery and a restart for expired claims', () => {
  const review = {
    reservation: { canPrepareCommit: false, commitBusy: false, commitStale: false, commitTxState: null, committed: false, onPrepareCommit: vi.fn() },
    wallet: { installUrl: '/wallet', onOpenWalletConnection: vi.fn(), onRefreshWalletProviders: vi.fn(), walletDiscoveryRefreshing: false },
    purchase: { txBusy: false },
  }
  for (const [walletSetupState, copy] of [['disconnected','Connect'],['wrong-network','Switch'],['missing','Install Dusk Wallet']] as const) {
    expect(renderToStaticMarkup(<RegistrationReviewStep {...review}
        wallet={{ ...review.wallet, walletSetupState }} />)).toContain(copy)
  }
  const html=renderToStaticMarkup(<RegistrationPurchaseStep reservation={{ canRestartReservation: true, commitWindow: {status:'stale',waitBlocks:0,staleInBlocks:0}, onRestartReservation: vi.fn(), reservationStranded: false }}
        purchase={{ canRevealRegistration: false, onRegisterName: vi.fn(), onSetAddress: vi.fn(), registrationCompletion: null, txBusy: false, txState: null }}
        wallet={{ installUrl: "", onOpenWalletConnection: vi.fn(), walletSetupState: "connected" }} />)
  expect(html).toContain('Reservation expired')
  expect(html).toContain('Reserve again')
})
