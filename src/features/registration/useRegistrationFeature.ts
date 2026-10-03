import { premiumConfirmationQuote } from './premiumTiming'
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { duskWalletInstallUrl } from '../../app/appConstants'
import type { DuskDomainTxState, NameResult } from '../../names/internal'
import type { ReferralState } from '../referrals/referralState'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { RegistrationFlowPanelProps } from './RegistrationFlowPanel'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import type { RegistrationCompletionState } from './registrationCompletionState'
import type { RegistrationStepId } from './registrationSteps'
import { useRegistrationActions } from './useRegistrationActions'
import { saveReservationPrimaryChoice } from './reservationPrimaryChoice'

export type UseRegistrationFeatureProps = UseRegistrationActionsProps & {
  activeReferral: ReferralState | null
  canRevealRegistration: boolean
  commitBusy: boolean
  commitStale: boolean
  commitTxState: DuskDomainTxState | null
  expiryDate: string
  feeConfigError: string
  onBackToOverview: () => void
  onOpenWalletConnection: () => void
  onRefreshWalletProviders: () => Promise<unknown> | void
  onAddRecords?: () => void
  onSetAddress: () => void
  onViewPendingReservation: () => void
  registrationCompletion: RegistrationCompletionState | null
  registrationFee: number
  registrationStep: RegistrationStepId
  reservationStranded: boolean
  resultIssues: NameResult['issues']
  setRegisterSetsPrimary: Dispatch<SetStateAction<boolean>>
  showReservationRecovery: boolean
  txBusy: boolean
  txState: DuskDomainTxState | null
  walletDiscoveryRefreshing: boolean
  walletError: string
  walletSetupState: WalletConnectionStatus
}

export function useRegistrationFeature(props: UseRegistrationFeatureProps) {
  const { handlePrepareCommit, handleRegisterName, handleRestartReservation } = useRegistrationActions(props)
  const primaryChoicePending = useRef(false)
  const [primaryChoiceLocked, setPrimaryChoiceLocked] = useState(false)
  async function withPrimaryChoiceLocked(action: () => Promise<void>) {
    if (primaryChoicePending.current) return
    primaryChoicePending.current = true
    setPrimaryChoiceLocked(true)
    try { await action() } finally {
      primaryChoicePending.current = false
      setPrimaryChoiceLocked(false)
    }
  }
  const registrationComplete = props.registrationCompletion?.status === 'executed'

  const step: RegistrationFlowPanelProps['step'] = {
    premiumResult: props.result,
    currentBlockHeight: props.lifecycleBaseBlockHeight,
    premiumConfirmation: premiumConfirmationQuote(props.result, props.duration, props.feeConfig, props.lifecycleBaseBlockHeight),
    onWaitForPremium: props.onBackToOverview,
    activeReferral: props.activeReferral,
    appliedReferral: props.appliedReferral,
    canPrepareCommit: props.canPrepareCommit,
    canRegister: props.canRegister,
    canRestartReservation: props.canRestartReservation,
    canRevealRegistration: props.canRevealRegistration,
    commitBusy: props.commitBusy,
    commitStale: props.commitStale,
    commitTxState: props.commitTxState,
    commitWindow: props.commitWindow,
    committed: props.committed,
    displayName: props.displayName,
    duration: props.duration,
    expiryDate: props.expiryDate,
    feeConfigError: props.feeConfigError,
    installUrl: duskWalletInstallUrl,
    onOpenWalletConnection: props.onOpenWalletConnection,
    onPrepareCommit: () => void withPrimaryChoiceLocked(handlePrepareCommit),
    onRefreshWalletProviders: props.onRefreshWalletProviders,
    onRegisterName: confirmedTotalLux => void withPrimaryChoiceLocked(() => handleRegisterName(confirmedTotalLux)),
    onRestartReservation: () => void withPrimaryChoiceLocked(handleRestartReservation),
    primaryChoiceLocked: primaryChoiceLocked || props.commitBusy || props.txBusy,
    onRegisterSetsPrimaryChange: value => {
      if (primaryChoicePending.current || props.commitBusy || props.txBusy) return
      props.setRegisterSetsPrimary(value)
      if (props.preparedCommit) saveReservationPrimaryChoice({ chainId: props.runtimeConfig.chainId, commitment: props.preparedCommit.commitment }, value)
    },
    onAddRecords: props.onAddRecords,
    onSetAddress: props.onSetAddress,
    registerSetsPrimary: props.registerSetsPrimary,
    registrationCompletion: props.registrationCompletion,
    registrationFee: props.registrationFee,
    registrationStep: props.registrationStep,
    registrationTargetAddress: props.registrationTargetAddress,
    registrationTargetAddressErrors: props.registrationTargetAddressErrors,
    reservationStranded: props.reservationStranded,
    selectedAddress: props.selectedAddress,
    txBusy: props.txBusy,
    txState: props.txState,
    walletDiscoveryRefreshing: props.walletDiscoveryRefreshing,
    walletSetupState: props.walletSetupState,
  }

  const registrationProps: RegistrationFlowPanelProps = {
    navigation: {
      onBackToOverview: props.onBackToOverview,
    },
    resultIssues: props.resultIssues,
    status: {
      onViewPendingReservation: props.onViewPendingReservation,
      showReservationRecovery: !registrationComplete && props.showReservationRecovery,
      walletError: props.walletError,
    },
    step,
    wizard: {
      displayName: props.displayName,
      registrationComplete,
      registrationStep: props.registrationStep,
    },
  }

  return { registrationProps }
}
