import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { RegistrationSummary } from './RegistrationSummary'
import { createRegistrationCompletionState, markRegistrationCompletionExecuted, updateRegistrationCompletionState } from './registrationCompletionState'

it('keeps the submitted payment and expiry after hydration changes availability', () => {
  const summary = { registrationFee: 10, expiryDate: '2027-06-27' }
  const pending = createRegistrationCompletionState(summary)
  const confirmed = updateRegistrationCompletionState(pending, 'complete_registration', { status: 'executed', txId: 'tx-registration' } as Parameters<typeof updateRegistrationCompletionState>[2])
  const completed = markRegistrationCompletionExecuted(confirmed)
  expect(completed.summary).toEqual(summary)
  const noop = () => {}
  // The panel reads the fee and expiry from the completion summary, not the live preview.
  const html = renderToStaticMarkup(<RegistrationPurchaseStep
    canRestartReservation={false} canRevealRegistration={false} commitWindow={{ status: 'missing', staleInBlocks: 0, waitBlocks: 0 }}
    installUrl="" onOpenWalletConnection={noop} onRegisterName={noop} onRestartReservation={noop} onSetAddress={noop}
    registrationCompletion={completed} reservationStranded={false} txBusy={false} txState={null} walletSetupState="connected"
  />) + renderToStaticMarkup(<RegistrationSummary
    activeReferral={null} appliedReferral={null} committed={true} displayName="aurora.dusk" duration={1}
    expiryDate={completed.summary?.expiryDate ?? '-'} feeConfigError="" onChangeTerm={noop}
    registerSetsPrimary={true} registrationComplete={true} registrationFee={completed.summary?.registrationFee ?? 0}
    registrationTargetAddress="account" selectedAddress="account"
  />)
  expect(html).toContain('10 <small>DUSK</small>')
  expect(html).toContain(summary.expiryDate)
  expect(html).toContain('Registration complete')
  expect(html).toContain('Network fees show in your wallet')
  expect(html).not.toContain('Waiting for reservation confirmation')
})
