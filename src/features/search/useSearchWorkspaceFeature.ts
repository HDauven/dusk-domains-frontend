import { boundWebsiteVerification } from '../../names/http/verification'
import { ownerAddressCandidates } from '../identity/ownerLabel'
import type { ComponentProps } from 'react'
import type { SearchWorkspace } from './SearchWorkspace'
import { formatActivityTime } from '../domains/domainFormat'
import { canOfferOn } from './namePageAccess'

type SearchWorkspaceProps = ComponentProps<typeof SearchWorkspace>
type SearchResultView = SearchWorkspaceProps['result']['resultView']

type UseSearchWorkspaceFeatureProps = {
  /** The market holds this name while it is listed. */
  heldByMarket?: boolean
  listing?: SearchWorkspaceProps['result']['headerProps']['listing']
  abuseUrl?: string | null
  referralAddress?: string
  premiumResult?: SearchWorkspaceProps['result']['overviewProps']['quote']['premiumResult']
  /** Apps that support .dusk names, from the deployment's configuration. */
  nameSupport?: SearchWorkspaceProps['result']['detailsProps']['nameSupport']
  priceTiers?: SearchWorkspaceProps['search']['priceTiers']
  pricingRules?: SearchWorkspaceProps['search']['pricingRules']
  activityEntries: SearchWorkspaceProps['result']['activityProps']['activityEntries']
  /** Block explorer origin for transaction links. */
  explorerUrl?: string | null
  /** Reads the name's whole history for the CSV download. */
  loadFullActivity?: () => Promise<SearchWorkspaceProps['result']['activityProps']['activityEntries']>
  /** The activity of its subnames that explains subname changes on this name. */
  subnameActivity?: SearchWorkspaceProps['result']['activityProps']['subnameActivity']
  /** Reads that activity for a whole history, for the CSV download. */
  loadSubnameActivity?: SearchWorkspaceProps['result']['activityProps']['loadSubnameActivity']
  marketplaceContractId?: string | null
  nowSeconds?: number
  hasMoreActivity?: boolean
  onLoadMoreActivity?: () => void
  activityLoading: boolean
  /** Why an available name can't be claimed now; empty for the default copy. */
  blockedReason?: string
  /** Registrations are paused, as the banner says. */
  registrationsPaused?: boolean
  /** The live quote is still being read. */
  quoteLoading?: boolean
  canRegister: boolean
  /** The market takes offers on this network. */
  marketplaceOffers?: boolean
  checked: SearchWorkspaceProps['search']['checked']
  currentBlockHeight: number | null
  displayName: string
  duration: number
  lifecycleLabel: string | null
  lifecycleNote?: string | null
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
  heldByMarket = false,
  listing = null,
  abuseUrl,
  referralAddress,
  premiumResult,
  nameSupport,
  priceTiers,
  pricingRules,
  activityEntries,
  activityLoading,
  explorerUrl,
  loadFullActivity,
  subnameActivity,
  loadSubnameActivity,
  marketplaceContractId,
  nowSeconds,
  hasMoreActivity,
  onLoadMoreActivity,
  blockedReason = '',
  registrationsPaused = false,
  quoteLoading = false,
  canRegister,
  marketplaceOffers = false,
  checked,
  currentBlockHeight,
  displayName,
  duration,
  lifecycleLabel,
  lifecycleNote,
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
  const managedName = settingsProps.managedName
  const owner = nodeHex && managedName.node === nodeHex ? managedName.owner : null
  const holders = owner ? { owner, manager: managedName.manager } : null
  const ownerAddresses = [...new Set([...ownerAddressCandidates(parentResolverRecords, activityEntries), ...(owner ? managedName.ancestorAddresses ?? [] : [])])]
  const canMakeOffer = marketplaceOffers && canOfferOn({ name: displayName, status: resultStatus, owner, ownerIsContract: managedName.ownerIsContract,
    expiresAt: managedName.expiresAt, currentBlockHeight, viewer: viewerAuthority })
  const searchProps: SearchWorkspaceProps = {
    search: {
      priceTiers,
      pricingRules,
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
        nowSeconds,
        displayName,
        explorerUrl,
        formatActivityTime,
        holders,
        loadFullHistory: loadFullActivity,
        subnameActivity,
        loadSubnameActivity,
        loading: activityLoading,
        marketplaceContractId,
        recentWarnings,
        subnames,
        viewerAuthority,
      },
      detailsProps: {
        displayName,
        nameSupport,
        onManageRecords: () => onResultViewChange('records'),
        onSubdomains: () => onResultViewChange('subnames'),
        parentResolverRecords,
        paysPreviousOwner,
        primaryVerification,
        subnames,
        viewerAuthority,
        activity: {
          activityEntries,
          hasMore: hasMoreActivity,
          currentBlockHeight,
          nowSeconds,
          marketplaceContractId,
          holders,
          subnameActivity,
          addresses: ownerAddresses,
          formatActivityTime,
          onActivity: () => onResultViewChange('activity'),
        },
      },
      headerProps: {
        verification: managedName.node === nodeHex ? boundWebsiteVerification(managedName, parentResolverRecords.find(record => record.key === 'website')?.value ?? '') : undefined,
        ownerAddresses,
        viewerAuthority,
        displayName,
        lifecycleLabel,
        lifecycleNote,
        primaryVerified: primaryProps.primaryVerification.verified,
        owner,
        manager: owner ? managedName.manager : null,
        canMakeOffer,
        heldByMarket,
        listing,
        records: resultStatus === 'registered' ? parentResolverRecords : [],
        reserved: resultStatus !== 'registered' && Boolean(savedReservation && savedReservation.committedBlockHeight !== null) && !registrationProps.wizard.registrationComplete,
        status: registrationProps.wizard.registrationComplete ? 'registered' : resultStatus,
      },
      nodeHex,
      onResultViewChange,
      overviewProps: {
        listing,
        blockedReason,
        registrationsPaused,
        quoteLoading,
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
