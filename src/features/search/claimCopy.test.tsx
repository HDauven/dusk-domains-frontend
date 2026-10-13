import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { reservation } from '../../test/frozenFixtures'
import { PendingReservationsList } from '../domains/my-domains/PendingReservationsList'
import { RegistrationPurchaseStep } from '../registration/RegistrationPurchaseStep'
import { SearchResultOverview } from './SearchResultOverview'

const overview = (props: Partial<Parameters<typeof SearchResultOverview>[0]>) => renderToStaticMarkup(<SearchResultOverview canRegister={false}
  displayName="aurora.dusk" resultStatus="available" resultIssues={[]} onContinueRegistration={() => {}} onViewDetails={() => {}}
  quote={{} as never} reservation={{ savedReservation: null } as never} {...props} />)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
// The claim card never says both that a name can't be claimed and that it can be registered.
const consistent = (html: string) => expect(text(html)).not.toMatch(/can be registered/)

const banner = 'New reservations and registrations will resume when the operator reopens them.'

it.each([
  ['with nothing else to say', ''],
  // Rusk answers a paused quote with HTTP 500; its generic error must not replace the pause.
  ['after a quote failed', 'The request could not be completed. Refresh and try again.'],
])('says registrations are paused, as the banner does, %s', (_, blockedReason) => {
  const html = overview({ registrationsPaused: true, registrationUnavailable: true, blockedReason })
  expect(text(html)).toContain('Registrations are paused')
  expect(text(html)).toContain(banner)
  expect(text(html)).not.toContain('could not be completed')
  consistent(html)
})

it('says who can create an unregistered subname, instead of saying it can be registered', () => {
  const html = overview({ displayName: 'sub.ritakeep.dusk' })
  expect(text(html)).toContain('Only the owner or manager of ritakeep.dusk can create sub.ritakeep.dusk.')
  consistent(html)
  // A pause doesn't change who creates subnames.
  expect(text(overview({ displayName: 'sub.ritakeep.dusk', registrationsPaused: true }))).toContain('Only the owner or manager of ritakeep.dusk')
})

it.each([
  ['a read-only site', { registrationUnavailable: true, readOnly: true }, 'This site is read only. Names can’t be registered here.'],
  ['a quote still loading', { quoteLoading: true }, 'Checking its price and whether it’s open for registration.'],
  ['no known reason', {}, 'It can’t be claimed right now. Try again later.'],
] as const)('gives an available name a consistent reason on %s', (_, props, copy) => {
  const html = overview(props)
  expect(text(html)).toContain(copy)
  consistent(html)
})

// A paused store doesn't age a reservation any slower: it expires 8,640 blocks after it was made.
const saved = reservation({ name: 'aurora.dusk' })
const savedWindow = (staleInBlocks: number) => ({ status: 'ready' as const, waitBlocks: 0, staleInBlocks })

it('warns, while registrations are paused, that a saved reservation can expire before they reopen', () => {
  const html = text(overview({ registrationsPaused: true, reservation: { savedReservation: saved, savedReservationWindow: savedWindow(8_000),
    onOpenPendingReservation: vi.fn(), onOpenPendingReservations: vi.fn() } }))
  expect(html).toContain('Registrations are paused, so this reservation can’t be registered now. It expires in about 22 hours; if registrations haven’t reopened by then, reserve the name again.')
})

it('warns when a reservation is about to expire, such as soon after a pause ends', () => {
  const html = text(overview({ reservation: { savedReservation: saved, savedReservationWindow: savedWindow(200),
    onOpenPendingReservation: vi.fn(), onOpenPendingReservations: vi.fn() } }))
  expect(html).toContain('Register soon: this reservation expires in about 33 minutes.')
  // With most of its day left, nothing extra is said.
  expect(text(overview({ reservation: { savedReservation: saved, savedReservationWindow: savedWindow(8_000),
    onOpenPendingReservation: vi.fn(), onOpenPendingReservations: vi.fn() } }))).not.toMatch(/expires in about/)
})

it('warns in My names and at Register when a pause can outlast a reservation', () => {
  const list = text(renderToStaticMarkup(<PendingReservationsList registrationsPaused currentBlockHeight={100 + 640}
    pendingReservations={[{ ...saved, committedBlockHeight: 100 }]} onForgetPendingReservation={vi.fn()} onOpenPendingReservation={vi.fn()} />))
  expect(list).toContain('Registrations are paused, so this reservation can’t be registered now. It expires in about 22 hours')
  const step = text(renderToStaticMarkup(<RegistrationPurchaseStep
    reservation={{ canRestartReservation: false, commitWindow: savedWindow(8_000), onRestartReservation: vi.fn(), reservationStranded: false, registrationsPaused: true }}
    purchase={{ canRevealRegistration: false, onRegisterName: vi.fn(), onSetAddress: vi.fn(), registrationCompletion: null, txBusy: false, txState: null }}
    wallet={{ installUrl: '', onOpenWalletConnection: vi.fn(), walletSetupState: 'connected' }} />))
  expect(step).toContain('Registrations are paused, so this reservation can’t be registered now. It expires in about 22 hours')
  expect(step).not.toContain('Sign to register the name and pay.')
})
