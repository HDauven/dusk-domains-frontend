import { useState } from 'react'
import { useScopedState } from '../utils/useScopedState'
import type { SearchResultView } from '../features/search/SearchWorkspace'
import { currentUnixSeconds, type NameResult } from '../names/internal'
import type { AppMainView } from './AppTypes'

export function useSearchAppState(accountScope: string) {
  const [query, setQuery] = useState('aurora.dusk')
  const [mainView, setMainView] = useState<AppMainView>('search')
  const [nowSeconds, setNowSeconds] = useState(() => currentUnixSeconds())
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [resultView, setResultView] = useState<SearchResultView>('overview')
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
      showResult: (result: NameResult | null) => setApiSearchResult(result),
      showView: (view: SearchResultView) => setResultView(view),
      startRead: () => { setIndexerError(''); setIndexerConfirmation('') },
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
