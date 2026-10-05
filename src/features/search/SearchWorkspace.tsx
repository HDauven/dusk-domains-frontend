import type { ShowcaseName } from '../../app/useSkyNames'
import { SearchHero } from './SearchHero'
import { SearchResultPanel, type SearchResultPanelProps, type SearchResultView } from './SearchResultPanel'

type SearchWorkspaceProps = {
  onOpenName?: (name: string) => void
  result: SearchResultPanelProps
  search: {
    priceTiers?: { label: string; price: string }[]
    checked: boolean
    featuredNames?: ShowcaseName[] | null
    loading: boolean
    resultReady: boolean
    onCheckAvailability: () => void
    onQueryChange: (value: string) => void
    query: string
  }
}

export function SearchWorkspace({ onOpenName, search, result }: SearchWorkspaceProps) {
  const { checked, loading, resultReady } = search
  const { resultView } = result
  return (
    <>
      {(!checked || resultView === 'overview') ? <SearchHero {...search} onOpenName={onOpenName} /> : null}

      {checked && !resultReady ? (
        <p className="search-status" role="status">{loading ? 'Checking the name…' : 'Name data is unavailable right now. Try again in a moment.'}</p>
      ) : null}

      {checked && resultReady ? (
        <SearchResultPanel {...result} onOpenName={onOpenName} />
      ) : null}
    </>
  )
}

export type { SearchResultView }
