import { expect, it, vi } from 'vitest'
import { claimTreasury } from './claimTreasuryAction'
import { useReferralActions } from '../referrals/useReferralActions'

vi.mock('../../names/internal', async importOriginal => ({
  ...await importOriginal<typeof import('../../names/internal')>(),
  treasuryClaimAllReferralRewardsRuntimeCall: () => ({}),
  waitForConfirmedIndexerRefresh: async ({ check, refresh }: { check: () => Promise<boolean>; refresh: () => Promise<boolean> }) => {
    const confirmed = await check()
    return { confirmed, refreshed: confirmed && await refresh() }
  },
}))

it('recognizes a treasury claim across decimal string digit boundaries', async () => {
  const setTreasuryConfirmation = vi.fn(), loadTreasury = vi.fn(async () => true)
  await claimTreasury({ connectedAsTreasuryOperator: true, treasuryAvailable: true, treasuryBusy: false,
    selectedAddress: 'wallet', liveDuskDomainsApp: {}, runtimeConfig: { contracts: {} },
    treasuryState: { availableLux: '10000000000000001' },
    indexerClient: { getTreasury: async () => ({ availableLux: '9999999999999999', lastEventType: 'treasury_fee_received' }) },
    setTreasuryConfirmation, setTreasuryError: vi.fn(), setTreasuryTxState: vi.fn(), resetTreasuryClaimAmount: vi.fn(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    submitNameWrite: async () => ({ status: 'executed' }), loadTreasury,
  } as never, 'all')
  expect(setTreasuryConfirmation).toHaveBeenLastCalledWith('Treasury claim confirmed.')
  expect(loadTreasury).toHaveBeenCalledExactlyOnceWith({ fresh: true })
})

it('recognizes a referral claim across decimal string digit boundaries', async () => {
  const setReferralConfirmation = vi.fn(), loadReferralAccount = vi.fn(async () => true)
  const actions = useReferralActions({ referralClaimable: true, referralBusy: false, referralRewardClaimReady: true,
    selectedAddress: 'wallet', selectedAuthority: 'authority', liveDuskDomainsApp: {}, runtimeConfig: { contracts: {} },
    referralAccountState: { claimableLux: '10000000000000001' },
    indexerClient: { getReferralState: async () => ({ claimableLux: '9999999999999999' }) },
    setReferralConfirmation, setReferralError: vi.fn(), setReferralTxState: vi.fn(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    submitNameWrite: async () => ({ status: 'executed' }), loadReferralAccount,
  } as never)
  await actions.handleClaimReferralRewards()
  expect(setReferralConfirmation).toHaveBeenLastCalledWith('Referral rewards claimed.')
  expect(loadReferralAccount).toHaveBeenCalledExactlyOnceWith({ fresh: true })
})
