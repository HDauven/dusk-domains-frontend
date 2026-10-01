import type { DuskDomainTxState, NameResult } from '../../../names/internal'
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
  registrationComplete: boolean
  registrationStep: RegistrationStepId
}

export type RegistrationNavigationProps = {
  onBackToOverview: () => void
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
  canRestartReservation: boolean
  canRevealRegistration: boolean
  commitBusy: boolean
  commitStale: boolean
  commitTxState: DuskDomainTxState | null
  commitWindow: CommitWindow
  committed: boolean
  displayName: string
  duration: number
  expiryDate: string
  feeConfigError: string
  installUrl: string
  onOpenWalletConnection: () => void
  onPrepareCommit: () => void
  onRefreshWalletProviders: () => Promise<unknown> | void
  onRegisterName: () => void
  onRegisterSetsPrimaryChange: (checked: boolean) => void
  onRestartReservation: () => void
  onAddRecords?: () => void
  onSetAddress: () => void
  primaryChoiceLocked: boolean
  registerSetsPrimary: boolean
  registrationCompletion: RegistrationCompletionState | null
  registrationFee: number
  registrationStep: RegistrationStepId
  registrationTargetAddress: string
  registrationTargetAddressErrors: string[]
  reservationStranded: boolean
  selectedAddress: string
  txBusy: boolean
  txState: DuskDomainTxState | null
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
