import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_FEE_CONFIG,
  type CoreFeeConfig,
  type DuskNamesIndexerClient,
} from '../../names/internal'

export function useFeeConfig(indexerClient: DuskNamesIndexerClient | null) {
  const [feeConfig, setFeeConfig] = useState<CoreFeeConfig>(DEFAULT_FEE_CONFIG)
  const [feeConfigLoading, setFeeConfigLoading] = useState(false)
  const [feeConfigError, setFeeConfigError] = useState('')

  const loadFeeConfig = useCallback(async () => {
    if (!indexerClient) {
      setFeeConfig(DEFAULT_FEE_CONFIG)
      setFeeConfigError('')
      return false
    }

    setFeeConfigLoading(true)
    setFeeConfigError('')

    try {
      const nextFeeConfig = await indexerClient.getFeeConfig()
      setFeeConfig(nextFeeConfig)
      return true
    } catch (error) {
      void error
      setFeeConfig(DEFAULT_FEE_CONFIG)
      setFeeConfigError('Live pricing is unavailable. Showing default pricing.')
      return false
    } finally {
      setFeeConfigLoading(false)
    }
  }, [indexerClient])

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
