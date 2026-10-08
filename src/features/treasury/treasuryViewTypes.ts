import type {
  CoreFeeConfig,
  DuskDomainTxState,
  IndexedTreasuryState,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { FeeConfigFormState } from './feeConfig'
import type { FeeConfigField } from './cards/types'

export type TreasuryViewProps = {
  treasuryLoaded?: boolean
  onRetry?: () => void
  treasuryConfirmation: string
  treasuryError: string
  treasuryLoading: boolean
  treasuryState: IndexedTreasuryState
  claim: {
    canClaimTreasury: boolean
    canClaimTreasuryPartial: boolean
    onClaimTreasury: (mode: 'all' | 'partial') => void
    onTreasuryClaimAmountChange: (value: string) => void
    showTreasuryClaimControls: boolean
    showTreasuryClaimReview: boolean
    treasuryAvailable: boolean
    treasuryBusy: boolean
    treasuryClaimAmount: string
    treasuryClaimAmountError: string
    treasuryClaimGuidance: string
    treasuryRecipientMatchesOperator: boolean
    treasuryReviewAmountLux: number | string | null
    treasuryReviewLabel: string
    treasuryTxState: DuskDomainTxState | null
  }
  pricing: {
    canUpdateFeeConfig: boolean
    feeConfig: CoreFeeConfig
    feeConfigBusy: boolean
    feeConfigConfirmation: string
    feeConfigError: string
    feeConfigForm: FeeConfigFormState
    feeConfigFormError: string
    feeConfigLoaded?: boolean
    feeConfigLoading: boolean
    feeConfigTxState: DuskDomainTxState | null
    feeConfigUpdateError: string
    onFeeConfigFieldChange: (field: FeeConfigField, value: string) => void
    onUpdateFeeConfig: () => void
  }
  wallet: {
    connectedAsTreasuryOperator: boolean
    liveWritesAvailable: boolean
    onOpenWalletConnection: () => void
    selectedAddress: string
    treasuryConnectedWalletLabel: string
    treasuryWalletStatus: string
    walletSetupState: WalletConnectionStatus
  }
}
