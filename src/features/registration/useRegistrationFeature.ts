import type { AppViewModelInputs } from '../../app/appViewTypes'
import { openRegisteredName } from './openRegisteredName'
import { premiumConfirmationQuote } from './premiumTiming'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { duskWalletInstallUrl } from '../../app/appConstants'
import type { RegistrationFlowPanelProps } from './RegistrationFlowPanel'
import { useRegistrationActions } from './useRegistrationActions'
import { saveReservationPrimaryChoice } from './reservationPrimaryChoice'
import { registrationCommitMatchesSession } from './pendingReservationTypes'
import { claimSetsPrimary, isPrimaryAsk, primaryNameNote, useWalletPrimary } from './walletPrimary'
import { safeNumber } from '../../names/numbers'
import { registrableQuote } from '../../names/internal'
import { readReservationQuote, type RegistrationPriceReview } from './reservationQuote'

const REGISTER_INTENT_MS = 30_000

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
  // Default the primary name on only for a wallet that has none, and say which name it would replace.
  // Read only while a name can be claimed, so other name pages make no extra request. The default is
  // never kept as a choice: Register reads the primary name again and decides from that read.
  const { primary: walletPrimary, readFresh: readWalletPrimary } = useWalletPrimary(appRuntime.indexerClient, appRuntime.duskDomainsOnChainClient,
    walletRuntime.selectedAddress, namePreview.canRegister ? namePreview.displayName : '')
  const registerSetsPrimary = claimSetsPrimary(registrationState.registerSetsPrimary, walletPrimary, namePreview.displayName)
  // A price change found for this reservation, waiting for the new price to be confirmed: one a
  // registration attempt found, or a newer policy selection this page already quoted. Selection
  // versions only increase, so an older quote shown here never reads as a change.
  const commitment = registrationState.committed ? registrationState.preparedCommit?.commitment : undefined
  const review = registrationState.priceChange
  const reserved = commitment ? readReservationQuote({ chainId: appRuntime.runtimeConfig.chainId, commitment }) : null
  const live = namePreview.result.quotedYears === registrationState.duration ? namePreview.result.policyQuote : undefined
  const priceChange: RegistrationPriceReview | null = review && typeof review.commitment === 'string' && review.commitment === commitment ? review
    : commitment && reserved && live && reserved.years === registrationState.duration && registrableQuote(live)
      && BigInt(live.policy_version) > BigInt(reserved.policyVersion)
      ? { commitment, previousLux: safeNumber(reserved.totalLux), quote: live, sinceReservation: true, refused: false } : null
  const { handleConfirmNewPrice, handlePrepareCommit, handleRegisterName, handleRestartReservation } = useRegistrationActions({
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
    priceChange,
    primaryChoice: registrationState.registerSetsPrimary,
    readWalletPrimary,
    recordSourceContractId: appRuntime.recordSourceContractId,
    refreshQuotes: namePreview.refreshQuotes,
    refreshCommitBlockState: registrationRuntime.refreshCommitBlockState,
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
    setPriceChange: registrationState.setPriceChange,
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

  // Register on a saved reservation signs once the reopened claim can be registered. A claim
  // that needs a price decision, or that cannot be registered within a short while, waits for
  // the Register button instead.
  const premiumConfirmation = premiumConfirmationQuote(namePreview.result, registrationState.duration, economicsRuntime.feeConfig, namePreview.lifecycleBaseBlockHeight)
  const intent = registrationState.registerIntent
  const intentReady = Boolean(intent && intent.commitment === registrationState.preparedCommit?.commitment
    && registrationState.registrationStep === 'purchase' && derivedState.canRevealRegistration && !premiumConfirmation && !priceChange)
  const registerFromIntent = useEffectEvent(() => {
    const requestedAt = registrationState.registerIntent?.requestedAt ?? 0
    registrationState.setRegisterIntent(null)
    if (Date.now() - requestedAt > REGISTER_INTENT_MS) return
    void withPrimaryChoiceLocked(() => handleRegisterName())
  })
  useEffect(() => {
    if (intentReady) registerFromIntent()
  }, [intentReady])

  const newTotalLux = priceChange ? safeNumber(priceChange.quote.total_lux) : null
  // The price shown is live when the claim has a quote for its term; otherwise it is an estimate.
  const liveQuote = namePreview.result.quotedYears === registrationState.duration && namePreview.result.totalFeeLux !== undefined
  const step: RegistrationFlowPanelProps['step'] = {
    registrationStep: registrationState.registrationStep,
    quote: {
      premiumResult: namePreview.result,
      currentBlockHeight: namePreview.lifecycleBaseBlockHeight,
      premiumConfirmation,
      onWaitForPremium: onBackToOverview,
      priceChange: priceChange ? { previousLux: priceChange.previousLux, totalLux: newTotalLux!,
        sinceReservation: priceChange.sinceReservation, refused: priceChange.refused } : null,
      priceNote: priceChange ? '' : namePreview.registrationBlockedReason
        || (economicsRuntime.registrationPricesUnavailable && !liveQuote ? 'Registration prices are unavailable right now. Try again later.' : ''),
      canRegister: namePreview.canRegister,
      displayName: namePreview.displayName,
      duration: registrationState.duration,
      expiryDate: namePreview.expiryDate,
      feeConfigError: priceChange || liveQuote ? '' : namePreview.quoteError || economicsRuntime.feeConfigError,
      registrationFee: newTotalLux !== null ? newTotalLux / 1e9 : namePreview.registrationFee,
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
      onRegisterName: confirmedTotalLux => {
        if (registrationState.registerIntent) registrationState.setRegisterIntent(null)
        // The switch and the primary name its note is about, as shown when Register is pressed.
        const shown = { setsPrimary: registerSetsPrimary, primary: walletPrimary }
        void withPrimaryChoiceLocked(() => handleRegisterName(confirmedTotalLux, shown))
      },
      onConfirmNewPrice: () => {
        if (registrationState.registerIntent) registrationState.setRegisterIntent(null)
        const shown = { setsPrimary: registerSetsPrimary, primary: walletPrimary }
        void withPrimaryChoiceLocked(() => handleConfirmNewPrice(shown))
      },
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
        // Changing the switch answers the question Register asked about it.
        if (isPrimaryAsk(walletRuntime.walletError)) walletRuntime.setWalletError('')
      },
      registerSetsPrimary,
      primaryNote: primaryNameNote(walletPrimary, registerSetsPrimary, namePreview.displayName),
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
