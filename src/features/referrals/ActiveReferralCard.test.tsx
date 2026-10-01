import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ActiveReferralCard } from './ActiveReferralCard'
import { referralStateFromInput } from './referralState'

it('shows an ignored referral as a quiet note', async () => {
  const html = renderToStaticMarkup(<ActiveReferralCard
    activeReferral={null}
    appliedReferral={null}
    onClearReferral={() => {}}
    onReferralInputChange={() => {}}
    referralState={await referralStateFromInput(`0x${'09'.repeat(32)}`)}
  />)
  expect(html).toContain('Referral ignored: this address cannot claim rewards.')
  expect(html).not.toContain('danger')
  expect(html).not.toContain('role="alert"')
})
