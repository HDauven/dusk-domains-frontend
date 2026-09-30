import type { ComponentProps } from 'react'
import type { SearchWorkspace } from './SearchWorkspace'
import { formatActivityTime } from '../domains/domainFormat'

type SearchWorkspaceProps = ComponentProps<typeof SearchWorkspace>
type SearchResultView = SearchWorkspaceProps['resultView']

type UseSearchWorkspaceFeatureProps = {
  activityEntries: SearchWorkspaceProps['activityProps']['activityEntries']
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
  activityEntries,
  activityLoading,
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
  const searchProps: SearchWorkspaceProps = {
    activityProps: {
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
    // A registration that just completed is registered even before the indexer says so.
    headerProps: {
      displayName,
      lifecycleLabel,
      primaryVerified: primaryProps.primaryVerification.verified,
      records: resultStatus === 'registered' ? parentResolverRecords : [],
      reserved: Boolean(savedReservation) && !registrationProps.wizard.registrationComplete,
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
