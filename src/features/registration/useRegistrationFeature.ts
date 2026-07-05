import type { Dispatch, SetStateAction } from 'react'
import {
  clampDurationYears,
  duskWalletInstallUrl,
  maxDurationYears,
  minDurationYears,
} from '../../app/appConstants'
import type { DuskNameTxState, NameResult } from '../../names/internal'
import type { ReferralState } from '../referrals/referralState'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { RegistrationFlowPanelProps } from './RegistrationFlowPanel'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import type { RegistrationCompletionState } from './registrationCompletionState'
import type { RegistrationStepId } from './registrationSteps'
import { useRegistrationActions } from './useRegistrationActions'

export type UseRegistrationFeatureProps = UseRegistrationActionsProps & {
  activeReferral: ReferralState | null
  canContinueRegistrationStep: boolean
  canRevealRegistration: boolean
  commitBusy: boolean
  commitStale: boolean
  commitTxState: DuskNameTxState | null
  expiryDate: string
  feeConfigError: string
  feeConfigLoading: boolean
  networkFee: number
  onBackToOverview: () => void
  onOpenWalletConnection: () => void
  onRefreshWalletProviders: () => Promise<unknown> | void
  onSetAddress: () => void
  onViewPendingReservation: () => void
  registrationAddressInput: string
  registrationCompletion: RegistrationCompletionState | null
  registrationFee: number
  registrationNextStep: RegistrationStepId | null
  registrationPreviousStep: RegistrationStepId | null
  registrationStep: RegistrationStepId
  registrationStepDescription: string
  resultIssues: NameResult['issues']
  setDuration: Dispatch<SetStateAction<number>>
  setRegisterSetsPrimary: Dispatch<SetStateAction<boolean>>
  setRegistrationAddressInput: Dispatch<SetStateAction<string>>
  showReservationRecovery: boolean
  total: number
  txBusy: boolean
  txState: DuskNameTxState | null
  walletDiscoveryRefreshing: boolean
  walletError: string
  walletSetupState: WalletConnectionStatus
}

export function useRegistrationFeature(props: UseRegistrationFeatureProps) {
  const { handlePrepareCommit, handleRegisterName } = useRegistrationActions(props)

  const step: RegistrationFlowPanelProps['step'] = {
    activeReferral: props.activeReferral,
    appliedReferral: props.appliedReferral,
    canPrepareCommit: props.canPrepareCommit,
    canRegister: props.canRegister,
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
    feeConfigLoading: props.feeConfigLoading,
    installUrl: duskWalletInstallUrl,
    maxDurationYears,
    minDurationYears,
    networkFee: props.networkFee,
    onAddressInputChange: (value) => {
      props.setRegistrationAddressInput(value)
      props.setWalletError('')
    },
    onDurationChange: (nextDuration) => props.setDuration(clampDurationYears(nextDuration)),
    onOpenWalletConnection: props.onOpenWalletConnection,
    onPrepareCommit: () => void handlePrepareCommit(),
    onRefreshWalletProviders: props.onRefreshWalletProviders,
    onRegisterName: () => void handleRegisterName(),
    onRegisterSetsPrimaryChange: (nextChecked) => {
      props.setRegisterSetsPrimary(nextChecked)
      if (!nextChecked && !props.registrationAddressInput.trim() && props.selectedAddress) {
        props.setRegistrationAddressInput(props.selectedAddress)
      }
    },
    onSetAddress: props.onSetAddress,
    onUseWalletAddress: () => props.setRegistrationAddressInput(props.selectedAddress),
    registerSetsPrimary: props.registerSetsPrimary,
    registrationAddressInput: props.registrationAddressInput,
    registrationCompletion: props.registrationCompletion,
    registrationFee: props.registrationFee,
    registrationStep: props.registrationStep,
    registrationTargetAddress: props.registrationTargetAddress,
    registrationTargetAddressErrors: props.registrationTargetAddressErrors,
    selectedAddress: props.selectedAddress,
    total: props.total,
    txBusy: props.txBusy,
    txState: props.txState,
    walletDiscoveryRefreshing: props.walletDiscoveryRefreshing,
    walletSetupState: props.walletSetupState,
  }

  const registrationProps: RegistrationFlowPanelProps = {
    navigation: {
      canContinueRegistrationStep: props.canContinueRegistrationStep,
      onBackToOverview: props.onBackToOverview,
      onStepChange: props.setRegistrationStep,
      registrationNextStep: props.registrationNextStep,
      registrationPreviousStep: props.registrationPreviousStep,
      registrationStep: props.registrationStep,
    },
    resultIssues: props.resultIssues,
    status: {
      onViewPendingReservation: props.onViewPendingReservation,
      showReservationRecovery: props.showReservationRecovery,
      walletError: props.walletError,
    },
    step,
    wizard: {
      displayName: props.displayName,
      registrationStep: props.registrationStep,
      registrationStepDescription: props.registrationStepDescription,
    },
  }

  return { registrationProps }
}
