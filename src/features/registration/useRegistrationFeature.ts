import type { AppViewModelInputs } from '../../app/appViewTypes'
import { openRegisteredName } from './openRegisteredName'
import { premiumConfirmationQuote } from './premiumTiming'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { duskWalletInstallUrl } from '../../app/appConstants'
import type { RegistrationFlowPanelProps } from './RegistrationFlowPanel'
import { useRegistrationActions } from './useRegistrationActions'
import { saveReservationPrimaryChoice } from './reservationPrimaryChoice'
import { registrationCommitMatchesSession } from './pendingReservationTypes'

export type UseRegistrationFeatureProps = Pick<AppViewModelInputs,
  'activityFeed' | 'appRuntime' | 'derivedState' | 'domainRecordState' | 'domainState' | 'economicsRuntime' | 'mainViewRuntime' | 'namePreview' | 'registrationRuntime' | 'registrationState' | 'searchRuntime' | 'searchState' | 'walletRuntime'
>

export function useRegistrationFeature({ activityFeed, appRuntime, derivedState, domainRecordState, domainState, economicsRuntime, mainViewRuntime, namePreview, registrationRuntime, registrationState, searchRuntime, searchState, walletRuntime }: UseRegistrationFeatureProps) {
  const reservationToResume = registrationState.registrationStep === 'purchase'
    && !registrationState.committed && !registrationState.preparedCommit
    && walletRuntime.walletSetupState === 'connected'
    && registrationCommitMatchesSession(derivedState.savedReservation, walletRuntime.selectedAuthority, walletRuntime.selectedAddress, appRuntime.runtimeConfig.chainId)
    ? derivedState.savedReservation : null
  const resumeReservation = useEffectEvent(registrationState.searchActions.resume)
  useEffect(() => {
    if (reservationToResume) resumeReservation(reservationToResume)
  }, [reservationToResume])

  const onBackToOverview = () => searchState.setResultView('overview')
  const { handlePrepareCommit, handleRegisterName, handleRestartReservation } = useRegistrationActions({
    appliedReferral: economicsRuntime.appliedReferral,
    appendActivity: activityFeed.appendActivity,
    canPrepareCommit: derivedState.canPrepareCommit,
    canRegister: namePreview.canRegister,
    canRestartReservation: derivedState.canRestartReservation,
    committed: registrationState.committed,
    commitWindow: derivedState.commitWindow,
    displayName: namePreview.displayName,
    duration: registrationState.duration,
    duskDomainsOnChainClient: appRuntime.duskDomainsOnChainClient,
    feeConfig: economicsRuntime.feeConfig,
    getCurrentBlockHeight: appRuntime.getCurrentBlockHeight,
    indexerClient: appRuntime.indexerClient,
    lifecycleBaseBlockHeight: namePreview.lifecycleBaseBlockHeight,
    liveDuskDomainsApp: appRuntime.liveDuskDomainsApp,
    loadPendingReservations: registrationRuntime.loadPendingReservations,
    nodeHex: namePreview.nodeHex,
    preparedCommit: registrationState.preparedCommit,
    recordSourceContractId: appRuntime.recordSourceContractId,
    refreshCommitBlockState: registrationRuntime.refreshCommitBlockState,
    registerSetsPrimary: registrationState.registerSetsPrimary,
    registrationTargetAddress: registrationRuntime.registrationTargetAddress,
    registrationTargetAddressErrors: registrationRuntime.registrationTargetAddressErrors,
    registrationTargetReady: registrationRuntime.registrationTargetReady,
    result: namePreview.result,
    runtimeConfig: appRuntime.runtimeConfig,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setCommitTxState: registrationState.setCommitTxState,
    setCommitted: registrationState.setCommitted,
    setCurrentBlockHeight: searchState.setCurrentBlockHeight,
    setIndexerConfirmation: searchState.setIndexerConfirmation,
    setIndexerError: searchState.setIndexerError,
    setManagedName: domainState.setManagedName,
    setNowSeconds: searchState.setNowSeconds,
    setPreparedCommit: registrationState.setPreparedCommit,
    setPrimaryEndpointValue: domainState.setPrimaryEndpointValue,
    setConnectedPrimaryName: domainState.setConnectedPrimaryName,
    setPrimaryName: domainState.setPrimaryName,
    setRegistrationCompletion: registrationState.setRegistrationCompletion,
    setRegistrationStep: registrationState.setRegistrationStep,
    setResolverRecordSets: domainRecordState.setResolverRecordSets,
    setStrandedCommitment: registrationState.setStrandedCommitment,
    setTxState: registrationState.setTxState,
    setWalletError: walletRuntime.setWalletError,
    shouldApplyPreviewWriteFallback: searchRuntime.shouldApplyPreviewWriteFallback,
    submitNameWrite: walletRuntime.submitNameWrite,
    ensureContractAuthorityForLiveWrite: walletRuntime.ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite: walletRuntime.ensurePublicBalanceForLiveWrite,
  })
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
  const registrationComplete = registrationState.registrationCompletion?.status === 'executed'

  const step: RegistrationFlowPanelProps['step'] = {
    registrationStep: registrationState.registrationStep,
    quote: {
      premiumResult: namePreview.result,
      currentBlockHeight: namePreview.lifecycleBaseBlockHeight,
      premiumConfirmation: premiumConfirmationQuote(namePreview.result, registrationState.duration, economicsRuntime.feeConfig, namePreview.lifecycleBaseBlockHeight),
      onWaitForPremium: onBackToOverview,
      canRegister: namePreview.canRegister,
      displayName: namePreview.displayName,
      duration: registrationState.duration,
      expiryDate: namePreview.expiryDate,
      feeConfigError: economicsRuntime.feeConfigError,
      registrationFee: namePreview.registrationFee,
      registrationTargetAddress: registrationRuntime.registrationTargetAddress,
      registrationTargetAddressErrors: registrationRuntime.registrationTargetAddressErrors,
    },
    referral: {
      activeReferral: economicsRuntime.activeReferral,
      appliedReferral: economicsRuntime.appliedReferral,
    },
    reservation: {
      canPrepareCommit: derivedState.canPrepareCommit,
      canRestartReservation: derivedState.canRestartReservation,
      commitBusy: derivedState.commitBusy,
      commitStale: derivedState.commitStale,
      commitTxState: registrationState.commitTxState,
      commitWindow: derivedState.commitWindow,
      committed: registrationState.committed,
      onPrepareCommit: () => void withPrimaryChoiceLocked(handlePrepareCommit),
      onRestartReservation: () => void withPrimaryChoiceLocked(handleRestartReservation),
      reservationStranded: derivedState.reservationStranded,
    },
    purchase: {
      canRevealRegistration: derivedState.canRevealRegistration,
      onRegisterName: confirmedTotalLux => void withPrimaryChoiceLocked(() => handleRegisterName(confirmedTotalLux)),
      onAddRecords: () => void openRegisteredName(appRuntime.indexerClient, namePreview.displayName, async name => { await searchRuntime.openIndexedName(name); searchState.setResultView('records') }),
      onSetAddress: () => void openRegisteredName(appRuntime.indexerClient, namePreview.displayName, searchRuntime.openIndexedName),
      registrationCompletion: registrationState.registrationCompletion,
      txBusy: derivedState.txBusy,
      txState: registrationState.txState,
    },
    wallet: {
      installUrl: duskWalletInstallUrl,
      onOpenWalletConnection: () => void walletRuntime.handleOpenWalletConnection(),
      onRefreshWalletProviders: () => walletRuntime.handleRefreshWalletProviders(),
      selectedAddress: walletRuntime.selectedAddress,
      walletDiscoveryRefreshing: walletRuntime.walletDiscoveryRefreshing,
      walletSetupState: walletRuntime.walletSetupState,
    },
    primaryChoice: {
      primaryChoiceLocked: primaryChoiceLocked || derivedState.commitBusy || derivedState.txBusy,
      onRegisterSetsPrimaryChange: value => {
        if (primaryChoicePending.current || derivedState.commitBusy || derivedState.txBusy) return
        registrationState.setRegisterSetsPrimary(value)
        if (registrationState.preparedCommit) saveReservationPrimaryChoice({ chainId: appRuntime.runtimeConfig.chainId, commitment: registrationState.preparedCommit.commitment }, value)
      },
      registerSetsPrimary: registrationState.registerSetsPrimary,
    },
  }

  const registrationProps: RegistrationFlowPanelProps = {
    navigation: {
      onBackToOverview,
    },
    resultIssues: namePreview.result.issues,
    status: {
      onViewPendingReservation: () => void mainViewRuntime.handleMainViewChange('my-names'),
      showReservationRecovery: !registrationComplete && !derivedState.reservationStranded
        && (registrationState.registrationStep === 'purchase' || registrationState.committed),
      walletError: walletRuntime.walletError,
    },
    step,
    wizard: {
      displayName: namePreview.displayName,
      registrationComplete,
      registrationStep: registrationState.registrationStep,
    },
  }

  return { registrationProps }
}
