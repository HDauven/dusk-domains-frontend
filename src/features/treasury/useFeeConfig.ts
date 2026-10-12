import { useAutoRefresh } from '../../app/useAutoRefresh'
import { useSingleFlight } from '../../app/useSingleFlight'
import { createNameReadGuard } from '../search/nameReadGuard'
import { feeConfigValuesMatch } from './feeConfig'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_FEE_CONFIG,
  RegistrationPricesUnavailableError,
  type CoreFeeConfig,
  type DuskDomainsIndexerClient,
} from '../../names/internal'

export function useFeeConfig(indexerClient: DuskDomainsIndexerClient | null) {
  const [feeConfig, setFeeConfig] = useState<CoreFeeConfig>(DEFAULT_FEE_CONFIG)
  const [feeConfigLoaded, setFeeConfigLoaded] = useState(!indexerClient)
  const [feeConfigLoading, setFeeConfigLoading] = useState(false)
  const [feeConfigError, setFeeConfigError] = useState('')
  // The indexer withholds registration prices; renewals, which follow their own schedule, are unaffected.
  const [registrationPricesUnavailable, setRegistrationPricesUnavailable] = useState(false)

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

    // Only a first read shows as loading; background refreshes keep the prices and any error shown.
    if (!loaded.current) setFeeConfigLoading(true)

    try {
      const nextFeeConfig = await indexerClient.getFeeConfig()
      if (!isCurrent()) return false
      loaded.current = true
      setFeeConfigLoaded(true)
      setFeeConfigError('')
      setRegistrationPricesUnavailable(false)
      setFeeConfig(current => current.version === nextFeeConfig.version && feeConfigValuesMatch(current, nextFeeConfig) ? current : nextFeeConfig)
      return true
    } catch (error) {
      if (!isCurrent()) return false
      // After a policy replacement the indexer withholds prices it has not verified. The previous
      // policy's prices are no longer the prices, so stop showing them until the new ones load.
      if (error instanceof RegistrationPricesUnavailableError) {
        loaded.current = false
        setFeeConfigLoaded(false)
        setRegistrationPricesUnavailable(true)
        setFeeConfigError(error.message)
        return false
      }
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

  // Keep reading at the normal cadence: a governance SetPolicy can change the prices at any time.
  useAutoRefresh(loadFeeConfig, Boolean(indexerClient))

  return {
    feeConfigLoaded,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    loadFeeConfig,
    registrationPricesUnavailable,
  }
}
