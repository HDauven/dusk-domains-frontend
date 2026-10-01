import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { deriveRegistrationCapabilities } from '../../app/derived/registrationCapabilities'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { RegistrationReviewStep } from './RegistrationReviewStep'
import { createRegistrationCompletionState, updateRegistrationCompletionState } from './registrationCompletionState'
import { applyCompleteRegistrationSuccess } from './completeRegistrationSuccess'

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
  const review={canPrepareCommit:false,commitBusy:false,commitStale:false,commitTxState:null,committed:false,installUrl:'/wallet',onOpenWalletConnection:vi.fn(),onPrepareCommit:vi.fn(),onRefreshWalletProviders:vi.fn(),walletDiscoveryRefreshing:false,txBusy:false}
  for (const [walletSetupState, copy] of [['disconnected','Connect'],['wrong-network','Switch'],['missing','Install Dusk Wallet']] as const) {
    expect(renderToStaticMarkup(<RegistrationReviewStep {...review} walletSetupState={walletSetupState} />)).toContain(copy)
  }
  const html=renderToStaticMarkup(<RegistrationPurchaseStep canRestartReservation canRevealRegistration={false} commitWindow={{status:'stale',waitBlocks:0,staleInBlocks:0}} installUrl="" onOpenWalletConnection={vi.fn()} onRegisterName={vi.fn()} onRestartReservation={vi.fn()} onSetAddress={vi.fn()} registrationCompletion={null} reservationStranded={false} txBusy={false} txState={null} walletSetupState="connected" />)
  expect(html).toContain('Reservation expired')
  expect(html).toContain('Reserve again')
})
