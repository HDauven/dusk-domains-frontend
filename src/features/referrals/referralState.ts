import {
  isClaimableReferrer,
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

export async function referralStateFromInput(input: string): Promise<ReferralState> {
  const trimmed = input.trim()
  if (!trimmed) return { input: '', principal: null, valid: false, reason: '' }
  const result = typedPrincipalFromWalletAccount(trimmed)
  if (!result.ok) return { input: trimmed, principal: null, valid: false, reason: result.reason }
  if (!await isClaimableReferrer(result.principal)) {
    return { input: trimmed, principal: null, valid: false, reason: 'Referral ignored: this address cannot claim rewards.' }
  }
  return { input: trimmed, principal: result.principal, valid: true, reason: '' }
}

// Validates one input and, unless a newer input replaced it, stores the outcome.
// Any failure clears the stored attribution, so a link that wasn't confirmed never comes back.
export async function settleReferralInput(input: string, isCurrent: () => boolean): Promise<ReferralState | null> {
  let state: ReferralState
  try {
    state = await referralStateFromInput(input)
  } catch {
    state = { input, principal: null, valid: false, reason: 'Referral could not be checked. Try again.' }
  }
  if (!isCurrent()) return null
  writeStoredReferralInput(state.valid ? state.input : '')
  return state
}

export function initialReferralInput(): string {
  const urlRef = typeof globalThis.location === 'undefined'
    ? null
    : new URLSearchParams(globalThis.location.search).get('ref')
  const storedRef = readStoredReferralInput()
  return (urlRef ?? storedRef).trim()
}

export function readStoredReferralInput() {
  try {
    return readReferralAttribution(globalThis.sessionStorage, referralStorageKey)
  } catch {
    return ''
  }
}

export function writeStoredReferralInput(value: string) {
  try {
    writeReferralAttribution(globalThis.sessionStorage, referralStorageKey, value)
  } catch {
    // Browser storage can be unavailable in hardened browser modes.
  }
}
