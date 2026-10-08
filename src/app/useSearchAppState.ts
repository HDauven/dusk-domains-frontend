import { useState } from 'react'
import { useScopedState } from '../utils/useScopedState'
import type { SearchResultView } from '../features/search/SearchWorkspace'
import { currentUnixSeconds, type NameResult } from '../names/internal'
import type { AppMainView } from './AppTypes'
import type { AppRoute } from './routes'

type Opening = { route: AppRoute, indexed: boolean }

// `opening` gives the route the app starts at. The first render starts in the state that
// opening the route leaves (the view, or openIndexedName for a name), so a shared link never
// shows the home page first; useUrlRoute still opens the route to load it. Without a name the
// search box starts empty, as the static home page shows it.
export function useSearchAppState(accountScope: string, opening?: () => Opening) {
  const [start] = useState<Opening>(() => opening?.() ?? { route: { view: 'search' }, indexed: false })
  const openingName = start.route.name ?? null
  const [query, setQuery] = useState(openingName ?? '')
  const [mainView, setMainView] = useState<AppMainView>(start.route.view)
  const [nowSeconds, setNowSeconds] = useState(() => currentUnixSeconds())
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null)
  const [checked, setChecked] = useState(openingName !== null)
  const [resultView, setResultView] = useState<SearchResultView>(openingName !== null && start.indexed ? 'details' : 'overview')
  const [apiSearchResult, setApiSearchResult] = useState<NameResult | null>(null)
  const feedbackScope = `${accountScope}:${mainView}:${resultView}:${query}`
  const [indexerError, setIndexerError] = useScopedState(feedbackScope, '')
  const [indexerConfirmation, setIndexerConfirmation] = useScopedState(feedbackScope, '')

  return {
    searchActions: {
      reset: (nextValue: string) => {
        setQuery(nextValue)
        setChecked(false)
        setResultView('overview')
        setApiSearchResult(null)
        setIndexerError('')
        setIndexerConfirmation('')
      },
      open: (view: SearchResultView) => { setChecked(true); setResultView(view) },
      showResult: (result: NameResult | null) => { setApiSearchResult(result); if (result) setIndexerError('') },
      showView: (view: SearchResultView) => setResultView(view),
      startRead: () => { setIndexerConfirmation('') },
      fail: (message: string) => setIndexerError(message),
      confirm: (message: string) => setIndexerConfirmation(message),
      updateClock: (height: number | null, seconds?: number) => {
        setCurrentBlockHeight(height)
        if (seconds !== undefined) setNowSeconds(seconds)
      },
    },
    apiSearchResult,
    checked,
    currentBlockHeight,
    indexerConfirmation,
    indexerError,
    mainView,
    nowSeconds,
    openingRoute: start.route,
    query,
    resultView,
    setApiSearchResult,
    setChecked,
    setCurrentBlockHeight,
    setIndexerConfirmation,
    setIndexerError,
    setMainView,
    setNowSeconds,
    setQuery,
    setResultView,
  }
}
