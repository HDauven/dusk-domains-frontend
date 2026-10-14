import { useLiveQuotes } from './useLiveQuotes'
import { exactNumber } from '../../names/numbers'
import { useCallback, useMemo, useState } from 'react'
import {
  analyzeName,
  createRegistrationLifecycle,
  duskFromLux,
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
  /** Registrations are paused: no registration quote is read until they reopen. */
  registrationsPaused?: boolean
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
  onChainClient, selectedAuthority = '', registrationsPaused = false,
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
    `${feeConfig.version}:${quoteRefreshes}`, registrationsPaused)
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
  // A quote this site can show and sign exactly. Rendering never fails on a larger one.
  const quoted = quotes?.registration
  const quotedTotal = quoted ? exactNumber(quoted.total_lux) : null
  const quotedPremium = quoted ? exactNumber(quoted.quote.premium_lux) : null
  const inRange = quotedTotal !== null && quotedPremium !== null
  const result: NameResult = quoted && inRange ? {...estimate, policyQuote: quoted, quotedYears: duration, totalFeeLux: quotedTotal, premiumLux: quotedPremium} : estimate
  const canRegister = !registrationsPaused && (!onChainClient || Boolean(quoted && inRange && registrableQuote(quoted)))
    && !result.transactionBlocked && result.status === 'available' && !isSubname(result.canonical)
  // Why the live quote can't be registered: a replacement policy can close registration or reserve
  // a name, and this site can lag behind a replacement. Empty while it loads, or when it can be.
  const registrationBlockedReason = quoted ? registrationQuoteBlockedReason(quoted) || (inRange ? '' : 'This name’s price is higher than this site can handle.')
    : quotes?.error && result.status === 'available' ? userFacingMessageFromText(quotes.error) : ''
  const displayName = result.canonical || 'name.dusk'
  const nodeHex = useMemo(() => safeNamehashHex(displayName), [displayName])
  const registrationFee = result.status === 'available' ? (result.totalFeeLux !== undefined ? result.totalFeeLux / 1e9 : registrationPrice(result.label, duration, feeConfig, result.premiumLux ?? 0)) : 0
  // Renewal is priced by the directory's renewal schedule, never by the registration policy.
  const scheduledRenewal = nodeHex ? renewalFeeLux(result.label, renewalYears, feeConfig) : 0
  const renewalFee = quotes?.renewal ? duskFromLux(BigInt(quotes.renewal.total_lux)) : scheduledRenewal === null ? null : scheduledRenewal / 1e9
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
    // A pause is the answer for an available name, not a quote still on its way.
    quoteLoading: Boolean(onChainClient && !quotes && !(registrationsPaused && result.status === 'available')),
    registrationBlockedReason,
    refreshQuotes,
    renewalPreviewLifecycle,
    result,
  }
}
