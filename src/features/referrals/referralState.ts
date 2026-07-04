import {
  readReferralAttribution,
  typedPrincipalFromWalletAccount,
  writeReferralAttribution,
  type DuskPrincipal,
  type IndexedReferralState,
} from '../../names/internal'

const referralStorageKey = 'dusk-domains.active-referral'

export type ReferralState = {
  input: string
  principal: DuskPrincipal | null
  valid: boolean
  reason: string
}

export function emptyReferralUiState(referrer: string | null = null): IndexedReferralState {
  return {
    supported: false,
    referrer,
    claimableLux: 0,
    claimedLux: 0,
    referralCount: 0,
    recentActivity: [],
  }
}

export function referralStateFromInput(input: string): ReferralState {
  const trimmed = input.trim()
  if (!trimmed) return { input: '', principal: null, valid: false, reason: '' }
  const result = typedPrincipalFromWalletAccount(trimmed)
  if (!result.ok) return { input: trimmed, principal: null, valid: false, reason: result.reason }
  return { input: trimmed, principal: result.principal, valid: true, reason: '' }
}

export function initialReferralState(): ReferralState {
  const urlRef = typeof globalThis.location === 'undefined'
    ? ''
    : new URLSearchParams(globalThis.location.search).get('ref') ?? ''
  const storedRef = readStoredReferralInput()
  const ref = urlRef || storedRef
  return referralStateFromInput(ref)
}

export function readStoredReferralInput() {
  try {
    return readReferralAttribution(globalThis.localStorage, referralStorageKey)
  } catch {
    return ''
  }
}

export function writeStoredReferralInput(value: string) {
  try {
    writeReferralAttribution(globalThis.localStorage, referralStorageKey, value)
  } catch {
    // Browser storage can be unavailable in hardened browser modes.
  }
}
