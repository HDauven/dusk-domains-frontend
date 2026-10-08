import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { NameHeader } from './NameHeader'
import { SearchResultOverview } from './SearchResultOverview'

const claimProps: ComponentProps<typeof SearchResultOverview> = {
  canRegister: true, displayName: 'google.dusk', resultStatus: 'available', resultIssues: [],
  onContinueRegistration: vi.fn(), onViewDetails: vi.fn(),
  quote: { duration: 1, expiryDate: '', feeConfigLoading: false, registrationFee: 10, onDurationChange: vi.fn() },
  reservation: { savedReservation: null, savedReservationWindow: null, onOpenPendingReservation: vi.fn(), onOpenPendingReservations: vi.fn() },
}
const notice = 'google.dusk matches a well-known brand. It will show as unverified unless its owner proves it with their website, and impersonating a brand may be illegal.'

it('puts the brand notice above an enabled claim button without adding a step', () => {
  const html = renderToStaticMarkup(<SearchResultOverview {...claimProps} />)
  expect(html).toContain(notice)
  expect(html.indexOf(notice)).toBeLessThan(html.indexOf('>Claim google.dusk</button>'))
  expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Claim google.dusk<\/button>/)
})

it.each(['alice.dusk', 'mail.google.dusk', 'g00gle.dusk'])('omits the brand notice for %s', displayName => {
  expect(renderToStaticMarkup(<SearchResultOverview {...claimProps} displayName={displayName} />)).not.toContain('matches a well-known brand')
})

it('shows the notice when resuming a saved reservation', () => {
  const html = renderToStaticMarkup(<SearchResultOverview {...claimProps} reservation={{ ...claimProps.reservation,
    savedReservation: { canonicalName: 'google.dusk' } as never, savedReservationWindow: { status: 'ready', waitBlocks: 0 } }} />)
  expect(html).toContain(notice)
})

it.each([undefined, null, {}, { status: 'unverified' }, { status: 'pending' }, { status: 'expired' }, { status: 'verified' }])('uses website verification independently of primary-name verification: %j', verification => {
  const html = renderToStaticMarkup(<NameHeader displayName="google.dusk" lifecycleLabel={null} primaryVerified records={[]} reserved={false} status="registered" verification={verification as never} />)
  expect(html.includes('>Unverified</span>')).toBe(verification?.status !== 'verified')
  expect(html.includes('Not verified by google. Check before trusting it.')).toBe(verification?.status !== 'verified')
})

it.each(['alice.dusk', 'mail.google.dusk', 'g00gle.dusk'])('does not label %s as a watched brand', displayName => {
  const html = renderToStaticMarkup(<NameHeader displayName={displayName} lifecycleLabel={null} primaryVerified={false} records={[]} reserved={false} status="registered" />)
  expect(html).not.toContain('Unverified')
})
