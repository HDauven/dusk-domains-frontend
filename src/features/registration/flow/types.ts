import type { PremiumConfirmationQuote } from '../premiumTiming'
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
  registrationStep: RegistrationStepId
  quote: {
    premiumResult?: NameResult
    currentBlockHeight?: number | null
    premiumConfirmation?: PremiumConfirmationQuote | null
    onWaitForPremium?: () => void
    canRegister: boolean
    displayName: string
    duration: number
    expiryDate: string
    feeConfigError: string
    registrationFee: number
    registrationTargetAddress: string
    registrationTargetAddressErrors: string[]
  }
  referral: {
    activeReferral: ReferralState | null
    appliedReferral: ReferralState | null
  }
  reservation: {
    canPrepareCommit: boolean
    canRestartReservation: boolean
    commitBusy: boolean
    commitStale: boolean
    commitTxState: DuskDomainTxState | null
    commitWindow: CommitWindow
    committed: boolean
    onPrepareCommit: () => void
    onRestartReservation: () => void
    reservationStranded: boolean
  }
  purchase: {
    canRevealRegistration: boolean
    onRegisterName: (confirmedTotalLux?: number) => void
    onAddRecords?: () => void
    onSetAddress: () => void
    registrationCompletion: RegistrationCompletionState | null
    txBusy: boolean
    txState: DuskDomainTxState | null
  }
  wallet: {
    installUrl: string
    onOpenWalletConnection: () => void
    onRefreshWalletProviders: () => Promise<unknown> | void
    selectedAddress: string
    walletDiscoveryRefreshing: boolean
    walletSetupState: WalletConnectionStatus
  }
  primaryChoice: {
    onRegisterSetsPrimaryChange: (checked: boolean) => void
    primaryChoiceLocked: boolean
    registerSetsPrimary: boolean
  }
}

export type RegistrationFlowPanelProps = {
  navigation: RegistrationNavigationProps
  resultIssues: NameResult['issues']
  status: RegistrationStatusProps
  step: RegistrationStepPanelProps
  wizard: RegistrationWizardProps
}
