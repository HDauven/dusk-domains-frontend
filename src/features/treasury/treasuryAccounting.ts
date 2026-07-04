import type { IndexedTreasuryState } from '../../names/internal'

export function operatorClaimedLux(treasuryState: IndexedTreasuryState) {
  return treasuryState.claims.reduce((total, claim) => total + claim.amountLux, 0)
}

export function referralAllocatedLux(treasuryState: IndexedTreasuryState) {
  return treasuryState.referralClaimableLux + treasuryState.referralClaimedLux
}
