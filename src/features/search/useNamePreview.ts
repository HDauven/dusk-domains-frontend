import { useMemo } from 'react'
import {
  analyzeName,
  createRegistrationLifecycle,
  registrationPrice,
  renewRegistrationLifecycle,
  type CoreFeeConfig,
  type NameResult,
} from '../../names/internal'
import {
  formatLifecycleDay,
  safeNamehashHex,
} from '../domains/domainFormat'

export type UseNamePreviewArgs = {
  apiSearchResult: NameResult | null
  currentBlockHeight: number | null
  duration: number
  feeConfig: CoreFeeConfig
  managedNameExpiresAt: number
  nowSeconds: number
  query: string
  renewalYears: number
}

export function useNamePreview({
  apiSearchResult,
  currentBlockHeight,
  duration,
  feeConfig,
  managedNameExpiresAt,
  nowSeconds,
  query,
  renewalYears,
}: UseNamePreviewArgs) {
  const localSearchResult = useMemo(() => analyzeName(query, feeConfig), [feeConfig, query])
  const result = apiSearchResult ?? localSearchResult
  const canRegister = result.status === 'available'
  const displayName = result.canonical || 'name.dusk'
  const nodeHex = useMemo(() => safeNamehashHex(displayName), [displayName])
  const registrationFee = canRegister ? registrationPrice(result.label, duration, feeConfig) : 0
  const renewalFee = nodeHex ? registrationPrice(result.label, renewalYears, feeConfig) : 0
  const networkFee = canRegister ? 0.2 : 0
  const total = registrationFee + networkFee
  const lifecycleBaseBlockHeight = currentBlockHeight ?? 0
  const registrationLifecycle = useMemo(() => createRegistrationLifecycle({
    startsAt: lifecycleBaseBlockHeight,
    years: duration,
  }), [duration, lifecycleBaseBlockHeight])
  const renewalPreviewLifecycle = useMemo(() => renewRegistrationLifecycle({
    currentExpiresAt: managedNameExpiresAt,
    now: lifecycleBaseBlockHeight,
    years: renewalYears,
  }), [managedNameExpiresAt, lifecycleBaseBlockHeight, renewalYears])
  const expiryDate = formatLifecycleDay(registrationLifecycle.expiresAt, currentBlockHeight, nowSeconds)

  return {
    canRegister,
    displayName,
    expiryDate,
    lifecycleBaseBlockHeight,
    localSearchResult,
    networkFee,
    nodeHex,
    registrationFee,
    registrationLifecycle,
    renewalFee,
    renewalPreviewLifecycle,
    result,
    total,
  }
}
