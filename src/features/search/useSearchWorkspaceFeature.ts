import { ownerAddressCandidates } from '../identity/ownerLabel'
import type { ComponentProps } from 'react'
import type { SearchWorkspace } from './SearchWorkspace'
import { formatActivityTime } from '../domains/domainFormat'

type SearchWorkspaceProps = ComponentProps<typeof SearchWorkspace>
type SearchResultView = SearchWorkspaceProps['resultView']

type UseSearchWorkspaceFeatureProps = {
  referralAddress?: string
  priceTiers?: SearchWorkspaceProps['priceTiers']
  activityEntries: SearchWorkspaceProps['activityProps']['activityEntries']
  hasMoreActivity?: boolean
  onLoadMoreActivity?: () => void
  activityLoading: boolean
  canRegister: boolean
  checked: SearchWorkspaceProps['checked']
  currentBlockHeight: number | null
  displayName: string
  duration: number
  lifecycleLabel: string | null
  expiryDate: string
  feeConfigLoading: boolean
  nodeHex: string
  onCheckAvailability: SearchWorkspaceProps['onCheckAvailability']
  onDurationChange: (duration: number) => void
  onOpenPendingReservation: SearchWorkspaceProps['overviewProps']['onOpenPendingReservation']
  onOpenPendingReservations: SearchWorkspaceProps['overviewProps']['onOpenPendingReservations']
  onQueryChange: SearchWorkspaceProps['onQueryChange']
  onResultViewChange: (view: SearchResultView) => void
  onStartRegistration: () => void
  parentResolverRecords: SearchWorkspaceProps['detailsProps']['parentResolverRecords']
  paysPreviousOwner: string | null
  primaryProps: SearchWorkspaceProps['primaryProps']
  primaryVerification: SearchWorkspaceProps['detailsProps']['primaryVerification']
  query: string
  recentWarnings: SearchWorkspaceProps['activityProps']['recentWarnings']
  recordsProps: SearchWorkspaceProps['recordsProps']
  registrationFee: number
  registrationProps: SearchWorkspaceProps['registrationProps']
  resultReady: boolean
  resultStatus: SearchWorkspaceProps['headerProps']['status']
  resultIssues: SearchWorkspaceProps['overviewProps']['resultIssues']
  resultView: SearchWorkspaceProps['resultView']
  savedReservation: SearchWorkspaceProps['overviewProps']['savedReservation']
  savedReservationWindow: SearchWorkspaceProps['overviewProps']['savedReservationWindow']
  settingsProps: SearchWorkspaceProps['settingsProps']
  subdomainsProps: SearchWorkspaceProps['subdomainsProps']
  subnames: SearchWorkspaceProps['detailsProps']['subnames']
  viewerAuthority: string
}

export function useSearchWorkspaceFeature({
  referralAddress,
  priceTiers,
  activityEntries,
  activityLoading,
  hasMoreActivity,
  onLoadMoreActivity,
  canRegister,
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
  const searchProps: SearchWorkspaceProps = {
    priceTiers,
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
    checked,
    detailsProps: {
      activityEntries,
      currentBlockHeight,
      displayName,
      formatActivityTime,
      onActivity: () => onResultViewChange('activity'),
      onManageRecords: () => onResultViewChange('records'),
      onSubdomains: () => onResultViewChange('subnames'),
      parentResolverRecords,
      paysPreviousOwner,
      primaryVerification,
      subnames,
      viewerAuthority,
    },
    headerProps: {
      ownerAddresses,
      viewerAuthority,
      displayName,
      lifecycleLabel,
      primaryVerified: primaryProps.primaryVerification.verified,
      owner: nodeHex && settingsProps.managedName.node === nodeHex ? settingsProps.managedName.owner : null,
      records: resultStatus === 'registered' ? parentResolverRecords : [],
      reserved: resultStatus !== 'registered' && Boolean(savedReservation && savedReservation.committedBlockHeight !== null) && !registrationProps.wizard.registrationComplete,
      status: registrationProps.wizard.registrationComplete ? 'registered' : resultStatus,
    },
    loading: activityLoading,
    nodeHex,
    onCheckAvailability,
    onQueryChange,
    onResultViewChange,
    overviewProps: {
      canRegister,
      displayName,
      duration,
      expiryDate,
      feeConfigLoading,
      onContinueRegistration: onStartRegistration,
      onDurationChange,
      onOpenPendingReservation,
      onOpenPendingReservations,
      onSuggestion: onQueryChange,
      onViewDetails: () => onResultViewChange('details'),
      registrationFee,
      resultIssues,
      resultStatus,
      savedReservation,
      savedReservationWindow,
    },
    primaryProps,
    query,
    recordsProps,
    referralAddress,
    registrationProps,
    resultReady,
    resultView,
    settingsProps,
    subdomainsProps,
  }

  return {
    searchProps,
  }
}
