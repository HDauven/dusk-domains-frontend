import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ReferralsView } from './ReferralsView'
import type { ReferralsViewProps } from './referralsViewTypes'

it('keeps the link, referrer and claim action without stat tiles or manual refresh', () => {
  const props = {
    showReferralSummary:true,referralAttributionLabel:'Linked',referralLink:'http://localhost/?ref=address',selectedAddress:'address',walletSetupState:'connected',
    referralState:{input:'referrer',valid:true,reason:'',principal:null},
    referralAccountState:{referralCount:1,claimedLux:0,claimableLux:1_000_000_000,recentActivity:[]},
    referralRewardSummaryValue:'1 DUSK',referralClaimable:true,referralRewardClaimReady:true,
    referralRewardsSupported:true,referralClaimRecipient:'address',
  } as unknown as ReferralsViewProps
  const html = renderToStaticMarkup(<ReferralsView {...props} />)
  expect(html).toContain('Your link')
  expect(html).toContain('>Copy<')
  expect(html).toContain('Referred by')
  expect(html).toContain('Claim rewards')
  expect(html).not.toContain('Referral summary')
  expect(html).not.toContain('Refresh')
  expect(html).not.toContain('Their wallet address')
})
