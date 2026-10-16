import type { ComponentProps } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TransactionStatusNotice } from '../components/status/TransactionStatusNotice'
import { useMarketplaceRefund } from '../features/marketplace/useMarketplaceRefund'
import { useMarketplaceWrites, type MarketplaceWrites } from '../features/marketplace/useMarketplaceWrites'
import { useReferralActions } from '../features/referrals/useReferralActions'
import { claimTreasury } from '../features/treasury/claimTreasuryAction'
import { updateFeeConfig } from '../features/treasury/updateFeeConfigAction'
import { namehashHex, storeRenewRequest, type DuskDomainTxState } from '../names/internal'
import { contracts } from '../test/frozenFixtures'
import { AppShell } from './AppShell'
import type { PendingConfirmation } from './confirmationRead'
import { unpaused } from './operatorPause'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { createWriteAccess } from './writeAccess'

const wallet = { state: { installed: true, authorized: true, chainId: 'dusk:0', profiles: [{ account: 'owner', profileId: 'primary' }], selectedProfile: { account: 'owner', profileId: 'primary' } } as import('@dusk/connect').DuskWalletState }
const txId = 'ab'.repeat(32)
const preflight = { ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true }
const shell = { navigation: { mainView: 'treasury', pendingReservationCount: 0 }, network: { label: 'Local', tone: 'local' }, launchLinks: {}, wallet: { walletState: { accounts: [] }, walletStatus: 'disconnected' }, skyNames: [] } as unknown as ComponentProps<typeof AppShell>

// The app's writer, with a wallet that signs whatever it is asked and sees it execute.
function writer() {
  const spellings: string[] = [], pending: PendingConfirmation[] = [], states: DuskDomainTxState[] = []
  const app = {
    chainId: 'dusk:0',
    prepareIntent: async (request: { functionName: string }, spelling: string) => { spellings.push(spelling); return { functionName: request.functionName, deposit: '0' } },
    readContract: async () => null,
    prepareContractCall: async () => ({ gas: { limit: '1', price: '1' } }),
    writeContract: async () => ({ id: txId, wait: async () => ({ status: 'executed' }) }),
  } as never
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', liveDuskDomainsApp: app, contracts,
      onPendingConfirmation: confirmation => { if (confirmation) pending.push(confirmation) },
      writeAccess: createWriteAccess({ mode: 'live_ready', liveWritesEnabled: true }, app, unpaused) })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  return { submit, spellings, pending, states, onUpdate: (state: DuskDomainTxState | null) => { if (state) states.push(state) } }
}

const notice = (state: DuskDomainTxState) => renderToStaticMarkup(<TransactionStatusNotice state={state} />)
// The shell shows a pending write away from its page once automatic checks pause.
function banner(pending: PendingConfirmation) {
  const html = renderToStaticMarkup(<AppShell {...shell} pendingConfirmation={{ ...pending, state: { ...pending.state, retryConfirmation: () => {} } }}>Page</AppShell>)
  return html.match(/<section aria-label="Pending transaction">[\s\S]*?<\/section>/)?.[0] ?? ''
}

function expectActionNotices({ states, pending, spellings }: ReturnType<typeof writer>, label: string) {
  // The notice and the banner give the action in plain text: no .dusk name, name styling or link.
  const html = [notice(states.at(-1)!), banner(pending[0])]
  expect(html).toEqual([expect.stringContaining(label), expect.stringContaining(label)])
  for (const part of html) {
    expect(part).not.toContain('.dusk')
    expect(part).not.toMatch(/<a\b|name-signature|name-chip/)
  }
  expect(states.at(-1)).toMatchObject({ status: 'executed', txId, context: { title: label } })
  expect(pending).toEqual([{ action: label, state: expect.objectContaining({ status: 'submitted', txId }) }])
  // Preparation gets no name to resolve or to show in the wallet.
  expect(spellings).toEqual([''])
}

