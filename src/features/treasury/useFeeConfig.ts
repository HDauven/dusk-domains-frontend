import { useSingleFlight } from '../../app/useSingleFlight'
import { createNameReadGuard } from '../search/nameReadGuard'
import { feeConfigValuesMatch } from './feeConfig'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_FEE_CONFIG,
  type CoreFeeConfig,
  type DuskDomainsIndexerClient,
} from '../../names/internal'

export function useFeeConfig(indexerClient: DuskDomainsIndexerClient | null) {
  const [feeConfig, setFeeConfig] = useState<CoreFeeConfig>(DEFAULT_FEE_CONFIG)
  const [feeConfigLoading, setFeeConfigLoading] = useState(false)
  const [feeConfigError, setFeeConfigError] = useState('')

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
      setFeeConfig(current => current.version === nextFeeConfig.version && feeConfigValuesMatch(current, nextFeeConfig) ? current : nextFeeConfig)
      return true
    } catch (error) {
      if (!isCurrent()) return false
      void error
      setFeeConfigError('Live pricing is unavailable. Trying again automatically.')
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

  return {
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    loadFeeConfig,
  }
}
