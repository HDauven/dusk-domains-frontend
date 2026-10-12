import type { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import type { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import { useSearchWorkspaceFeature } from '../features/search/useSearchWorkspaceFeature'
import { lifecycleBadgeCopy, lifecycleNote } from '../features/domains/domainFormat'
import { clampDurationYears } from './appConstants'
import type { AppViewModelInputs } from './appViewTypes'
import { isMarketplaceEscrow } from './managedNameState'
import { useNameListing } from '../features/marketplace/useNameListing'
import { nameListingOffer } from '../features/marketplace/nameListing'
import { loadSubnameActivity, useSubnameActivity } from '../features/activity/subnameActivity'
import { priceTiers, pricingRules } from '../features/search/pricingRules'

type UseAppSearchPropsArgs =
  & AppViewModelInputs
  & { management: ReturnType<typeof useDomainManagementFeature> }
  & ReturnType<typeof useRegistrationFeature>

function paysPreviousOwner({ owner, records, selectedAddress, selectedAuthority }: {
  owner: string
  records: { key: string, value: string }[]
  selectedAddress: string
  selectedAuthority: string
}) {
  const address = records.find((record) => record.key === 'moonlight_address')?.value ?? ''
  const owns = Boolean(selectedAuthority) && owner.toLowerCase() === selectedAuthority.toLowerCase()
  return owns && address && selectedAddress && address !== selectedAddress ? address : null
}

export function useAppSearchProps({ activityFeed, appRuntime, derivedState, domainRecordState, domainState, economicsRuntime, mainViewRuntime, namePreview, registrationProps, registrationState, searchRuntime, searchState, walletRuntime, management }: UseAppSearchPropsArgs) {
  const {
    primaryProps,
    recordsProps,
    settingsProps,
    subdomainsProps,
  } = management
  const {
    checked,
    query,
    resultView,
    setResultView,
  } = searchState
  const {
    duration,
    setDuration,
    setRegistrationStep,
  } = registrationState
  const { managedName, subnames } = domainState
  const {
    canRegister,
    displayName,
    expiryDate,
    nodeHex,
    registrationFee,
    result,
  } = namePreview
  const {
    activityEntries,
    activityLoading,
    recentWarnings,
  } = activityFeed
  const {
    parentResolverRecords,
  } = domainRecordState
  const {
    primaryVerification,
    savedReservation,
    savedReservationWindow,
  } = derivedState
  const {
    handleCheckAvailability,
    openPendingReservation,
    resetSearch,
  } = searchRuntime
  const {
    handleMainViewChange,
  } = mainViewRuntime

  // A listed name's price and market link. The market holds a listed name as its owner.
  const configuredMarket = appRuntime.runtimeConfig.contracts?.marketplace?.contractId ?? null
  const heldByMarket = result.status === 'registered' && managedName.node === nodeHex
    && Boolean(managedName.inMarketplaceEscrow ?? isMarketplaceEscrow(managedName, configuredMarket))
  const listing = useNameListing({ indexerClient: appRuntime.indexerClient, node: heldByMarket ? nodeHex : '', escrowed: heldByMarket })
  // What a subname change on this name was, and who made it, is only in the subname's own activity.
  const subnameActivity = useSubnameActivity(appRuntime.indexerClient, nodeHex, activityEntries, subnames)
  const indexerClient = appRuntime.indexerClient

  return useSearchWorkspaceFeature({
    heldByMarket,
    listing: nameListingOffer(listing, searchState.currentBlockHeight, walletRuntime.selectedAuthority),
    abuseUrl: appRuntime.runtimeConfig.launchLinks.abuse,
    referralAddress: appRuntime.runtimeConfig.capabilities.referralAttribution && walletRuntime.walletSetupState === 'connected'
      ? walletRuntime.selectedAddress : '',
    premiumResult: result,
    nameSupport: appRuntime.runtimeConfig.nameSupport,
    priceTiers: economicsRuntime.feeConfigLoaded ? priceTiers(economicsRuntime.feeConfig) : undefined,
    pricingRules: economicsRuntime.feeConfigLoaded ? pricingRules(economicsRuntime.feeConfig) : undefined,
    hasMoreActivity: activityFeed.hasMoreActivity,
    onLoadMoreActivity: () => void activityFeed.loadMoreActivity(),
    loadFullActivity: activityFeed.loadAllActivity,
    subnameActivity,
    loadSubnameActivity: indexerClient ? entries => loadSubnameActivity(indexerClient, entries, subnames, { full: true }) : undefined,
    explorerUrl: appRuntime.runtimeConfig.explorerUrl,
    marketplaceContractId: appRuntime.marketplaceContractId ?? appRuntime.runtimeConfig.contracts?.marketplace?.contractId ?? null,
    nowSeconds: searchState.nowSeconds,
    activityEntries,
    activityLoading,
    // After a policy replacement: the live quote's reason, or prices the indexer withholds. A pause
    // is explained by the claim card itself.
    blockedReason: namePreview.registrationBlockedReason
      || (economicsRuntime.registrationPricesUnavailable ? 'Registration prices are unavailable right now. Try again later.' : ''),
    canRegister,
    marketplaceOffers: Boolean(appRuntime.runtimeConfig.capabilities.marketplace && appRuntime.runtimeConfig.contracts.marketplace),
    checked,
    // Withheld registration prices are not a failed read of this name; the claim card says so.
    readError: searchState.indexerError || (economicsRuntime.registrationPricesUnavailable ? '' : economicsRuntime.feeConfigError),
    onRetry: () => { void searchRuntime.refreshCurrentNameFromIndexer(); void economicsRuntime.loadFeeConfig() },
    currentBlockHeight: searchState.currentBlockHeight,
    displayName,
    duration,
    lifecycleLabel: result.status === 'registered' && managedName.node === nodeHex
      ? lifecycleBadgeCopy(displayName, managedName.expiresAt, searchState.currentBlockHeight, searchState.nowSeconds, managedName.graceEndsAt)
      : null,
    lifecycleNote: result.status === 'registered' && managedName.node === nodeHex
      ? lifecycleNote(displayName, managedName.expiresAt, searchState.currentBlockHeight, searchState.nowSeconds)
      : null,
    expiryDate,
    feeConfigLoading: !economicsRuntime.feeConfigLoaded || economicsRuntime.feeConfigLoading,
    nodeHex,
    onCheckAvailability: () => void handleCheckAvailability(),
    onDurationChange: (years) => setDuration(clampDurationYears(years)),
    onOpenPendingReservation: (reservation, options) => void openPendingReservation(reservation, options),
    onOpenPendingReservations: () => void handleMainViewChange('my-names'),
    onQueryChange: resetSearch,
    onResultViewChange: setResultView,
    // The claim card already chose the term, so registration opens at Reserve.
    onStartRegistration: () => {
      setRegistrationStep('review')
      setResultView('register')
    },
    parentResolverRecords,
    paysPreviousOwner: paysPreviousOwner({
      owner: managedName.owner,
      records: parentResolverRecords,
      selectedAddress: walletRuntime.selectedAddress,
      selectedAuthority: walletRuntime.selectedAuthority,
    }),
    primaryProps,
    primaryVerification,
    query,
    recentWarnings,
    recordsProps,
    registrationFee,
    registrationProps,
    resultReady: !appRuntime.indexerClient || searchState.apiSearchResult !== null,
    resultIssues: result.issues,
    resultStatus: result.status,
    resultView,
    savedReservation,
    savedReservationWindow,
    settingsProps,
    subdomainsProps,
    subnames,
    viewerAuthority: walletRuntime.selectedAuthority,
  })
}
