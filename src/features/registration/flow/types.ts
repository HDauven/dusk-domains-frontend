import type { DuskNameTxState, NameResult } from '../../../names/internal'
import type { ReferralState } from '../../referrals/referralState'
import type { WalletConnectionStatus } from '../../wallet/walletStatus'
import type { RegistrationCompletionState } from '../registrationCompletionState'
import type { RegistrationStepId } from '../registrationSteps'

export type CommitWindow = {
  status: 'missing' | 'waiting' | 'ready' | 'stale'
  staleInBlocks: number
  waitBlocks: number
}

export type RegistrationWizardProps = {
  displayName: string
  registrationStep: RegistrationStepId
  registrationStepDescription: string
}

export type RegistrationNavigationProps = {
  canContinueRegistrationStep: boolean
  onBackToOverview: () => void
  onStepChange: (step: RegistrationStepId) => void
  registrationNextStep: RegistrationStepId | null
  registrationPreviousStep: RegistrationStepId | null
  registrationStep: RegistrationStepId
}

export type RegistrationStatusProps = {
  onViewPendingReservation: () => void
  showReservationRecovery: boolean
  walletError: string
}

export type RegistrationStepPanelProps = {
  activeReferral: ReferralState | null
  appliedReferral: ReferralState | null
  canPrepareCommit: boolean
  canRegister: boolean
  canRevealRegistration: boolean
  commitBusy: boolean
  commitStale: boolean
  commitTxState: DuskNameTxState | null
  commitWindow: CommitWindow
  committed: boolean
  displayName: string
  duration: number
  expiryDate: string
  feeConfigError: string
  feeConfigLoading: boolean
  installUrl: string
  maxDurationYears: number
  minDurationYears: number
  networkFee: number
  onAddressInputChange: (value: string) => void
  onDurationChange: (duration: number) => void
  onOpenWalletConnection: () => void
  onPrepareCommit: () => void
  onRefreshWalletProviders: () => void
  onRegisterName: () => void
  onRegisterSetsPrimaryChange: (checked: boolean) => void
  onSetAddress: () => void
  onUseWalletAddress: () => void
  registerSetsPrimary: boolean
  registrationAddressInput: string
  registrationCompletion: RegistrationCompletionState | null
  registrationFee: number
  registrationStep: RegistrationStepId
  registrationTargetAddress: string
  registrationTargetAddressErrors: string[]
  selectedAddress: string
  total: number
  txBusy: boolean
  txState: DuskNameTxState | null
  walletDiscoveryRefreshing: boolean
  walletSetupState: WalletConnectionStatus
}

export type RegistrationFlowPanelProps = {
  navigation: RegistrationNavigationProps
  resultIssues: NameResult['issues']
  status: RegistrationStatusProps
  step: RegistrationStepPanelProps
  wizard: RegistrationWizardProps
}
