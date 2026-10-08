import { useContext } from 'react'
import { NetworkFreshnessContext } from '../../app/networkFreshness'
import { ReadNotice } from '../../components/status/ReadNotice'
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
    readError?: string
    onRetry?: () => void
    resultReady: boolean
    onCheckAvailability: () => void
    onQueryChange: (value: string) => void
    query: string
  }
}

export function SearchWorkspace({ onOpenName, search, result }: SearchWorkspaceProps) {
  const { checked, loading, resultReady } = search
  const networkNotice = useContext(NetworkFreshnessContext)
  const readError = search.readError || networkNotice
  const { resultView } = result
  return (
    <>
      {(!checked || resultView === 'overview') ? <SearchHero {...search} onOpenName={onOpenName} /> : null}

      {checked && readError ? <ReadNotice error={resultReady ? "Couldn't refresh. Retrying…" : 'Name data is unavailable right now.'} hasData={resultReady} onRetry={search.onRetry ?? search.onCheckAvailability} /> : null}

      {checked && !resultReady && !readError ? (
        <p className="search-status" role="status">{loading ? 'Checking the name…' : 'Loading owner, expiry and records…'}</p>
      ) : null}

      {checked && resultReady ? (
        <SearchResultPanel {...result} onOpenName={onOpenName} />
      ) : null}
    </>
  )
}

export type { SearchResultView }
