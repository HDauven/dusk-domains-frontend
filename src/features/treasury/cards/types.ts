import type {
  CoreFeeConfig,
  DuskNameTxState,
  IndexedTreasuryState,
} from '../../../names/internal'
import type { WalletConnectionStatus } from '../../wallet/walletStatus'
import type { FeeConfigFormState } from '../feeConfig'

export type FeeConfigField = keyof FeeConfigFormState

export type TreasuryHeaderProps = {
  feeConfigLoading: boolean
  onRefresh: () => void
  treasuryLoading: boolean
  treasuryState: IndexedTreasuryState
}

export type TreasuryClaimCardProps = {
  canClaimTreasury: boolean
  canClaimTreasuryPartial: boolean
  connectedAsTreasuryOperator: boolean
  liveWritesAvailable: boolean
  onClaimTreasury: (mode: 'all' | 'partial') => void
  onOpenWalletConnection: () => void
  onTreasuryClaimAmountChange: (value: string) => void
  selectedAddress: string
  showTreasuryClaimControls: boolean
  showTreasuryClaimReview: boolean
  treasuryAvailable: boolean
  treasuryBusy: boolean
  treasuryClaimAmount: string
  treasuryClaimAmountError: string
  treasuryClaimGuidance: string
  treasuryConnectedWalletLabel: string
  treasuryRecipientMatchesOperator: boolean
  treasuryReviewAmountLux: number | null
  treasuryReviewLabel: string
  treasuryState: IndexedTreasuryState
  treasuryTxState: DuskNameTxState | null
  treasuryWalletStatus: string
  walletSetupState: WalletConnectionStatus
}

export type TreasuryAccountingCardProps = {
  treasuryState: IndexedTreasuryState
}

export type TreasuryPricingCardProps = {
  canUpdateFeeConfig: boolean
  connectedAsTreasuryOperator: boolean
  feeConfig: CoreFeeConfig
  feeConfigBusy: boolean
  feeConfigConfirmation: string
  feeConfigError: string
  feeConfigForm: FeeConfigFormState
  feeConfigFormError: string
  feeConfigLoading: boolean
  feeConfigTxState: DuskNameTxState | null
  feeConfigUpdateError: string
  onFeeConfigFieldChange: (field: FeeConfigField, value: string) => void
  onOpenWalletConnection: () => void
  onUpdateFeeConfig: () => void
  selectedAddress: string
  walletSetupState: WalletConnectionStatus
}

export type TreasuryClaimHistoryCardProps = {
  treasuryState: IndexedTreasuryState
}
