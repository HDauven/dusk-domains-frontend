// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'
import { account } from '../../test/frozenFixtures'
import { NameShare } from '../search/NameShare'
import { referralRules } from './referralRules'
import { ReferralsView } from './ReferralsView'
import type { ReferralsViewProps } from './referralsViewTypes'

afterEach(() => vi.unstubAllGlobals())
const text = (html: string) => html.replaceAll('&#x27;', '\'').replaceAll('<!-- -->', '')
const launch = { ...DEFAULT_FEE_CONFIG, referralRewardBps: 2000, renewalReferralRewardBps: 1000, premiumReferralRewardBps: 0 }

it('states the reward rates and rules from the live policy and renewal schedule', () => {
  expect(referralRules(launch)).toEqual([
    // A dropped name registered again earns too, not only a name never registered before.
    'When someone registers a name through your link, you earn 20% of its registration price, not counting any dropped-name premium.',
    // The referrer stays with the registration through transfers and sales, until the name is released.
    'Each time that name is renewed, you earn 10% of the renewal price, for as long as it stays registered, even after it changes hands.',
    'Rewards build up in the protocol treasury, and you can claim them at any time. Claiming here pays them to your connected Dusk address.',
    'Only public Dusk addresses and contracts can earn rewards, not shielded addresses.',
    // Another referral link replaces the saved one, even one that can't earn (referralState.ts).
    'Your link holds your full public Dusk address, because rewards are paid to that address. It counts when someone registers in the browser tab they opened it in, before they close that tab. If they open another referral link there first, the newer link replaces yours.',
  ])
  expect(referralRules({ ...launch, premiumReferralRewardBps: 500, renewalReferralRewardBps: 0, referralRewardBps: 1250 }).slice(0, 2)).toEqual([
    'When someone registers a name through your link, you earn 12.5% of its registration price and 5% of any dropped-name premium.',
    'Rewards build up in the protocol treasury, and you can claim them at any time. Claiming here pays them to your connected Dusk address.',
  ])
  // Rates are only stated once they are read from the chain.
  expect(referralRules(null).join(' ')).not.toMatch(/%/)
})

it('shows how rewards work on the Referrals page, connected or not', () => {
  const html = (selectedAddress: string) => text(renderToStaticMarkup(<ReferralsView
    wallet={{ selectedAddress, walletSetupState: selectedAddress ? 'connected' : 'disconnected', onOpenWalletConnection: vi.fn() }}
    link={{ referralLink: selectedAddress ? 'http://localhost/?ref=address' : '', referralCopied: false, onCopyReferralLink: vi.fn() }}
    referralState={{ input: '', valid: false, reason: '', principal: null }} referralError="" referralConfirmation="" onClearReferral={vi.fn()}
    rules={referralRules(launch)}
    rewards={{ referralAccountState: { referralCount: 0, claimedLux: 0, claimableLux: 0, recentActivity: [] } } as unknown as ReferralsViewProps['rewards']} />))
  expect(html('address')).toContain('It counts when someone registers a name through it.')
  for (const page of [html('address'), html('')]) {
    expect(page).toContain('How rewards work')
    expect(page).toContain('you earn 20% of its registration price')
    expect(page).toContain('Only public Dusk addresses and contracts can earn rewards')
  }
})

it('says when a shared link carries your referral, before and after copying', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const writeText = vi.fn(async () => {})
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  const share = async (referralAddress: string) => {
    await act(async () => root.render(<NameShare key={referralAddress} name="nightowlshq.dusk" referralAddress={referralAddress} />))
    await act(async () => (document.querySelector('button') as HTMLButtonElement).click())
    return document.querySelector('[role="status"]')?.textContent
  }
  // Without a referral there is nothing to say, before or after copying.
  await act(async () => root.render(<NameShare key="none" name="nightowlshq.dusk" referralAddress="" />))
  expect(document.querySelector('.name-share-note')).toBeNull()
  // The status is always there, so a screen reader announces what lands in it.
  expect(document.querySelector('[role="status"]')?.textContent).toBe('')
  await act(async () => root.render(<NameShare key="before" name="nightowlshq.dusk" referralAddress={account} />))
  expect(document.querySelector('[role="status"]')?.textContent).toBe('')
  // Visible before anyone copies, and read out with the button.
  const note = document.querySelector('.name-share-note')
  expect(note?.textContent).toBe('Share adds your Dusk address to the link as a referral.')
  expect(document.querySelector('button')?.getAttribute('aria-describedby')).toBe(note?.id)
  expect(await share(account)).toBe('Copied. The link includes your Dusk address as a referral.')
  expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining(`?ref=${account}`))
  expect(document.querySelector('.name-share-note')).toBeNull()
  expect(await share(`contract:0x${'09'.repeat(32)}`)).toBe('Copied. The link includes your contract ID as a referral.')
  expect(await share('')).toBe('Copied')
  expect(document.querySelector('.name-share-note')).toBeNull()
  expect(writeText).toHaveBeenLastCalledWith(expect.not.stringContaining('ref='))
  await act(async () => root.unmount())
})
