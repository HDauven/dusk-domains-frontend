import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { RegistrationFlowPanel, type RegistrationFlowPanelProps } from './RegistrationFlowPanel'
import { countdownCopy } from './registrationCopy'
import { createRegistrationCompletionState, markRegistrationCompletionExecuted } from './registrationCompletionState'
const noop = () => {}
const props = {
  navigation: { onBackToOverview: noop }, resultIssues: [], status: { walletError: '', showReservationRecovery: false },
  wizard: { registrationComplete: false, registrationStep: 'setup', displayName: 'alpha.dusk' },
  step: { displayName: 'alpha.dusk', registrationStep: 'setup', walletSetupState: 'connected', registrationCompletion: null,
    selectedAddress: 'address', registrationFee: 10, duration: 1, registrationTargetAddress: 'address', canPrepareCommit: true,
    onSetAddress: noop, onRegisterSetsPrimaryChange: noop, registerSetsPrimary: true,
    commitWindow: { status: 'waiting', waitBlocks: 5, staleInBlocks: 100 } },
} as unknown as RegistrationFlowPanelProps

it('offers Reserve immediately after wallet connection, with primary name in the summary', () => {
  const html = renderToStaticMarkup(<RegistrationFlowPanel {...props} />)
  expect(html).toMatch(/>Reserve<\/button>/)
  expect(html).toContain('>Primary name</dt>')
  expect(html).toContain('role="switch" aria-checked="true"')
  expect(html).toContain('<dd>You</dd>')
  expect(html).not.toContain('Continue')
})
it('replaces the flow with one claim moment and two next actions', () => {
  const html = renderToStaticMarkup(<RegistrationFlowPanel {...props} wizard={{...props.wizard, registrationComplete:true}} step={{...props.step, registrationCompletion:markRegistrationCompletionExecuted(createRegistrationCompletionState())}} />)
  expect(html).toContain('alpha.dusk is yours')
  expect(html).toContain('>Open</button>')
  expect(html).toContain('>Add records</button>')
  expect(html).toContain('Download card')
  expect(html).not.toContain('Registration complete')
  expect(html).not.toContain('register-stage')
})
it('does not imply readiness when a countdown estimate reaches zero', () => {
  expect(countdownCopy(30)).toBe('Ready in about 30 s')
  expect(countdownCopy(0)).toBe('Waiting for the next block…')
  expect(countdownCopy(-10)).toBe('Waiting for the next block…')
})
