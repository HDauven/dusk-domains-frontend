import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { RegistrationReviewStep } from './RegistrationReviewStep'
import type { DuskDomainTxState } from '../../names/internal'

it.each(['failed', 'rejected'] as const)('explains the reservation cap in a %s reservation result', status => {
  const commitTxState = { status, context: { title: 'Reserve .dusk domain' },
    message: 'Transaction rejected: runtime panic: DuskDomains: pending commitment limit reached (16)' } as DuskDomainTxState
  const markup = renderToStaticMarkup(<RegistrationReviewStep {...{
    commitTxState, walletSetupState: 'connected', canPrepareCommit: true,
    commitBusy: false, commitStale: false, committed: false, txBusy: false,
    onRefreshWalletProviders: () => {}, walletDiscoveryRefreshing: false, installUrl: '',
    onOpenWalletConnection: () => {}, onPrepareCommit: () => {},
  }} />)
  expect(markup).toContain('Reservation limit reached')
  expect(markup).toContain('This wallet has 16 pending reservations. Open My names to finish a reservation, or wait for one to expire before reserving another.')
  expect(markup).not.toContain('runtime panic')
})
