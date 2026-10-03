import { useMemo } from 'react'
import {
  analyzeName,
  createRegistrationLifecycle,
  registrationPrice,
  registrationPremiumSchedule,
  renewRegistrationLifecycle,
  type CoreFeeConfig,
  type NameResult,
} from '../../names/internal'
import {
  formatLifecycleDay,
  isSubname,
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
  const searchResult = apiSearchResult ?? localSearchResult
  const result = useMemo(() => {
    if (searchResult.status !== 'available' || isSubname(searchResult.canonical)
      || searchResult.graceEndsAtBlockHeight == null || currentBlockHeight == null) return searchResult
    const premium = registrationPremiumSchedule({
      premiumStartLux: feeConfig.premiumStartLux,
      graceEndsAtBlockHeight: searchResult.graceEndsAtBlockHeight,
      currentBlockHeight,
      nowSeconds,
    })
    return { ...searchResult, premiumLux: premium.premiumLux, premiumEndsAt: premium.premiumEndsAt,
      premiumEndsAtBlockHeight: premium.premiumEndsAtBlockHeight,
      premiumNextStepAt: premium.nextStepAt, premiumNextStepBlockHeight: premium.nextStepBlockHeight }
  }, [searchResult, feeConfig.premiumStartLux, currentBlockHeight, nowSeconds])
  const canRegister = result.status === 'available' && !isSubname(result.canonical)
  const displayName = result.canonical || 'name.dusk'
  const nodeHex = useMemo(() => safeNamehashHex(displayName), [displayName])
  const registrationFee = canRegister ? registrationPrice(result.label, duration, feeConfig, result.premiumLux ?? 0) : 0
  const renewalFee = nodeHex ? registrationPrice(result.label, renewalYears, feeConfig) : 0
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
    nodeHex,
    registrationFee,
    registrationLifecycle,
    renewalFee,
    renewalPreviewLifecycle,
    result,
  }
}
