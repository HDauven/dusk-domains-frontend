import { useLiveQuotes } from './useLiveQuotes'
import { safeNumber } from '../../names/numbers'
import { useCallback, useMemo, useState } from 'react'
import {
  analyzeName,
  createRegistrationLifecycle,
  registrableQuote,
  registrationPrice,
  registrationPremiumSchedule,
  registrationQuoteBlockedReason,
  renewalFeeLux,
  renewRegistrationLifecycle,
  userFacingMessageFromText,
  type CoreFeeConfig,
  type NameResult,
} from '../../names/internal'
import {
  formatLifecycleDay,
  isSubname,
  safeNamehashHex,
} from '../domains/domainFormat'

export type UseNamePreviewArgs = {
  onChainClient?: import('../../names/internal').DuskDomainsOnChainClient | null
  selectedAuthority?: string
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
  onChainClient, selectedAuthority = '',
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
  // Quote again when the indexer reports another policy version, or when a claim finds the price changed.
  const [quoteRefreshes, setQuoteRefreshes] = useState(0)
  const refreshQuotes = useCallback(() => setQuoteRefreshes(count => count + 1), [])
  const quotes = useLiveQuotes(onChainClient, apiSearchResult, duration, renewalYears, selectedAuthority, currentBlockHeight,
    `${feeConfig.version}:${quoteRefreshes}`)
  const estimate = useMemo(() => {
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
  const result: NameResult = quotes?.registration ? {...estimate, policyQuote: quotes.registration, quotedYears: duration, totalFeeLux: safeNumber(quotes.registration.total_lux), premiumLux: safeNumber(quotes.registration.quote.premium_lux)} : estimate
  const canRegister = (!onChainClient || Boolean(quotes?.registration && registrableQuote(quotes.registration))) && !result.transactionBlocked && result.status === 'available' && !isSubname(result.canonical)
  // Why the live quote can't be registered: a replacement policy can close registration or reserve
  // a name, and this site can lag behind a replacement. Empty while it loads, or when it can be.
  const registrationBlockedReason = quotes?.registration ? registrationQuoteBlockedReason(quotes.registration)
    : quotes?.error && result.status === 'available' ? userFacingMessageFromText(quotes.error) : ''
  const displayName = result.canonical || 'name.dusk'
  const nodeHex = useMemo(() => safeNamehashHex(displayName), [displayName])
  const registrationFee = result.status === 'available' ? (result.totalFeeLux !== undefined ? result.totalFeeLux / 1e9 : registrationPrice(result.label, duration, feeConfig, result.premiumLux ?? 0)) : 0
  // Renewal is priced by the directory's renewal schedule, never by the registration policy.
  const scheduledRenewal = nodeHex ? renewalFeeLux(result.label, renewalYears, feeConfig) : 0
  const renewalFee = quotes?.renewal ? safeNumber(quotes.renewal.total_lux) / 1e9 : scheduledRenewal === null ? null : scheduledRenewal / 1e9
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
    renewalQuote: quotes?.renewal,
    /** The term the quote and renewal use, within the ten-year limit. */
    renewalYears,
    renewalNameRef: quotes?.ref,
    quoteError: quotes?.error ?? '',
    quoteLoading: Boolean(onChainClient && !quotes),
    registrationBlockedReason,
    refreshQuotes,
    renewalPreviewLifecycle,
    result,
  }
}
