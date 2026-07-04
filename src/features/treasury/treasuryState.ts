import type { IndexedTreasuryState } from '../../names/internal'

export function emptyTreasuryUiState(): IndexedTreasuryState {
  return {
    initialized: false,
    operator: null,
    operatorAuthority: null,
    operatorRecipient: null,
    allowedFeeSources: [],
    totalReceivedLux: 0,
    availableLux: 0,
    registrationReceivedLux: 0,
    renewalReceivedLux: 0,
    otherReceivedLux: 0,
    referralClaimableLux: 0,
    referralClaimedLux: 0,
    referralCount: 0,
    lastFeeSourceContract: null,
    lastFeeReason: null,
    lastFeeNode: null,
    lastEventType: null,
    txId: null,
    blockHeight: null,
    claims: [],
  }
}
