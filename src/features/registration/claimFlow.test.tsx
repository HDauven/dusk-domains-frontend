import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { RegistrationFlowPanel, type RegistrationFlowPanelProps } from './RegistrationFlowPanel'
import { countdownCopy } from './registrationCopy'
import { createRegistrationCompletionState, markRegistrationCompletionExecuted } from './registrationCompletionState'
const noop = () => {}
const props = {
  navigation: { onBackToOverview: noop }, resultIssues: [], status: { walletError: '', showReservationRecovery: false },
  wizard: { registrationComplete: false, registrationStep: 'review', displayName: 'alpha.dusk' },
  step: {
    registrationStep: 'review',
    wallet: { walletSetupState: 'connected', selectedAddress: 'address' },
    purchase: { registrationCompletion: null, onSetAddress: noop },
    quote: { displayName: 'alpha.dusk', registrationFee: 10, duration: 1, registrationTargetAddress: 'address' },
    primaryChoice: { onRegisterSetsPrimaryChange: noop, registerSetsPrimary: true },
    referral: {},
    reservation: { canPrepareCommit: true, commitWindow: { status: 'waiting', waitBlocks: 5, staleInBlocks: 100 } },
  },
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
  const html = renderToStaticMarkup(<RegistrationFlowPanel {...props} wizard={{...props.wizard, registrationComplete:true}} step={{
  ...props.step,
  purchase: {
    ...props.step.purchase,
    registrationCompletion:markRegistrationCompletionExecuted(createRegistrationCompletionState()),
  },
}} />)
  expect(html.replace(/<[^>]*>/g, '')).toContain('alpha.dusk is yours')
  expect(html).toContain('>Open</button>')
  expect(html).toContain('>Add records</button>')
  // The name page's share row, right above, offers the card.
  expect(html).not.toContain('Download card')
  expect(html).not.toContain('name-portrait')
  expect(html).not.toContain('Registration complete')
  expect(html).not.toContain('register-stage')
})
it('does not imply readiness when a countdown estimate reaches zero', () => {
  expect(countdownCopy(30)).toBe('Ready in about 30 s')
  expect(countdownCopy(0)).toBe('Waiting for the next block…')
  expect(countdownCopy(-10)).toBe('Waiting for the next block…')
})

it.each(['review', 'purchase'] as const)('keeps the brand notice above the %s wallet action', registrationStep => {
  const html = renderToStaticMarkup(<RegistrationFlowPanel {...props}
    wizard={{ ...props.wizard, displayName: 'google.dusk', registrationStep }}
    step={{ ...props.step, registrationStep, reservation: { ...props.step.reservation, commitWindow: { status: 'ready', waitBlocks: 0, staleInBlocks: 100 } },
      purchase: { ...props.step.purchase, canRevealRegistration: true } }} />)
  const notice = 'google.dusk matches a well-known brand. It will show as unverified unless its owner proves it with their website, and impersonating a brand may be illegal.'
  expect(html).toContain(notice)
  const button = html.match(/<button[^>]*>?(?:Reserve|Register)[\s<]/)
  expect(button).not.toBeNull()
  expect(html.indexOf(notice)).toBeLessThan(button!.index!)
  expect(button![0]).not.toContain('disabled')
})
