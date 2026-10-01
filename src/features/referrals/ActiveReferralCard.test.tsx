import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ActiveReferralCard } from './ActiveReferralCard'
import { referralStateFromInput } from './referralState'

it('shows an ignored referral as a quiet note', async () => {
  const html = renderToStaticMarkup(<ActiveReferralCard
    onClear={() => {}}
    referral={await referralStateFromInput(`0x${'09'.repeat(32)}`)}
  />)
  expect(html).toContain('Referral ignored: this address cannot claim rewards.')
  expect(html).not.toContain('danger')
  expect(html).not.toContain('role="alert"')
})

it('shows only the referrer from a link and no manual address field', () => {
  expect(renderToStaticMarkup(<ActiveReferralCard referral={{input:'',valid:false,principal:null,reason:''}} onClear={() => {}} />)).toBe('')
  const html = renderToStaticMarkup(<ActiveReferralCard referral={{input:'linked-address',valid:true,principal:null,reason:''}} onClear={() => {}} />)
  expect(html).toContain('Referred by')
  expect(html).toContain('linked-address')
  expect(html).not.toContain('<input')
})
