import type { ShowcaseName } from '../../app/useSkyNames'
import { SearchHero } from './SearchHero'
import { SearchResultPanel, type SearchResultPanelProps, type SearchResultView } from './SearchResultPanel'

type SearchWorkspaceProps = SearchResultPanelProps & {
  checked: boolean
  featuredNames?: ShowcaseName[]
  loading: boolean
  resultReady: boolean
  onCheckAvailability: () => void
  onOpenName?: (name: string) => void
  onQueryChange: (value: string) => void
  query: string
}

export function SearchWorkspace({
  activityProps,
  availabilityProps,
  checked,
  detailsProps,
  featuredNames,
  loading,
  nodeHex,
  onCheckAvailability,
  onOpenName,
  onQueryChange,
  overviewProps,
  primaryProps,
  query,
  recordsProps,
  registrationProps,
  resultReady,
  resultView,
  settingsProps,
  subdomainsProps,
}: SearchWorkspaceProps) {
  return (
    <>
      <SearchHero
        checked={checked}
        featuredNames={featuredNames}
        loading={loading}
        onCheckAvailability={onCheckAvailability}
        onOpenName={onOpenName}
        onQueryChange={onQueryChange}
        query={query}
      />

      {checked && !resultReady ? (
        <p className="search-status" role="status">{loading ? 'Checking the name…' : 'Name data is unavailable right now. Try again in a moment.'}</p>
      ) : null}

      {checked && resultReady ? (
        <SearchResultPanel
          activityProps={activityProps}
          availabilityProps={availabilityProps}
          detailsProps={detailsProps}
          nodeHex={nodeHex}
          overviewProps={overviewProps}
          primaryProps={primaryProps}
          recordsProps={recordsProps}
          registrationProps={registrationProps}
          resultView={resultView}
          settingsProps={settingsProps}
          subdomainsProps={subdomainsProps}
        />
      ) : null}
    </>
  )
}

export type { SearchResultView }
