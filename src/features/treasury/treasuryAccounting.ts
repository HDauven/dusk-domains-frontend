import type { IndexedTreasuryState } from '../../names/internal'

export function recentOperatorClaimsLux(treasuryState: IndexedTreasuryState) {
  return treasuryState.claims.reduce((total, claim) => total + BigInt(claim.amountLux), 0n)
}

export function referralAllocatedLux(treasuryState: IndexedTreasuryState) {
  return BigInt(treasuryState.referralClaimableLux) + BigInt(treasuryState.referralClaimedLux)
}
