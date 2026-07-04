import { claimTreasury } from './claimTreasuryAction'
import type { UseTreasuryActionsProps } from './treasuryActionTypes'
import { updateFeeConfig } from './updateFeeConfigAction'

export function useTreasuryActions(props: UseTreasuryActionsProps) {
  return {
    handleClaimTreasury: (mode: 'all' | 'partial') => claimTreasury(props, mode),
    handleUpdateFeeConfig: () => updateFeeConfig(props),
  }
}
