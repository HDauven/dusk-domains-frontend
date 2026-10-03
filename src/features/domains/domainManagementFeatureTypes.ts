import type { AppViewModelInputs } from '../../app/appViewTypes'
import type { SearchResultPanelProps } from '../search/SearchResultPanel'

export type UseDomainManagementFeatureProps = Pick<AppViewModelInputs,
  'activityFeed' | 'appRuntime' | 'derivedState' | 'domainRecordState' | 'domainState' | 'economicsRuntime' | 'namePreview' | 'searchRuntime' | 'searchState' | 'walletRuntime'
>

export type DomainManagementFeatureProps = SearchResultPanelProps['management']
