import { useAutoRefresh } from '../../app/useAutoRefresh'
import { useSingleFlight } from '../../app/useSingleFlight'
import { createNameReadGuard } from '../search/nameReadGuard'
import { feeConfigValuesMatch } from './feeConfig'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_FEE_CONFIG,
  type CoreFeeConfig,
  type DuskDomainsIndexerClient,
} from '../../names/internal'

export function useFeeConfig(indexerClient: DuskDomainsIndexerClient | null) {
  const [feeConfig, setFeeConfig] = useState<CoreFeeConfig>(DEFAULT_FEE_CONFIG)
  const [feeConfigLoaded, setFeeConfigLoaded] = useState(!indexerClient)
  const [feeConfigLoading, setFeeConfigLoading] = useState(false)
  const [feeConfigError, setFeeConfigError] = useState('')

  const loaded = useRef(feeConfigLoaded)
  const beginRead = useMemo(() => createNameReadGuard(), [])
  useEffect(() => () => { beginRead() }, [beginRead, indexerClient])

  const readData = useCallback(async () => {
    const isCurrent = beginRead()
    setFeeConfigLoading(false)
    if (!indexerClient) {
      setFeeConfigError('')
      return false
    }

    setFeeConfigLoading(true)
    setFeeConfigError('')

    try {
      const nextFeeConfig = await indexerClient.getFeeConfig()
      if (!isCurrent()) return false
      loaded.current = true
      setFeeConfigLoaded(true)
      setFeeConfig(current => current.version === nextFeeConfig.version && feeConfigValuesMatch(current, nextFeeConfig) ? current : nextFeeConfig)
      return true
    } catch (error) {
      if (!isCurrent()) return false
      void error
      setFeeConfigError(loaded.current ? "Couldn't refresh. Retrying…" : 'Live pricing is unavailable right now.')
      return false
    } finally {
      if (isCurrent()) setFeeConfigLoading(false)
    }
  }, [beginRead, indexerClient])

  const loadFeeConfig = useSingleFlight(readData, readData)

  useEffect(() => {
    globalThis.queueMicrotask(() => {
      void loadFeeConfig()
    })
  }, [loadFeeConfig])

  useAutoRefresh(loadFeeConfig, Boolean(indexerClient) && !feeConfigLoaded)

  return {
    feeConfigLoaded,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    loadFeeConfig,
  }
}
