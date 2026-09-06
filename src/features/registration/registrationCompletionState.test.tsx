import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { createRegistrationCompletionState, markRegistrationCompletionExecuted, updateRegistrationCompletionState } from './registrationCompletionState'

it('keeps the submitted payment and expiry after hydration changes availability', () => {
  const summary = { registrationFee: 10, expiryDate: '2027-06-27' }
  const pending = createRegistrationCompletionState(summary)
  const confirmed = updateRegistrationCompletionState(pending, 'complete_registration', { status: 'executed', txId: 'tx-registration' } as Parameters<typeof updateRegistrationCompletionState>[2])
  const completed = markRegistrationCompletionExecuted(confirmed)
  expect(completed.summary).toEqual(summary)
  const noop = () => {}
  const html = renderToStaticMarkup(<RegistrationPurchaseStep
    activeReferral={null} appliedReferral={null} canRegister={false} canRevealRegistration={false}
    commitWindow={{ status: 'missing', staleInBlocks: 0, waitBlocks: 0 }}
    displayName="aurora.dusk" expiryDate="-" feeConfigError="" installUrl="" networkFee={null}
    onOpenWalletConnection={noop} onRegisterName={noop} onSetAddress={noop}
    registerSetsPrimary={true} registrationCompletion={completed} registrationFee={0}
    registrationTargetAddress="account" selectedAddress="account" total={0}
    txBusy={false} txState={null} walletSetupState="connected"
  />)
  expect(html).toContain('10.00 DUSK')
  expect(html).toContain(summary.expiryDate)
  expect(html).toContain('Completed')
  expect(html).toContain('Shown in wallet for each transaction')
  expect(html).not.toContain('Waiting for reservation confirmation')
})
