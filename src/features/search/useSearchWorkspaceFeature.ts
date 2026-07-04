import type { ComponentProps } from 'react'
import type { SearchWorkspace } from './SearchWorkspace'
import { formatActivityTime } from '../domains/domainFormat'

type SearchWorkspaceProps = ComponentProps<typeof SearchWorkspace>
type SearchResultView = SearchWorkspaceProps['resultView']

type UseSearchWorkspaceFeatureProps = {
  activityEntries: SearchWorkspaceProps['activityProps']['activityEntries']
  activityLoading: boolean
  canRegister: SearchWorkspaceProps['overviewProps']['canRegister']
  checked: SearchWorkspaceProps['checked']
  displayName: string
  nodeHex: string
  onCheckAvailability: SearchWorkspaceProps['onCheckAvailability']
  onOpenPendingReservation: SearchWorkspaceProps['overviewProps']['onOpenPendingReservation']
  onOpenPendingReservations: SearchWorkspaceProps['overviewProps']['onOpenPendingReservations']
  onQueryChange: SearchWorkspaceProps['onQueryChange']
  onResultViewChange: (view: SearchResultView) => void
  onStartRegistration: () => void
  parentResolverRecords: SearchWorkspaceProps['detailsProps']['parentResolverRecords']
  primaryProps: SearchWorkspaceProps['primaryProps']
  primaryVerification: SearchWorkspaceProps['detailsProps']['primaryVerification']
  query: string
  recentWarnings: SearchWorkspaceProps['activityProps']['recentWarnings']
  recordsProps: SearchWorkspaceProps['recordsProps']
  registrationProps: SearchWorkspaceProps['registrationProps']
  resultStatus: SearchWorkspaceProps['availabilityProps']['status']
  resultIssues: SearchWorkspaceProps['overviewProps']['resultIssues']
  resultView: SearchWorkspaceProps['resultView']
  savedReservation: SearchWorkspaceProps['overviewProps']['savedReservation']
  savedReservationWindow: SearchWorkspaceProps['overviewProps']['savedReservationWindow']
  settingsProps: SearchWorkspaceProps['settingsProps']
  subdomainsProps: SearchWorkspaceProps['subdomainsProps']
  subnames: SearchWorkspaceProps['detailsProps']['subnames']
}

export function useSearchWorkspaceFeature({
  activityEntries,
  activityLoading,
  canRegister,
  checked,
  displayName,
  nodeHex,
  onCheckAvailability,
  onOpenPendingReservation,
  onOpenPendingReservations,
  onQueryChange,
  onResultViewChange,
  onStartRegistration,
  parentResolverRecords,
  primaryProps,
  primaryVerification,
  query,
  recentWarnings,
  recordsProps,
  registrationProps,
  resultStatus,
  resultIssues,
  resultView,
  savedReservation,
  savedReservationWindow,
  settingsProps,
  subdomainsProps,
  subnames,
}: UseSearchWorkspaceFeatureProps) {
  const searchProps: SearchWorkspaceProps = {
    activityProps: {
      activityEntries,
      displayName,
      formatActivityTime,
      loading: activityLoading,
      onBack: () => onResultViewChange('details'),
      recentWarnings,
    },
    availabilityProps: {
      displayName,
      reserved: Boolean(savedReservation),
      status: resultStatus,
    },
    checked,
    detailsProps: {
      displayName,
      onActivity: () => onResultViewChange('activity'),
      onBack: () => onResultViewChange('overview'),
      onManageRecords: () => onResultViewChange('records'),
      onPrimary: () => onResultViewChange('primary'),
      onSettings: () => onResultViewChange('manage'),
      onSubdomains: () => onResultViewChange('subnames'),
      parentResolverRecords,
      primaryVerification,
      recentWarnings,
      subnames,
    },
    loading: activityLoading,
    nodeHex,
    onCheckAvailability,
    onQueryChange,
    overviewProps: {
      canRegister,
      displayName,
      onContinueRegistration: onStartRegistration,
      onOpenPendingReservation,
      onOpenPendingReservations,
      onViewDetails: () => onResultViewChange('details'),
      primaryVerified: primaryProps.primaryVerification.verified,
      resultStatus,
      resultIssues,
      savedReservation,
      savedReservationWindow,
      subnameCount: subnames.length,
    },
    primaryProps,
    query,
    recordsProps,
    registrationProps,
    resultView,
    settingsProps,
    subdomainsProps,
  }

  return {
    searchProps,
  }
}
