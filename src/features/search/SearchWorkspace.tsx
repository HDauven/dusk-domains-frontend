import { SearchHero } from './SearchHero'
import { SearchResultPanel, type SearchResultPanelProps, type SearchResultView } from './SearchResultPanel'

type SearchWorkspaceProps = SearchResultPanelProps & {
  checked: boolean
  loading: boolean
  onCheckAvailability: () => void
  onQueryChange: (value: string) => void
  query: string
}

export function SearchWorkspace({
  activityProps,
  availabilityProps,
  checked,
  detailsProps,
  loading,
  nodeHex,
  onCheckAvailability,
  onQueryChange,
  overviewProps,
  primaryProps,
  query,
  recordsProps,
  registrationProps,
  resultView,
  settingsProps,
  subdomainsProps,
}: SearchWorkspaceProps) {
  return (
    <>
      <SearchHero
        checked={checked}
        loading={loading}
        onCheckAvailability={onCheckAvailability}
        onQueryChange={onQueryChange}
        query={query}
      />

      {checked ? (
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
