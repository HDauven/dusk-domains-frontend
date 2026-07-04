import { useState } from 'react'
import type { SearchResultView } from '../features/search/SearchWorkspace'
import { currentUnixSeconds, type NameResult } from '../names/internal'
import type { AppMainView } from './AppTypes'

export function useSearchAppState() {
  const [query, setQuery] = useState('aurora.dusk')
  const [mainView, setMainView] = useState<AppMainView>('search')
  const [nowSeconds, setNowSeconds] = useState(() => currentUnixSeconds())
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [resultView, setResultView] = useState<SearchResultView>('overview')
  const [apiSearchResult, setApiSearchResult] = useState<NameResult | null>(null)
  const [indexerError, setIndexerError] = useState('')
  const [indexerConfirmation, setIndexerConfirmation] = useState('')

  return {
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
