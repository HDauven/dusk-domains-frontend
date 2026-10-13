import type { AppViewModelInputs } from '../../app/appViewTypes'
import type { SearchResultPanelProps } from '../search/SearchResultPanel'

export type UseDomainManagementFeatureProps = Pick<AppViewModelInputs,
  'activityFeed' | 'appRuntime' | 'derivedState' | 'domainRecordState' | 'domainState' | 'economicsRuntime' | 'namePreview' | 'searchRuntime' | 'searchState' | 'walletRuntime'
> & {
  /** The listing a market holds the name by, which renewing a listed name is bound to. */
  heldListing?: import('../../app/useHeldListing').HeldNameListing
}

export type DomainManagementFeatureProps = SearchResultPanelProps['management']
