import type { CoreFeeConfig } from '../../names/internal'

const percent = (bps: number) => `${Number((bps / 100).toFixed(2))}%`

/**
 * The referral programme as the contracts run it. The policy sets the registration share (base price
 * and dropped-name premium separately), for any public registration, a dropped name's too. The
 * directory's renewal schedule sets the share of every renewal, credited to the referrer stored with
 * the registration, which transfers and sales keep, until the name is released. Claims are never
 * paused. In v1 only Moonlight accounts and contracts are claimable referrers. Attribution is kept
 * for the browser session, as the Privacy Notice says, and the last referral link opened in the tab
 * replaces the one before, even a link that can't earn.
 * Rates appear only once read from the chain.
 */
export function referralRules(config: CoreFeeConfig | null) {
  const rules: string[] = []
  if (config) {
    const premium = config.premiumReferralRewardBps > 0
      ? ` and ${percent(config.premiumReferralRewardBps)} of any dropped-name premium`
      : ', not counting any dropped-name premium'
    rules.push(config.referralRewardBps > 0 || config.premiumReferralRewardBps > 0
      ? `When someone registers a name through your link, you earn ${percent(config.referralRewardBps)} of its registration price${premium}.`
      : 'Registrations through your link earn no reward at the moment.')
    if (config.renewalReferralRewardBps > 0) {
      rules.push(`Each time that name is renewed, you earn ${percent(config.renewalReferralRewardBps)} of the renewal price, for as long as it stays registered, even after it changes hands.`)
    }
  }
  rules.push('Rewards build up in the protocol treasury, and you can claim them at any time. Claiming here pays them to your connected Dusk address.')
  rules.push('Only public Dusk addresses and contracts can earn rewards, not shielded addresses.')
  rules.push('Your link holds your full public Dusk address, because rewards are paid to that address. It counts when someone registers in the browser tab they opened it in, before they close that tab. If they open another referral link there first, the newer link replaces yours.')
  return rules
}