it('titles a referral claim by its action in its notice and the pending banner', async () => {
  const h = writer()
  await useReferralActions({ ...preflight, referralClaimable: true, referralBusy: false, referralRewardClaimReady: true,
    selectedAddress: 'owner', liveDuskDomainsApp: {}, runtimeConfig: { contracts }, referralAccountState: { claimableLux: '1' },
    indexerClient: null, setReferralConfirmation: () => {}, setReferralError: () => {}, setReferralTxState: h.onUpdate,
    submitNameWrite: h.submit } as never).handleClaimReferralRewards()
  expectActionNotices(h, 'Claim referral rewards')
})

it.each(['all', 'partial'] as const)('titles a treasury claim of %s by its action in its notice and the pending banner', async mode => {
  const h = writer()
  await claimTreasury({ ...preflight, connectedAsTreasuryOperator: true, treasuryAvailable: true, treasuryBusy: false,
    selectedAddress: 'owner', liveDuskDomainsApp: {}, runtimeConfig: { contracts }, indexerClient: null,
    treasuryState: { availableLux: '5', operatorRecipient: 'owner' }, treasuryClaimAmountLux: '2',
    setTreasuryConfirmation: () => {}, setTreasuryError: () => {}, setTreasuryTxState: h.onUpdate, resetTreasuryClaimAmount: () => {},
    submitNameWrite: h.submit } as never, mode)
  expectActionNotices(h, 'Claim protocol fees')
})

it('titles a pricing update by its action in its notice and the pending banner', async () => {
  const h = writer()
  await updateFeeConfig({ ...preflight, connectedAsTreasuryOperator: true, feeConfigBusy: false, selectedAddress: 'owner',
    liveDuskDomainsApp: {}, runtimeConfig: { contracts }, indexerClient: null, feeConfig: {},
    feeConfigForm: { threeCharYearDusk: '200', fourCharYearDusk: '60', fivePlusYearDusk: '12', premiumStartDusk: '0',
      premiumReferralRewardPercent: '0', referralRewardPercent: '10', renewalReferralRewardPercent: '5' },
    setFeeConfigConfirmation: () => {}, setFeeConfigUpdateError: () => {}, setFeeConfigTxState: h.onUpdate,
    submitNameWrite: h.submit } as never)
  expectActionNotices(h, 'Update pricing')
})

it('titles a marketplace refund by its action, not as a name', async () => {
  const h = writer()
  let writes!: MarketplaceWrites
  function Probe() {
    writes = useMarketplaceWrites({ ...preflight, actionsAvailable: true, feedbackScope: 'refunds', duskDomainsOnChainClient: null,
      feedback: { setConfirmation: () => {}, setError: () => {}, setTxState: h.onUpdate }, indexerClient: null,
      loadMarketplace: async () => {}, onOpenWalletConnection: () => {}, runtimeConfig: { contracts }, selectedAddress: 'owner',
      marketplaceOnChainClient: { getRefund: async () => ({ ok: true, value: { authority: 'aa', amountLux: 1n } }) },
      submitNameWrite: h.submit } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  await useMarketplaceRefund(writes)({ authority: 'aa', amountLux: '1', marketplaceContractId: contracts.marketplace!.contractId } as never)
  expectActionNotices(h, 'Marketplace refund')
})

it('keeps titling a name’s write, its notice and the pending banner with the name', async () => {
  const h = writer()
  await h.submit('aurora.dusk', storeRenewRequest({ node: namehashHex('aurora.dusk'), durationYears: 1, feeLux: 1 }), { contracts, onUpdate: h.onUpdate })
  expect(h.states.at(-1)).toMatchObject({ status: 'executed', context: { title: 'aurora.dusk' } })
  expect(h.pending).toEqual([{ name: 'aurora.dusk', state: expect.objectContaining({ txId }) }])
  expect(h.spellings).toEqual(['aurora.dusk'])
  expect(notice(h.states.at(-1)!)).toContain('<span>aurora.dusk</span>')
  expect(banner(h.pending[0])).toContain('<p>aurora.dusk</p>')
})
