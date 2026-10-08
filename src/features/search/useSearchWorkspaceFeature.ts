import { ownerAddressCandidates } from '../identity/ownerLabel'
import type { ComponentProps } from 'react'
import type { SearchWorkspace } from './SearchWorkspace'
import { formatActivityTime } from '../domains/domainFormat'
import { canOfferOn } from './namePageAccess'

type SearchWorkspaceProps = ComponentProps<typeof SearchWorkspace>
type SearchResultView = SearchWorkspaceProps['result']['resultView']

type UseSearchWorkspaceFeatureProps = {
  abuseUrl?: string | null
  verification?: SearchWorkspaceProps['result']['headerProps']['verification']
  referralAddress?: string
  premiumResult?: SearchWorkspaceProps['result']['overviewProps']['quote']['premiumResult']
  priceTiers?: SearchWorkspaceProps['search']['priceTiers']
  activityEntries: SearchWorkspaceProps['result']['activityProps']['activityEntries']
  hasMoreActivity?: boolean
  onLoadMoreActivity?: () => void
  activityLoading: boolean
  canRegister: boolean
  /** The market takes offers on this network. */
  marketplaceOffers?: boolean
  checked: SearchWorkspaceProps['search']['checked']
  currentBlockHeight: number | null
  displayName: string
  duration: number
  lifecycleLabel: string | null
  expiryDate: string
  feeConfigLoading: boolean
  nodeHex: string
  onCheckAvailability: SearchWorkspaceProps['search']['onCheckAvailability']
  onDurationChange: (duration: number) => void
  onOpenPendingReservation: SearchWorkspaceProps['result']['overviewProps']['reservation']['onOpenPendingReservation']
  onOpenPendingReservations: SearchWorkspaceProps['result']['overviewProps']['reservation']['onOpenPendingReservations']
  onQueryChange: SearchWorkspaceProps['search']['onQueryChange']
  onResultViewChange: (view: SearchResultView) => void
  onStartRegistration: () => void
  parentResolverRecords: SearchWorkspaceProps['result']['detailsProps']['parentResolverRecords']
  paysPreviousOwner: string | null
  primaryProps: SearchWorkspaceProps['result']['management']['primaryProps']
  primaryVerification: SearchWorkspaceProps['result']['detailsProps']['primaryVerification']
  query: string
  recentWarnings: SearchWorkspaceProps['result']['activityProps']['recentWarnings']
  recordsProps: SearchWorkspaceProps['result']['management']['recordsProps']
  registrationFee: number
  registrationProps: SearchWorkspaceProps['result']['registrationProps']
  readError?: string
  onRetry?: () => void
  resultReady: boolean
  resultStatus: SearchWorkspaceProps['result']['headerProps']['status']
  resultIssues: SearchWorkspaceProps['result']['overviewProps']['resultIssues']
  resultView: SearchWorkspaceProps['result']['resultView']
  savedReservation: SearchWorkspaceProps['result']['overviewProps']['reservation']['savedReservation']
  savedReservationWindow: SearchWorkspaceProps['result']['overviewProps']['reservation']['savedReservationWindow']
  settingsProps: SearchWorkspaceProps['result']['management']['settingsProps']
  subdomainsProps: SearchWorkspaceProps['result']['management']['subdomainsProps']
  subnames: SearchWorkspaceProps['result']['detailsProps']['subnames']
  viewerAuthority: string
}

export function useSearchWorkspaceFeature({
  abuseUrl,
  verification,
  referralAddress,
  premiumResult,
  priceTiers,
  activityEntries,
  activityLoading,
  hasMoreActivity,
  onLoadMoreActivity,
  canRegister,
  marketplaceOffers = false,
  checked,
  currentBlockHeight,
  displayName,
  duration,
  lifecycleLabel,
  expiryDate,
  feeConfigLoading,
  nodeHex,
  onCheckAvailability,
  onDurationChange,
  onOpenPendingReservation,
  onOpenPendingReservations,
  onQueryChange,
  onResultViewChange,
  onStartRegistration,
  parentResolverRecords,
  paysPreviousOwner,
  primaryProps,
  primaryVerification,
  query,
  recentWarnings,
  recordsProps,
  registrationFee,
  registrationProps,
  readError,
  onRetry,
  resultReady,
  resultStatus,
  resultIssues,
  resultView,
  savedReservation,
  savedReservationWindow,
  settingsProps,
  subdomainsProps,
  subnames,
  viewerAuthority,
}: UseSearchWorkspaceFeatureProps) {
  const ownerAddresses = ownerAddressCandidates(parentResolverRecords, activityEntries)
  const managedName = settingsProps.managedName
  const owner = nodeHex && managedName.node === nodeHex ? managedName.owner : null
  const canMakeOffer = marketplaceOffers && canOfferOn({ name: displayName, status: resultStatus, owner, ownerIsContract: managedName.ownerIsContract,
    expiresAt: managedName.expiresAt, currentBlockHeight, viewer: viewerAuthority })
  const searchProps: SearchWorkspaceProps = {
    search: {
      priceTiers,
      checked,
      loading: activityLoading,
      onCheckAvailability,
      onQueryChange,
      query,
      resultReady,
      readError,
      onRetry,
    },
    result: {
      abuseUrl,
      activityProps: {
        ownerAddresses,
        hasMore: hasMoreActivity,
        onLoadMore: onLoadMoreActivity,
        activityEntries,
        currentBlockHeight,
        displayName,
        formatActivityTime,
        loading: activityLoading,
        recentWarnings,
        viewerAuthority,
      },
      detailsProps: {
        displayName,
        onManageRecords: () => onResultViewChange('records'),
        onSubdomains: () => onResultViewChange('subnames'),
        parentResolverRecords,
        paysPreviousOwner,
        primaryVerification,
        subnames,
        viewerAuthority,
        activity: {
          activityEntries,
          currentBlockHeight,
          formatActivityTime,
          onActivity: () => onResultViewChange('activity'),
        },
      },
      headerProps: {
        verification,
        ownerAddresses,
        viewerAuthority,
        displayName,
        lifecycleLabel,
        primaryVerified: primaryProps.primaryVerification.verified,
        owner,
        canMakeOffer,
        records: resultStatus === 'registered' ? parentResolverRecords : [],
        reserved: resultStatus !== 'registered' && Boolean(savedReservation && savedReservation.committedBlockHeight !== null) && !registrationProps.wizard.registrationComplete,
        status: registrationProps.wizard.registrationComplete ? 'registered' : resultStatus,
      },
      nodeHex,
      onResultViewChange,
      overviewProps: {
        canRegister,
        displayName,
        onContinueRegistration: onStartRegistration,
        onSuggestion: onQueryChange,
        onViewDetails: () => onResultViewChange('details'),
        resultIssues,
        resultStatus,
        quote: {
          premiumResult,
          currentBlockHeight,
          duration,
          expiryDate,
          feeConfigLoading,
          onDurationChange,
          registrationFee,
        },
        reservation: {
          onOpenPendingReservation,
          onOpenPendingReservations,
          savedReservation,
          savedReservationWindow,
        },
      },
      referralAddress,
      registrationProps,
      resultView,
      management: {
        primaryProps,
        recordsProps,
        settingsProps,
        subdomainsProps,
      },
    },
  }

  return {
    searchProps,
  }
}
