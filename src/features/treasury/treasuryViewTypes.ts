import type {
  CoreFeeConfig,
  DuskNameTxState,
  IndexedTreasuryState,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { FeeConfigFormState } from './feeConfig'
import type { FeeConfigField } from './TreasuryCards'

export type TreasuryViewProps = {
  canClaimTreasury: boolean
  canClaimTreasuryPartial: boolean
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
  liveWritesAvailable: boolean
  onClaimTreasury: (mode: 'all' | 'partial') => void
  onFeeConfigFieldChange: (field: FeeConfigField, value: string) => void
  onOpenWalletConnection: () => void
  onRefresh: () => void
  onTreasuryClaimAmountChange: (value: string) => void
  onUpdateFeeConfig: () => void
  selectedAddress: string
  showTreasuryClaimControls: boolean
  showTreasuryClaimReview: boolean
  treasuryAvailable: boolean
  treasuryBusy: boolean
  treasuryClaimAmount: string
  treasuryClaimAmountError: string
  treasuryClaimGuidance: string
  treasuryConfirmation: string
  treasuryConnectedWalletLabel: string
  treasuryError: string
  treasuryLoading: boolean
  treasuryRecipientMatchesOperator: boolean
  treasuryReviewAmountLux: number | null
  treasuryReviewLabel: string
  treasuryState: IndexedTreasuryState
  treasuryTxState: DuskNameTxState | null
  treasuryWalletStatus: string
  walletSetupState: WalletConnectionStatus
}
